/* Muscat Bay Operations — service worker
 *
 * The app is READ-ONLY: it renders live plant data and never writes from the
 * client. There is therefore deliberately NO background-sync / offline write
 * queue here — an operator must never believe a change was saved offline.
 *
 * Strategy
 * ────────
 *   navigations       network-first → cached page → /offline.html
 *   /_next/static/*    cache-first (immutable, content-hashed URLs)
 *   other same-origin  stale-while-revalidate (icons, images, manifest)
 *   /api/*, /auth/*    network-only, never cached (auth + live data)
 *   cross-origin       passthrough (Supabase, fonts — never cached here)
 *
 * Versioning
 * ──────────
 * Bump CACHE_VERSION to invalidate every cache; `activate` deletes any cache
 * whose name is not in the current set, then claims open clients (register-sw
 * reloads them on controllerchange), so stale sessions self-heal on next visit.
 *
 * History:
 *   v9 (2026-09-08) flushes clients holding the pre-Hand-Readings bundle. The
 *                   hand-readings tables were renamed `reading` → `consumption`
 *                   in the same deploy; an open tab kept its cached
 *                   `_next/static` chunks (this file was unchanged, so no new
 *                   SW installed and no controllerchange reload fired) and
 *                   asked PostgREST for a column that no longer exists —
 *                   "column irrigation_daily_readings.reading does not exist".
 *                   A SHIPPED SCHEMA CHANGE THEREFORE NEEDS A VERSION BUMP
 *                   HERE: content-hashed chunks are only picked up once a new
 *                   SW claims the client.
 *   v8 (2026-08-30) re-precaches the brand mark. /logo.png was missing from the
 *                   build for a period; `install` runs once per SW version and
 *                   tolerates a per-asset failure, so every client that
 *                   installed v7 in that window holds a shell cache with no
 *                   mark and would never retry. Restoring the file alone does
 *                   not repair them — only a version bump re-runs `install`.
 *   v7 (2026-07-25) split shell/static/pages caches, added the offline shell,
 *                   stale-while-revalidate, and an explicit no-cache list for
 *                   authenticated endpoints.
 *   v6 flushed clients showing pre-auto-sync water data.
 *   v5 unstuck clients stranded on an app shell referencing deleted chunks.
 */

const CACHE_VERSION = "v9";
const SHELL_CACHE = `muscatbay-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `muscatbay-static-${CACHE_VERSION}`;
const PAGES_CACHE = `muscatbay-pages-${CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE, PAGES_CACHE];

const OFFLINE_URL = "/offline.html";

/** Precached offline shell — must stay small and must always resolve. */
const SHELL_ASSETS = [
  OFFLINE_URL,
  "/manifest.json",
  "/logo.png",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

/** Never cached: authenticated or inherently live endpoints. */
const NO_STORE_PREFIXES = ["/api/", "/auth/"];

/** Cap the page cache so a long session can't grow it without bound. */
const MAX_PAGES = 40;

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll() rejects the whole install if any single asset 404s, which
      // would leave clients on the previous SW. Add them individually instead.
      Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((err) => {
            // Deliberately non-fatal: a single missing asset must not strand
            // clients on the previous SW. Log the reason so a 404 here is
            // diagnosable rather than silent.
            console.warn("[sw] could not precache", url, err);
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))
      );
      // Serve navigations from the HTTP cache preload where supported.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })()
  );
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isNoStore(url) {
  return NO_STORE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isImmutableAsset(url) {
  // Next.js content-hashes everything under /_next/static — the URL changes
  // whenever the bytes do, so it is safe to serve from cache forever.
  return url.pathname.startsWith("/_next/static/");
}

/** Trim a cache to `max` entries, oldest-first. */
async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= max) return;
  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)));
}

/** Cache-first: cached hit wins; otherwise fetch and store. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

/**
 * Stale-while-revalidate: answer instantly from cache while refreshing in the
 * background, so a returning operator sees the app paint immediately and still
 * picks up new assets on the following load.
 */
async function staleWhileRevalidate(event, cacheName) {
  const { request } = event;
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok && response.type === "basic") {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    // Keep the worker alive until the background refresh settles, otherwise
    // the revalidation is killed the moment we return the cached response.
    event.waitUntil(network);
    return cached;
  }

  const response = await network;
  if (response) return response;
  throw new Error("offline and not cached");
}

/** Network-first for navigations, falling back to the cached page, then the shell. */
async function handleNavigation(event) {
  const { request } = event;
  try {
    const preload = event.preloadResponse ? await event.preloadResponse : null;
    const response = preload || (await fetch(request));
    if (response && response.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(request, response.clone());
      void trimCache(PAGES_CACHE, MAX_PAGES);
    }
    return response;
  } catch {
    const cachedPage = await caches.match(request, { ignoreSearch: true });
    if (cachedPage) return cachedPage;

    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;

    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only GET is cacheable; everything else goes straight to the network.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // chrome-extension:, blob:, etc.
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Supabase, Google Fonts and any other origin: let the browser handle it.
  // Caching authenticated cross-origin responses here would be a data leak.
  if (!isSameOrigin(url)) return;

  // Auth + API traffic must always hit the network.
  if (isNoStore(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(
        () => new Response("", { status: 503, statusText: "Offline" })
      )
    );
    return;
  }

  event.respondWith(
    staleWhileRevalidate(event, STATIC_CACHE).catch(
      () => new Response("", { status: 503, statusText: "Offline" })
    )
  );
});

// ─── Messages ───────────────────────────────────────────────────────────────
// Lets the app force an update without a hard reload (register-sw.tsx).

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING" || event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ─── Push Notifications ─────────────────────────────────────────────────────
// Handles push events from the server (future: web-push integration).
// Currently used for showNotification() calls from the main thread via
// ServiceWorkerRegistration.showNotification(), which works on both
// desktop and mobile (including iOS 16.4+ PWA).

self.addEventListener("push", (event) => {
  // Default notification if push payload is missing
  let title = "Muscat Bay Alert";
  let options = {
    body: "You have a new notification",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    tag: "muscatbay-push",
    data: { url: "/" },
  };

  // Try to parse push data if available
  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      options = {
        body: payload.message || payload.body || options.body,
        icon: payload.icon || options.icon,
        badge: options.badge,
        tag: payload.tag || options.tag,
        data: { url: payload.url || "/" },
      };
    } catch {
      // If JSON parsing fails, use the text directly
      options.body = event.data.text() || options.body;
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ─────────────────────────────────────────────────────
// When the user clicks a browser notification, focus the app or open it.

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    // Check if the app is already open in a tab
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // If there's already an open tab, focus it and navigate
        for (const client of clientList) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Otherwise open a new tab/window
        return self.clients.openWindow(targetUrl);
      })
  );
});

// ─── Notification Close ─────────────────────────────────────────────────────
// Optional: track when notifications are dismissed (useful for analytics later)

self.addEventListener("notificationclose", () => {
  // No-op — placeholder for future analytics
});
