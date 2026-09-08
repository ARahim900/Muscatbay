# Muscat Bay Utility Management App

## Living Project Status — read this first

- **[`PROJECT_STATUS.md`](./PROJECT_STATUS.md) (repo root) is the single source of
  truth for the app's current state**: module status, data pipelines, in-flight
  work, known gaps and a full development log. Read it BEFORE exploring the
  codebase to understand what exists and where things stand.
- **After completing any task** that changes features, schema, data pipelines,
  module status or known gaps, **update the relevant curated section of
  `PROJECT_STATUS.md` in the same commit/PR** as the change.
- The "Development log" section of that file is appended automatically on every
  push to `main` (`.github/workflows/project-status-log.yml`) — never hand-edit
  log entries; curate meaning in the sections above it.

## Quick Reference

| Item | Value |
|------|-------|
| **Stack** | Next.js 16 + React 19 + TypeScript 5 + Tailwind 4 + Supabase |
| **App root** | `muscatbay/app/` |
| **Dev server** | `cd muscatbay/app && npm run dev` (port 3000) |
| **Build** | `cd muscatbay/app && npm run build` |
| **Lint** | `cd muscatbay/app && npm run lint` |
| **Test** | `cd muscatbay/app && npm run test` |
| **Load test** | `cd load-testing && npm install && npm run k6:smoke` — k6 (primary) + Artillery harness, see `load-testing/README.md`. Mirrors `functions/api/*` queries: update `load-testing/` when a reader changes |
| **Deploy** | Vercel (auto-deploy from main) |
| **Mobile app** | `mobile/` — Expo SDK 57 + Expo Router + NativeWind |
| **Mobile run** | `cd mobile && npm install && npx expo start` (scan QR with Expo Go) |
| **Mobile check** | `cd mobile && npx tsc --noEmit` |

> The web app is a PWA. **A PWA cannot be listed on the App Store** — that is
> what `mobile/` exists for. Store distribution needs a native binary via EAS.

## Project Structure

Two rules govern the layout, and they are not negotiable:

1. **`app/` holds routes only.** Only Next.js file conventions live there —
   `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `global-error.tsx`,
   `not-found.tsx`, `route.ts`, `globals.css`, icons. A component, helper or
   type file must never sit next to a `page.tsx`.
2. **Every module has exactly one home** under `components/<module>/`, named
   after the module as the UI names it (so HVAC is `components/hvac/`, not
   `gulf-expert`).

```
muscatbay/app/
├── app/                    # ROUTES ONLY — Next.js App Router file conventions
│   ├── page.tsx            #   / (dashboard command deck)
│   ├── layout.tsx  loading.tsx  error.tsx  global-error.tsx  not-found.tsx
│   ├── globals.css         #   Tailwind 4 + all design tokens
│   ├── assets/  contractors/  electricity/  firefighting/  hvac/
│   ├── pest-control/  settings/  stp/  water/
│   ├── auth/callback/  auth/reset-password/
│   ├── login/  signup/  signup/professional/  forgot-password/
│   └── privacy/  terms/
│
├── components/
│   │                       # ── Feature folders: one per module ──
│   ├── assets/             #   asset-charts, truncated-text, sort
│   ├── contractors/        #   renewals, terms, pricing, yearly-chart, contract-dates
│   ├── dashboard/          #   command-deck, module-coverage, ytd-panel
│   ├── electricity/        #   analysis-view, load-watch, analytics, reading-cell
│   ├── firefighting/       #   equipment-register, issues-register, firefighting-ui,
│   │                       #   ppm-programme, contract-reference
│   ├── hvac/               #   overview/findings/recurring tabs + types (was gulf-expert)
│   ├── stp/                #   plant-watch, stp-analytics, stp-trend-charts
│   ├── water/              #   daily-water-report, date-range-picker,
│   │                       #   daily-report/*, monthly/*, satellite/*,
│   │                       #   manual-readings/* (Kalhat hand readings + Irrigation mode)
│   │                       # ── Cross-cutting ──
│   ├── shared/             #   stats-grid, data-table/, page-header, breadcrumbs,
│   │                       #   tab-navigation, inspection, findings-register, skeleton…
│   ├── ui/                 #   shadcn/ui primitives (base-vega)
│   ├── charts/             #   Recharts wrappers (liquid-*, chart-container)
│   ├── layout/             #   sidebar, topbar, bottom-nav, client-layout
│   ├── providers/          #   app-providers (theme), notification-provider
│   ├── auth/  alerts/  brand/  motion/  pwa/  three/
│
│   # ── Data layer (three strictly ordered tiers, one barrel each) ──
├── entities/               # 1. TYPES. Row shapes only, zero runtime. `@/entities`
├── functions/              # 2. READERS. Isomorphic Supabase queries. `@/functions`
│   ├── api/                #    per-module readers + `@/functions/api` barrel
│   └── supabase-client.ts  #    browser client (Metro swaps this one for mobile)
├── actions/                # 3. WRITERS. `'use server'` only. `@/actions`
│
├── hooks/                  # useDashboardData, useSupabaseRealtime, useUserRole…
├── lib/                    # auth, supabase, utils (cn), validation, config,
│                           # water-data, export-utils, tokens, thresholds…
├── proxy.ts                # Supabase session refresh (Next 16 renamed middleware→proxy)
├── __tests__/              # Vitest suites, mirroring the source tree
├── scripts/  sql/  public/
```

> `entities/`, `lib/` and `functions/api/` are **also consumed by the Expo app
> in `mobile/`** through Metro `watchFolders` + a `@/*` alias. Moving or
> renaming a file in those three folders silently breaks the mobile app —
> update `mobile/` in the same change, or don't move it.

## Key Conventions

### Imports & Aliases
- `@/` maps to `muscatbay/app/` root (configured in tsconfig.json)
- Example: `import { cn } from "@/lib/utils"`

### Styling
- **Tailwind 4** with CSS variables in `app/globals.css`
- `cn()` utility for conditional class merging (clsx + tailwind-merge)
- Dark theme by default
- Brand colors: primary `#4E4456` (purple), accent `#A1D1D5` (soft teal)
- **The only design reference is [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (repo root, v2.0, 2026-09-02).** `BRAND_DESIGN.md` and `muscatbay/app/DESIGN_SYSTEM.md` are superseded and carry a banner saying so — do not design from them.
- Tokens live in `app/design-tokens.css` (imported once from `app/globals.css`); primitives live in `components/ui/` (`PageHeader`, `StatusChip`, `SegmentedControl`, `Tabs`, `KpiCard`, `SectionCard`, `Badge`, `Button`, `ChartFrame`, `DateRangePicker`, `EmbedFrame`, `Breadcrumb`, barrel `@/components/ui`).
- **Migration state:** pages move to the primitives one per session, in this order — **Water (done 2026-09-02)** → Dashboard → STP → Electricity → Contractors → Fire Safety → HVAC → Assets → Pest Control → Settings. The design lint in `eslint.config.mjs` is scoped to the migrated route + component folders; add each page's folders when you migrate it. The legacy `:root`/`.dark` tokens and `@theme` entries in `globals.css` (and the `bg-muted-bg` surface alias) exist only for the unmigrated pages and go when the last one lands.
- Fonts: **DM Sans** (UI/body/headings, `--font-dm-sans` → `--font-sans`, weights 400/500/600/700 — weight 800 does not exist) + **Geist Mono** (meter IDs/account numbers via the `.meter` rule, `--font-mono`) — both from Google Fonts, single source of truth in `app/layout.tsx`. Never re-declare `font-family` elsewhere. Type is the seven steps in `DESIGN_SYSTEM.md` §3 (`text-display/title/body/label/caption/eyebrow/kpi`), never raw sizes.

> ⚠️ **`muscatbay/app/tailwind.config.ts` is DEAD CONFIGURATION.** Tailwind 4
> only loads a JS config via an explicit `@config` directive, and `globals.css`
> has none — so that file's `fontSize`, `borderRadius`, `boxShadow` and `colors`
> blocks have **zero effect**. Everything real lives in the `@theme inline`
> block in `app/globals.css`. Edit tokens there. (Consequence: `text-*` utilities
> are Tailwind's stock sizes — `text-sm` 14px, `text-lg` 18px, `text-xl` 20px. The
> legacy `--font-size-*` tokens were removed from `globals.css` on 2026-08-31.)

> ⚠️ **One known doc-vs-code conflict where the CODE is correct.**
> `BRAND_DESIGN.md` §2.3/§8 give text-on-teal as `#FFFFFF` (~1.5:1), which
> contradicts that same doc's own §10 accessibility table; `globals.css` uses
> `--secondary-foreground: #1F2937` (~10:1) and that is what to follow.
> (The former Geist-vs-Inter font conflict was resolved 2026-08-31 in favour of
> Inter; Design System v2.0 then replaced Inter with **DM Sans** app-wide on
> 2026-09-02 — the Fonts line above and `DESIGN_SYSTEM.md` §3 are authoritative.)

### Components
- **UI primitives**: shadcn/ui (base-vega style) in `components/ui/`
- **Icons**: lucide-react v1 — import named icons from `"lucide-react"`
- **Charts**: Recharts v3 — chart components in `components/charts/`
- **Animations**: GSAP for scroll animations

### Data Layer
Three tiers, strictly ordered, **one barrel per concern**. Each barrel carries a
comment documenting the layering — read it before adding to it.

| Tier | Folder | Barrel | Contains | Importable from |
|---|---|---|---|---|
| 1. Types | `entities/` | `@/entities` | Row shapes. Zero runtime. | anywhere |
| 2. Readers | `functions/` | `@/functions`, `@/functions/api` | Isomorphic Supabase queries returning tier-1 types | anywhere (incl. `mobile/`) |
| 3. Writers | `actions/` | `@/actions` | `'use server'` Server Actions built on tier 2 | client or server components |

- **Never merge tiers 2 and 3 into one barrel.** `actions/*` pulls
  `lib/supabase-server` → `next/headers`; re-exporting it alongside the
  isomorphic readers would drag server-only code into the client graph and
  break the build. `actions/index.ts` re-exports `'use server'` modules and
  nothing else.
- Tier 2 must stay isomorphic — no `next/*`, no `window`/`document` — because
  `mobile/` bundles those exact files.
- **Supabase** for database, auth, and realtime; `@supabase/ssr` v0.9 for
  server-side auth (getAll/setAll cookie API)
- `createBrowserClient` in `functions/supabase-client.ts` (client-side)
- `createServerClient` in `proxy.ts` (server-side session refresh; Next.js 16 renamed `middleware` → `proxy`)

### Auth Flow
- Supabase Auth with email/password
- Middleware refreshes session on every request
- Protected routes redirect to `/login`
- Auth context in `components/auth/auth-provider.tsx`

### Testing
- Vitest + React Testing Library + jsdom
- Tests in `__tests__/` directory
- Run: `npm run test` or `npm run test:coverage`

## Common Patterns

### Data fetching in pages
Module pages are client components that fetch on mount through `functions/api/`,
seeded from `lib/page-cache.ts` (session-scoped stale-while-revalidate) so a
revisit paints instantly and refreshes in place. Live updates come from
`hooks/useSupabaseRealtime.ts`. Read failures must surface an explicit error
state — see the non-negotiables below.

### Shared components
- `StatsGrid` — KPI cards with trend indicators
- `DataTable` — Sortable/filterable tables with pagination
- `TabNavigation` — Tab switching with icons
- `Breadcrumbs` — Route-aware breadcrumbs
- `PageHeader` — Consistent page headers
- `components/shared/inspection.tsx` — the shared **inspection toolkit** (one severity model, `HealthCard`, `MetricHeatmap`, `SeverityChip`, `Sparkline`). This is how the Water "watch" pattern is ported to other modules — STP `Plant Watch` and Electricity `Load Watch` both render from it. Reuse it instead of rebuilding severity cards per module.
- `components/shared/findings-register.tsx` — the **identification-only** register (severity / item / value / remarks / suggested action). It deliberately has **no Owner and no Status column**; see the O&M scope boundary below. The old `ExceptionsRegister`, which hardcoded those two columns, was deleted 2026-07-25 — do not resurrect that shape.
- `components/shared/section-boundary.tsx` — `<SectionBoundary title="…">` wraps every major page section so one render fault can't blank a whole route.
- `lib/thresholds.ts` — the **single source of truth for severity thresholds** across Electricity and STP. Four divergent copies once meant the same meter read "Critical" on one tab and "High" on the tab below it. Add gates here, never inline.

### Severity colour model (one model, app-wide)
- **Saturated indicators** (dots, stripes, icons) → `--status-*`
- **Tinted surfaces** (callout backgrounds) → `--mb-*-light`
- **Text on a tint** → `--mb-*-text` (never `--mb-*`, which are background tints and fail contrast as text)

### Adding a new page
1. Create the route in `app/<route>/page.tsx` — **nothing else goes in that folder**
2. Add entity types in `entities/` (+ `entities/index.ts`)
3. Add API readers in `functions/api/` (+ `functions/api/index.ts`)
4. Add server actions in `actions/` if the page needs the server session (+ `actions/index.ts`)
5. Put every component, helper and constant the page needs in `components/<module>/`
6. Add the sidebar nav item in `components/layout/sidebar.tsx`

### File naming
- **kebab-case** for all component/helper files: `daily-water-report.tsx`,
  `equipment-register.tsx`. No `PascalCase.tsx`.
- Exception: `hooks/` uses `useThing.ts` — the React convention, applied
  consistently across all 8 hooks.
- A feature's non-JSX helpers live beside its components as plain `.ts`
  (`components/stp/stp-analytics.ts`, `components/assets/sort.ts`). Only
  genuinely cross-module logic goes in `lib/`.

## Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- See `.env.example` for template

## Non-negotiables

Two rules override convenience, "helpfulness", and any instinct to fill a gap.
Both were established on 2026-07-25 after a full front-end and O&M review.

### 1. Never fabricate data. Ever.

An operations dashboard that shows a plausible wrong number is worse than one
that shows nothing. If data is missing or a fetch fails, say so — never
substitute, estimate, default to zero, or hardcode a figure that looks real.

Three live instances were found and removed; do not reintroduce this pattern:
- the **login screen** rendered a "Live System Status" panel with invented
  figures (2,847 m³ water, 148 kWh, 892 m³ TSE) on a page that cannot read data;
- **`/water`** silently swapped in `MOCK_WATER_METERS` on a failed *or empty*
  fetch and rendered it as an ordinary dashboard;
- **`lib/water-data.ts`** held a 366-entry demo array behind `getWaterMeters()`
  that would have returned fake readings to any future caller.

Concretely: missing ≠ zero (keep `number | null` through the pipeline); never
clamp a negative reading to 0 to make a chart look tidy; surface data-integrity
anomalies rather than hiding them; if a value can't be computed, render an
honest "—"/"no reading" with an explanation. Mock data may only appear when
Supabase is *not configured at all*, and must be labelled as such.

### 2. This app identifies issues. It does not track their resolution.

Management confirmed on 2026-07-25 that findings are actioned on the floor and
the app's job is to surface them. **Do not add** work orders, job cards, task
assignment, owners, due dates, SLA timers, status transitions, close-out
evidence, or any audit trail of resolution — and do not add fake affordances
that imply them (hardcoded `Owner` strings, a literal `Status: "Open"` chip).
Those were deliberately removed. Reporting a fact that already exists in the
database (e.g. a contract's expiry date) is *reporting*, not task management,
and is wanted.

Add these only on an explicit, current instruction from the owner.

## Code Quality Rules
- No `any` types — use proper TypeScript types
- No `SELECT *` — always specify columns in Supabase queries
- Error handling on all Supabase queries — a failed read shows an error state,
  never silently-degraded or substituted data
- Status is never colour-only — always pair colour with an icon **and** a text label
- Tailwind class ordering via prettier/eslint
- Components must be properly structured (types → component → exports)
- Before finishing: `npx tsc --noEmit`, `npx eslint .`, `npx vitest run`,
  `npm run build` must all pass — and `cd mobile && npx tsc --noEmit` too if you
  touched `entities/`, `lib/` or `functions/api/`

## Design rules for agents (paste verbatim into CLAUDE.md / AGENTS.md)

1. Before touching any file under `app/` or `components/`, read `DESIGN_SYSTEM.md`. It is the only design reference. Ignore any other design document or skill.
2. **Do not redesign. Replace.** Swap page-level markup for the primitives in `components/ui/` (`PageHeader`, `StatusChip`, `SegmentedControl`, `Tabs`, `KpiCard`, `SectionCard`, `Badge`, `Button`, `ChartFrame`, `DateRangePicker`, `EmbedFrame`, `Breadcrumb`) and delete the local styling you replaced. Do not change data, copy or behaviour unless the task says so.
3. Never add a colour, font size, radius or shadow that is not a token in `app/design-tokens.css`. No `text-[…]`, `shadow-[…]`, `rounded-[…]`, `bg-[#…]`, no `blue-500`-style palette classes. `pnpm lint` enforces this; do not disable the rule.
4. Never create a second version of a primitive. If a primitive does not fit, change the primitive (and say so in the PR), not the page.
5. Fixed heights are not suggestions: `SectionCard` header 56 px / footer 40 px, charts 260 / 320 px. If content does not fit, shorten the content. KPI tiles are the app-wide `StatsGrid` tile (the HVAC card, auto height, colour = meaning) — never a second tile style (owner ruling 2026-09-02, `DESIGN_SYSTEM.md` §7).
6. One filled purple `Button variant="primary"` per view. `SegmentedControl` (purple pill strip) = mode; `Tabs` (STP-style card-pill strip) = sections — both render the app-wide `TabNavigation` strip, never a flat underline. Tabs never scroll.
7. Breadcrumbs stay. Ticker / marquee strips do not exist. Green is status only. No emoji, no illustrations, Lucide icons only at 16 px (inline) or 20 px (tiles, nav).
8. Every UI change is checked in light and dark mode at 1440 px. Run `pnpm screenshots` and attach `screenshots/*.png` to the PR.
9. If the task conflicts with any rule above, stop and ask before writing code.

> This repo uses npm: `pnpm lint` → `npm run lint`, `pnpm screenshots` → `npm run screenshots` (needs a running app at `APP_URL` and a logged-in `STORAGE_STATE`).

## Design Context

> Full spec: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (repo root) — the only design document. The notes below describe the users and the aesthetic direction; where anything here disagrees with `DESIGN_SYSTEM.md`, that file wins. (`BRAND_DESIGN.md` and `muscatbay/app/DESIGN_SYSTEM.md` are superseded.)

### Users
Operations staff and facility/asset managers at Muscat Bay (water, electricity, STP, assets, contractors, HVAC, pest, fire). Secondary: executives on the dashboard. Field: tablet users in control rooms and on-site, sometimes gloved or in night-shift lighting. Live Supabase data — never assume demo mode.

### Brand Personality
**Professional, reliable, modern.** A serious operations tool — closer to industrial BMS dashboards (Siemens Desigo, Schneider EcoStruxure) than to a marketing site or SaaS landing page. Emotional goals: confidence & trust, calm control, low-key urgency.

### Aesthetic Direction
Clean enterprise dashboard — flat, minimal, data-first. References: Grafana, Linear, Azure Portal-style cards, modern BMS HMIs. Anti-references: neon, heavy gradients, marketing-y aesthetics, dense SCADA mimic panels, per-module re-skins. **Dark mode is primary** (control rooms, night shifts); light mode is first-class and equally readable for executives/daytime use.

### Design Principles

1. **Data first, decoration never** — every visual element must serve the data. Remove anything that doesn't help an operator read status faster.
2. **Calm by default, urgent only when earned** — reserve red, animation, and elevated visual weight for genuine alarms. Normal state = quiet confidence.
3. **One system, many modules** — water, electricity, STP, assets, contractors, HVAC, pest, fire must look like pages of one app, not seven. Reuse `DataTable`, `StatsGrid`, `PageHeader`, `Breadcrumbs`, `TabNavigation`, cards, spacing, typography. Module accent colors live in icons and chart series only — never wholesale page chrome.
4. **Tokens, never hex** — colors, radii, spacing, shadows come from CSS variables in `globals.css`. Inline hex codes in components are a bug. Status → `--status-*`; charts → `--chart-*` / `--module-*`.
5. **Accessible in the field** — generous touch targets, never color-only status (pair color with icon + text), WCAG AA in both themes, respect `prefers-reduced-motion`, RTL-aware.
6. **Equally readable in light and dark** — both themes ship as production-grade. Test every KPI, chart axis, and badge in both.

### Quick Token Reminders
- **Primary** `--primary` `#4E4456` (sidebar, headings, buttons)
- **Accent** `--secondary` / `--accent` `#A1D1D5` (CTAs, focus ring, highlights)
- **Background** light `#F7F8F9` · dark `#0A090C`
- **Card** light `#FFFFFF` · dark `#16141B`
- **Radius** `10.5px` cards · `7px` inputs · `5px` chips/buttons
- **Status** `--status-normal/warning/danger/info/stale/missing` (always paired with icon + label)
- **Module accents** `--module-water/electricity/stp/assets/contractors/hvac/pest/fire` (icons & chart series only)

## Dependencies Not to Upgrade (Pinned)
- `typescript` — stay on 5.x until ecosystem supports 6.x
- `eslint` — stay on 9.x until plugins support 10.x
- `jsdom` — stay on 27.x (vitest compatibility)
- `@vitejs/plugin-react` — stay on 5.x (vitest compatibility)
