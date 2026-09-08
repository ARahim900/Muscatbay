# Muscat Bay — Project Status

> **This is the living, single source of truth for the application's current state.**
> An AI session (or a new developer) should read this file FIRST — before exploring
> the codebase — to understand what exists, what state it is in, how data flows,
> and what is in flight.
>
> **How this file stays current**
> - The **Development log** section is appended **automatically** by
>   `.github/workflows/project-status-log.yml` on every push to `main` — every
>   merged change lands there with no human action.
> - The **curated sections** (everything else) are updated by whoever completes a
>   task that changes them: AI sessions are instructed via `CLAUDE.md` to update
>   the relevant section in the same PR as the change itself.
> - Deep reference detail lives in the linked docs at the bottom — this file
>   holds the *current state*, not the full manuals.

**Last curated review:** 2026-09-02

---

## 1. The application at a glance

Utility & facility operations dashboard for **Muscat Bay** (Oman): water,
electricity, STP plant, assets, contractors, HVAC, pest control and fire safety
in one Next.js app backed by Supabase.

| Item | Value |
|---|---|
| Production | **https://muscatbay.work** (aliases: www.muscatbay.work, muscatbay.vercel.app) |
| Deploys | Vercel project `muscatbay`, auto-deploy on push to `main` (root: `muscatbay/app`) |
| Repo | `ARahim900/muscatbay`, default branch `main` |
| Backend | Supabase project `utnlgeuqajmwibqmdmgt` (ap-northeast-1) — Postgres 17, Auth, Realtime |
| Stack | Next.js 16 · React 19 · TypeScript 5 · Tailwind 4 · Recharts 3 · GSAP 3 (+ ScrollTrigger) · shadcn/ui · PWA (service worker `public/sw.js`, cache `muscatbay-v6`) |
| Design system | **v2.0 (2026-09-02)** — [`/DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) is the only design reference (`BRAND_DESIGN.md` and `muscatbay/app/DESIGN_SYSTEM.md` are superseded). Tokens: `app/design-tokens.css` (DM Sans, seven type steps, three radii, two shadows, status/module/chart colours); primitives: `components/ui/` (`KpiCard`, `SectionCard`, `PageHeader`, `StatusChip`, `SegmentedControl`, `Tabs`, `Badge`, `Button`, `ChartFrame`, `DateRangePicker`, `EmbedFrame`, `Breadcrumb`); enforcement: `eslint.design-rules.mjs` (scoped to migrated folders) + `npm run screenshots`. Pages migrate **one per session, in order: Water (done 2026-09-02) → Dashboard → STP → Electricity → Contractors → Fire Safety → HVAC → Assets → Pest Control → Settings**; the legacy tokens in `globals.css` stay only for the unmigrated pages |
| Auth | Supabase email/password + Google OAuth (added 2026-08-28 — "Continue with Google" on `/login` and `/signup`; instant sign-up, no confirmation-email round-trip; **inert until the Google provider is enabled in the Supabase dashboard**, see §4); client-side route protection (`components/auth/auth-provider.tsx`); RBAC role column (2026-05-13 migration) |
| Tests / checks | Vitest (334 tests), ESLint (incl. the design rule on migrated folders), `tsc --noEmit`, `next build` (+ `mobile/` `tsc --noEmit`) — all green as of 2026-09-03 |

Users are operations staff on control-room tablets (dark mode primary) and
executives (dashboard KPIs). Live data — there is no demo mode.

## 1a. Code layout (reorganised 2026-07-25)

The tree was reorganised on **2026-07-25** along Base44's organisation
principles, adapted to the App Router (Base44's literal `src/pages/` is
incompatible with Next.js routing, so the *principles* were applied, not the
folder names). Full detail: `muscatbay/app/FOLDER_STRUCTURE.md`.

Two rules now hold, and new work must keep them:

1. **`app/` holds routes only.** Thirteen component/helper files that had been
   added next to their `page.tsx` (`app/contractors/renewals.tsx`,
   `app/firefighting/equipment-register.tsx`, `app/assets/asset-charts.tsx` …)
   moved to `components/<module>/`. `app/` is now nothing but Next.js file
   conventions.
2. **One predictable home per module**, named as the UI names it:
   `components/{assets,contractors,dashboard,electricity,firefighting,hvac,stp,water}/`.
   `components/gulf-expert/` was renamed **`components/hvac/`** — the module is
   called HVAC everywhere in the UI. (`functions/api/gulf-expert.ts` keeps its
   name: it maps the `gulf_expert_*` Supabase tables and `mobile/` imports that
   exact path.)

Supporting changes:

- **Data layer barrels.** Three strictly ordered tiers, one barrel each, each
  carrying a header comment that documents the layering: `entities/` (types) →
  `functions/` + `functions/api/` (isomorphic readers) → `actions/`
  (`'use server'` writers). `actions/index.ts` re-exports `'use server'`
  modules **and nothing else** — merging the readers in would pull
  `next/headers` into the client graph. `functions/api/index.ts` now also
  exports the fire-safety and HVAC readers, which it had been missing.
- **Naming standardised on kebab-case.** `components/water/DailyWaterReport.tsx`
  → `daily-water-report.tsx`; `components/NotificationProvider.tsx` and
  `components/providers.tsx` (the only two loose files at the components root)
  → `components/providers/{notification-provider,app-providers}.tsx`.
  `hooks/useThing.ts` deliberately keeps camelCase — the React convention,
  applied consistently across all 8 hooks.
- **`components/inspection/findings-register.tsx` → `components/shared/`**, so
  the inspection toolkit is one folder rather than a folder that shadowed
  `components/shared/inspection.tsx`.
- **17 orphan files deleted** (2,113 LOC): 7 app-authored components with zero
  importers (`liquid-area-chart`, `data-quality-badge`, `filter-tabs`,
  `loading-spinner`, `page-transition`, `status-indicator`, `welcome-card`),
  8 unused shadcn primitives (`alert-dialog`, `calendar`, `combobox`,
  `dropdown-menu`, `field`, `popover`, `scroll-area`, `sheet` — re-add any with
  `npx shadcn@latest add <name>`), plus `components/ui/input-group.tsx` and
  `lib/status-colors.ts`, both already dead. This follows the earlier ~5,400
  LOC dead-code removal.
- **`mobile/` untouched and still green.** `entities/`, `lib/` and
  `functions/api/` were deliberately *not* moved, because the Expo app consumes
  them via Metro `watchFolders` + a `@/*` alias. `npx tsc --noEmit` passes in
  `mobile/` after the reorganisation. `lib/status-colors.ts` was safe to delete
  — it is not in mobile's import set.

The reorganisation was a pure move/rename/re-export refactor: no behaviour,
logic, styling or copy changed. `tsc --noEmit`, `eslint`, 203/203 Vitest tests
and `next build` were all green before and after.

## 2. Module status

| Module | Route | State | Data source | Notes |
|---|---|---|---|---|
| Dashboard (command deck) | `/` | ✅ Live | aggregated from module tables | KPI deck, live ops strip, module status rail; animated hero brand mark since 2026-07-04 — exact-geometry SVG (`components/brand/brand-mark.tsx`, measured from the flat brand master) with GSAP ScrollTrigger choreography (assembly on load, scroll-scrubbed teal light sweep + layer drift, reduced-motion safe); flat mark render at `public/brand/mark-frame.png` doubles as the Higgsfield video start frame. **2026-07-06:** STP "Treatment Overview" chart now live-syncs from `stp_operations` (table added to the realtime publication — see §3), matching the water chart's auto-update behaviour. The chart mirrors the main STP Plant page — every month plotted as-is (last 8), no dashboard-only completeness filter — so it reflects the same reality as the module page. The standalone asset-count KPI card + "Total Assets" activity item were removed (the deck is water/electricity/STP performance). A sixth hero KPI — **Electricity Cost** (OMR, at the flat 0.025 OMR/kWh tariff) — sits beside Electricity Usage so electricity has a cost figure to match STP's economic-impact card and the deck tiles cleanly again (2×3 / 6-across) instead of a 5-card grid with one empty slot |
| Water — Monthly | `/water` (Monthly tab) | ✅ Live, fully dynamic | `water_meters` + `water_monthly_consumption` | Balance A1/A2/A3, zones, buildings, DC, exceptions; months appear automatically (see §3). **2026-09-02 — first page on Design System v2.0** (`/DESIGN_SYSTEM.md`; branch `claude/supabase-service-role-setup-zgjzno`, PR #79 — kept as a draft through six review rounds on the Vercel preview; on 2026-09-03 the owner delegated the merge decision, the PR was taken out of draft for the automated review and merged after it). The page now reads, top to bottom, `Breadcrumb` → `PageHeader` + one `StatusChip` → `SegmentedControl` (Monthly / Daily / Satellite) → six `KpiCard`s (always visible — no longer gated behind the *Overview* sub-tab) → the kit `DateRangePicker` (ONE period control, replacing the year buttons, slider, start/end selects and 3M/6M/1Y/YTD row; because the balance is computed per calendar year, a cross-year pick snaps its start to the first data month of the end month's year) → five `Tabs` (Exceptions carries its count) → `SectionCard`s with `ChartFrame`/`chartTheme` charts, purple `text-eyebrow` table headers and `Badge` severity chips. The local `--wm-*` palette, `Panel`, `Kpi`, `TabNavigation` and `PeriodFilter` are gone; zone/building severity uses the §2.2 status tokens with the band label always beside the colour; data, copy and calculations are unchanged. (The earlier 2026-09-02 shared-pattern work — `ChartShell`, a Water `OperationalBriefing` — was reverted the same day at the owner's request and is not in the tree.) **Owner review of the preview (same day):** Water must match HVAC and STP, not the other way round — the KPI row is back on the app-wide `StatsGrid` tile (colours by meaning: A1 `water`, A2 `info`, A3 `success`, Efficiency `success`, Total Loss `danger`, Loss Cost `warning`), the mode switch and section tabs are rendered by the app-wide `TabNavigation` strip (purple pill / STP card pill), the period control's presets and selects are visibly pressable with the active preset filled, the donut is the HVAC donut (labelled slices, `CHART_PALETTE`, legend below), and the blue month-to-date callout is gone (its provenance is one clause in the caption under the period control). Recorded as rulings in `DESIGN_SYSTEM.md` §7. **2026-07-06:** Zone Analysis now surfaces the **primary/trunk network (A1→A2)** as a first-class item — the loss *above* every zone that the per-zone drill-downs structurally can't show. It has a top-of-section banner, its own dropdown option + drill-down (KPIs, main-bulk-vs-reached bar, monthly A1-vs-A2 trend, and an A1 reconciliation table of Σ zone-bulk + Σ direct vs main bulk), plus an Exceptions-register row when the A1→A2 gap breaches target or goes negative (A2>A1 → main-meter/timing issue). Live A1→A2 gap has run 0–41% month-to-month (even negative in Jan/Feb-26), so it is material and reading-sensitive. The long tables (A1 reconciliation, individual meters, exceptions register, main database) now carry a **10/20/50/All rows selector** so operators cap what shows instead of scrolling a fixed box (drill-down tables default to 20; the database defaults to All) |
| Water — Daily | `/water` (Daily tab) | ✅ Live, rebuilt 2026-07-04 | `water_daily_consumption`, `water_loss_daily/summary` | Zone-first leak-detection dashboard, 5 sections mirroring Monthly: Zone Watch (static briefing card — the looping ticker was retired 2026-09-02 under DESIGN_SYSTEM.md rule 7 — zone performance table, zone×day loss heatmap), Zone Analysis (drill-down: gauges, day composition + daily trend side by side, L3 meter table), Direct Connections, Daily Database (meter×day ledger, flags, CSV), Exceptions (auto register: high loss, negative balance, missing L2, rising-loss signature, spikes, zero-streaks). Daily balances were distribution-level only (L2 vs ΣL3) until Apr-26 — since then the NAMA main bulk lands daily in `water_daily_consumption` under account `C43659` ("Main Bulk (NAMA)", zone `Main_Bulk`); fed by CSV upload / Grafana sync. **2026-07-10:** Zone Analysis L3 meters table now shows the meter **name** (from `meter_name`, e.g. "Building FM", "Irrigation Tank (Z01_FM)") in the Meter column, with the account number kept in the Account column — previously both columns repeated the account number. **2026-07-23:** Direct Connections gauges upgraded from the two-ring L2+DC vs L3+DC pair to a **three-stage supply chain — Main Bulk (C43659) → zone bulks + DC → individual meters + DC** — with the loss written between each pair, mirroring the monthly A1→A2→A3 balance (`MAIN_BULK_ACCOUNT` in `lib/water-accounts.ts`); days/months without a main-bulk reading (pre-Apr-26) show an explicit "no reading" note and fall back to the distribution-level pair instead of faking a zero supply. The DC trend chart below the gauges now plots the same series day-by-day — Main Bulk line vs a zone-bulks-+-DC line (gap between them = daily trunk loss), with the DC-only share kept as a soft area; missing main-bulk days gap the line rather than plot zero. **2026-09-02 — Design System v2.0:** every Daily panel is a `SectionCard`, KPI tiles are `KpiCard`, status pills are `Badge`, charts go through `ChartFrame`; the Daily view reports its fetch/realtime state up to the page's single `StatusChip` instead of rendering its own Live/Offline pill; the Zone Analysis zone picker is a select (the same control Monthly uses). **2026-09-03 (QA round):** the KPI rows render the app-wide `StatsGrid` tile (the `KpiCard` adapter now wraps it), the five section panels carry `panel-<key>` ids so the `Tabs` strip's `aria-controls` resolves, and the Daily view stays reachable when the monthly read fails — the page's mode switch no longer disappears with the monthly error state. **Zone Analysis charts, reviewed 2026-09-03 at the owner's request:** "Zone daily consumption trend" plots each day's L2 bulk, ΣL3 and loss; "Month-to-date cumulative balance" plots the running sums of the same three series from day 1, so its lines are straight when the daily rates are steady and its end points are the month's totals (Zone FM Aug-26: 439.71 m³ cumulative loss = 41.1 % of supply, consistent with the ~14 m³/day the daily chart shows). It was working; it was also derivable from the chart above it, and it counted a missing L2 day as 0 supply. **Owner's decision, same day: the cumulative chart is removed** (`zone-mtd-chart.tsx` and `buildZoneMtd` deleted). The daily trend now sits at half width on the right with a footer carrying the month-to-date balance (only days with a bulk reading enter both sums, so a missing L2 day is skipped, not counted as 0), and the left half is a new chart, **"Where the water went — Day N"** (`components/water/daily-report/zone-day-breakdown-chart.tsx`, data from `buildZoneDayBreakdown`): the day's L2 bulk split into the zone's six largest L3 meters, the rest folded into one "Other (n meters)" bar, and the unmetered loss ranked alongside them in the loss colour — so when the loss outranks every meter (Zone FM, 31 Aug-26: 15.48 m³ unmetered against 4.92 m³ for the largest building) that is the first bar. An unread bulk meter means no loss bar and a footer saying so; unread L3 meters are counted in the footer, never treated as 0. The trend answers "when", the new chart answers "who" |
| Water — Satellite View | `/water` (Satellite View tab) | ✅ Live, added 2026-07-30 | same fetch as Monthly + `water_daily_consumption` (L1 series) | As-built network map over satellite imagery: 13.7 km of extracted COO87 pipework, 119 plot-joined meters, zone loss gauges, daily timeline. The map engine is the field-verified standalone viewer, self-hosted at `public/satellite/` and embedded in a same-origin iframe; `components/water/satellite/satellite-model.ts` projects the SAME `waterMeters` array the Monthly tab renders into the engine's payload (posted via `satviz:data` handshake), so the two views cannot disagree — no figures are baked into the engine. Geometry (pipes/plots/tank) is static as-built survey data and deliberately NOT in Supabase. `proxy.ts` grants `/satellite/*` its own CSP (`frame-ancestors 'self'`, tile hosts, blob workers) — everywhere else keeps `frame-ancestors 'none'`. Latest month renders as month-to-date, labelled. **2026-07-30 (2):** right detail panel is collapsible (collapsed by default, auto-expands when a zone/meter is selected, header mirrors the panel title); zone selection and map-cards are dropdowns; "Zones only" + a selected zone shows only that zone's card; months with no bulk reading show — instead of a computed 0%. **2026-07-30 (3):** Data view selector — Monthly (with a Month dropdown: period total or any single month; every card, tree row, plate, gauge and the topbar move together, nulls stay —) vs Daily (month dropdown + date slider driving the timeline; L1 only, capped at the last day read); camera buttons consolidated into a labelled Camera dropdown + toggle group; zone cards anchored at the zone's supply-side entry (nearest surveyed plot to the NAMA point) instead of the villa-cluster centre. Fixed: `getDailyWaterConsumptionFromSupabase` now paginates past PostgREST's 1,000-row cap — the unfiltered call was silently dropping July's daily series (2,443 rows in table). **2026-07-30 (4):** villa cards no longer fan out into a floating cloud — each card sits directly over its villa or is culled for that zoom (largest consumer first; zooming in reveals the rest, and a culled villa is one plate-hover away); "All" mode zooms the selected zone in closer by default and re-frames on card-mode change; the selected zone's map card collapses to its pill whenever villa cards are on show; collapsing the right panel now re-runs the card layout so cards under it come back. **2026-07-30 (5, owner request):** zone focus dimming — selecting a zone drops every other zone's ground plates, plot fills and floating cards to low opacity (hover restores a dimmed card), so the chosen zone owns the eye; and the expanded zone map-card now carries the full story instead of stopping at the unbilled %: a bulk / individual / loss m³ trio (mirroring the right panel's gauge) plus the account count (L3 + L4 apartments) in the foot. **2026-07-31 — Stage 1 of the owner-approved redesign (foundation only):** design tokens in the engine (`--s-*` 8px spacing scale, `--r-panel:16px`/`--r-card:12px`/`--r-ctl:8px`, `--ctl-h:44px`, three-level type scale), ONE panel style (96% solid, 16px radius — `#viewctl` and `#hint` now carry `.panel`), ONE uppercase label style (shared selector list; per-rule variants deleted), ONE selected/hover state (`--sel-bg`/`--hov-bg`), serif display face (Roboto Slab) fully retired — Inter everywhere, panels on 16px offsets and 280/320px widths, all controls 44px, chips 32px. Zero logic changes: verified in headless Chromium (boot, zone select + focus dimming, card trio, daily slider/timeline — all intact, zero JS errors). **Stage 2 (2026-07-31, awaiting owner review before merge):** ONE visible period selector — the left panel's Month control; the zone panel's period-chip row and the timeline's month chips are removed (`zonePeriod` and `monthIdx` follow the left selectors, all calculations unchanged); Camera + Map cards moved into one collapsed "View & camera" popover bottom-left (all controls keep their IDs/bindings — pure re-parenting + a show/hide toggle); the bottom bar is Daily-only now (`#tl[hidden]{display:none}` — the author `display:flex` had been defeating the `hidden` attribute); default map-card density is Zones-only (Top 10/All are one popover click away). **Stage 3 (2026-07-31, awaiting owner review before merge):** overlay density — the selected zone's map card auto-expands ONLY while the right panel is collapsed (open panel already tells the story; panel toggle re-renders cards; the caret still overrides); right-panel hierarchy reordered to title → period → loss gauge → bulk/individual/loss trio → explainer → month table → trend → guidance, with the bulk-meter account + position tag demoted to tertiary meta at the bottom; responsive — ≤860px the left panel folds behind a "Filters" button instead of the old `display:none` (which silently removed search/period/zone from tablets), ≤640px the right panel becomes a full-width bottom sheet (60% max-height). Verified at 1600/800/600px: zero page errors, list-driven zone selection works on tablet, all calculations untouched. **2026-08-04 (2):** network.js re-extracted with DWG CURVES TESSELLATED — the first extraction read polyline vertices only, so every bulged road bend collapsed to its chord and the main sliced over buildings (reported on Zone 3B; a 192 m chord is now a 49-vertex curve). `dwg_extract.py` (Water Network Viz `_build/`) flattens bulges/arcs/splines via ezdxf paths at 15 cm sagitta; 423 features, 1,238 base vertices, 13.81 km; needs LibreDWG ≥ 0.14 from git (brew 0.13.3 cannot decode the sheets). Reconciled with the 04-Aug owner-marked road corrections: each mark measured against the curve-true geometry — both Zone 5 marks retired (1.0 m / 4.5 m from the DWG curve, same corridor), Zone 3 (23.6 m) and both Zone 8 corridors (~11 m) KEPT as owner field knowledge beyond the drawing. `network-road-corrections.js` now matches runs by bore/material/junction endpoints (never vertex count) and splices marks between nearest surviving vertices, so re-extractions can't silently no-op it. **2026-08-04 (3, QC audit):** the Zone 3 owner mark itself was the remaining defect — a footprint-intersection audit (96 mains × 271 building polygons, 0.25 m sampling) showed the digitised mark ran 39.5 m + 32.3 m THROUGH two Zone 3B buildings the surveyed curve clears by 4–10 m (independently confirmed against the master as-built DXF: mark crosses wall linework 158×, curve 0×). Mark RETIRED — Zone 3 rides the 49-vertex surveyed curve; only the two Zone 8 corridors keep owner splices (they cross nothing). Final audit: ZERO mains-through-buildings ≥ 1.5 m site-wide (worst residual contact 1.25 m, below tolerance). Effective network 1,252 vertices, `roadAlignedFeatures` 2; corrections cache-buster bumped to v=3 (deployed v=2 still carried the bad splice). Latent note: four 2-vertex stub twins sit within the 1.5 m matcher tolerance — documented in the file, no live target touches them. **2026-08-04 (4, owner request):** building-footprint overlay — the 251 as-built building outlines (true rings where drawn, oriented rectangles labelled indicative elsewhere) now render as a quiet white outline layer beneath the network (`data/building-footprints.js`, UTM→WGS84 via the same EPSG transform as the pipes; rebuild via `_build/footprints_to_wgs.py` in the Water Network Viz folder). Zoom-gated (fades in ≥ z15), "Buildings" toggle in View & camera, legend entry; drawn first so pipes/plates/cards always stack above. Verified: independent pyproj recompute max deviation 0.074 m (rounding only), 279 tests incl. 3 new data-integrity tests, adversarial integration review clean. **2026-08-04 (5, owner request — Village Square):** sub-connections to villas/buildings now render in their own colour in every zone — gold #E8C064 core over a dark casing (hydrant/washout/valve legs moved to soft red #D67A7A matching hydrant points; teal stays reserved for Zone FM + approved as-built overlays), legend updated. Village Square zone panel now carries the building-connection schedule transcribed from the OSCO as-built set AB-MB-VS-0173-PL-WS-001/002 + WSS-003 Rev C (MWMC-01 110Ø main meter chamber, per-shop meters with locations, VCWM-01…04, VC-01…08, 110Ø DCWS HDPE roof-tank filling line) — listed, not drawn: a full georeferencing attempt (DWGs converted via LibreDWG-git, PW-01/02/03 grid-georeferenced with passing scale checks, curve/context ICP fits) established the OSCO sheets carry NO geographic control (local Revit frames, unbound architecture xrefs, raster-only plots) and the 2018 COO87 survey predates the crescent, so no shared geometry exists to fit against — publishing a guessed transform would violate the never-fabricate rule. The surveyed 225 HDPE trunk + FM Road 3/2A junction fronting the crescent are already drawn from COO87 (trunk-to-cabinet tapping not surveyed); overview + zone notes updated with the verified state and the unlock path (field-GPS MWMC-01 cover, VC-01, one hose bib → similarity fit with reported residuals). Full search documented in `public/satellite/INTEGRATION.md`. |
| Water — Hand Readings | `/water` (Hand Readings mode) | ✅ Live 2026-09-08 — migration applied to the Supabase project, Kalhat history loaded (PR #81 awaiting merge) | `irrigation_meters` + `irrigation_daily_readings` (new, separate) · `water_manual_meters` + `water_manual_readings` → trigger → `water_daily_consumption` | Fourth `SegmentedControl` mode holding **two separate tables under `Tabs`: Irrigation and Potable water**, both recorded **per day** (owner ruling 2026-09-08: one new section, two tables, daily entry). **The stored figure is the day's CONSUMPTION in m³, as Kalhat records it** — settled from the owner's file `Muscat_Bay_Water_Consumption_Restructured_5.xlsx` on 2026-09-08 (the first cut assumed cumulative meter indexes and derived today − yesterday; that derivation is gone). A day with no row is "not recorded" and renders "—", never 0; negatives are kept and flagged. One `DateStepper` (capped at today) serves both tabs. Each tab: `StatsGrid` of the **selected day** (three meter groups + "meters recorded n / N", month-to-date in the subtitle) → entry card (consumption per meter + note) → daily log (meters × every day of the month, CSV; a missed day is a visible gap) → daily-consumption chart (`ChartFrame`, gaps not joined). **Irrigation:** registry of 13 meters — the 10 rows on the Kalhat sheet (bore well, STP/TSE into the main tank, main outlet, Central Park TSE = Tank 02, Z5 = Tank 03, Z8 = Tank 04, Village Square = Tank 06, Controller 09, Jumarieh feeding tank, and **"SA TSE", which is on the sheet but not on the owner's meter list — kept under its sheet name until the owner says which tank it is**) plus three from the owner's list with no sheet row yet (PO line, Tank 05 FM, Controller 08). Loaded Jan–Sep 2026: 2,328 day-rows; one text cell ("New Meter", outlet 13 Feb) skipped; 9 negative days on SA TSE in June kept and flagged. Never touches the potable tables. **Potable water:** the eight bulk meters Kalhat reads — Main Bulk C43659, zone bulks 3A 4300343 · 3B 4300344 · 5 4300345 · 8 4300342 · VS 4300335 · FM 4300346, and "Central park" = the existing Irrigation Tank 02 meter 4300320. Loaded 6 May – 1 Sep 2026: 627 day-rows. The trigger `water_manual_readings_apply` copies each figure into the day cell of the wide daily table, so Zone Watch, the loss balance, the Monthly month-to-date fallback, Satellite and the dashboard read it with **no read-path change**. Overwrite rules (asserted in `sql/tests/manual-readings.test.sql`): `manual_owned` meters (C43659, 4300342, 4300320 — the initializer's EMAIL_OWNED set) always rewrite their cell; the other bulks fill an **empty** cell only, or one still holding the value this table wrote (`applied_consumption`). On the live load 268 rows went into the daily table (the three owned meters — values identical to what the owner had already keyed by SQL) and 359 rows stayed in `water_manual_readings` only because Grafana already held an instrumented value for those zone-bulk days; those Grafana values differ from Kalhat's (e.g. Zone 5, 6 May-26: 108.5 vs 165) and are deliberately not replaced. Writes go through `saveManualReadingsAction` with the caller's own session, so RLS decides (operator+ may write; viewer sees the cards read-only with a caption). Own fetch + realtime channel per tab, reporting into the page's single `StatusChip`. Still open: `npm run screenshots` (needs a running app + login); the entering colleague's `profiles.role` must be set to `operator`. |
| Electricity | `/electricity` | ✅ Live, inspection-first redesign 2026-07-05 | `electricity_meters` / `electricity_readings` | Two tabs (down from three): **Load Watch** (default) — category (meter_type) severity cards worst-first, category×month load heatmap, auto Exceptions & Actions register (per-meter spike/dip/zero/negative/missing vs each meter's own baseline), with KPIs + trend charts kept below; **Meters & Data** (Analysis + Database in one tab). **2026-07-06:** de-duplicated after review — the two near-identical horizontal bar charts (top-10 consumers + meter-vs-average) collapsed into one **Meters by Consumption** chart (ranked high→low, each bar colored above/below the group average with an "Avg" reference line, the filter-selected meter outlined); the two overlapping consumption tables (Monthly Breakdown + the separate anomaly grid) collapsed into one **Meter Consumption & Anomalies** table that follows the shared date range and keeps search + type filter + rows pagination + CSV, now with a Cost column, a Total row and the anomaly tinting on each cell. Monthly readings through Jun-26 (loaded via hand-run `sql/migrations/update_electricity_*.sql`) **2026-08-31:** KPI tiles swapped from `StatsGrid` to the Water tile (`HierarchyStatGrid`, promoted out of `components/water/daily-report/inline-shared.tsx` into `components/shared/hierarchy-stat-card.tsx`) — same `StatItem[]`, same column counts, so the swap is one line and nothing reflows. The tile is quieter by design (no trend arrow or status word) because Load Watch carries that detail beneath it; `StatsGrid` stays where the trend is the message. **2026-09-03:** the Load Watch "Load briefing" strip (one wide card, four columns) is now a `StatsGrid` row of the same four figures — Consumption, Estimated cost, Previous month, Flagged meters — so Electricity's headline row is the same tile as Water, STP and HVAC (owner: "wow very identical"); the month moved from the strip caption into the first tile's subtitle, cost turns `danger` only above the configured budget, flagged meters are `danger`/`success`. Later the same day the category table's **"6-month trend" column** (sparkline + % vs previous month, and its sort key) was removed at the owner's request; the trend still reaches the CSV export, and the phone-width summary line keeps cost only |
| STP Plant | `/stp` | ✅ Live, inspection-first redesign 2026-07-05 | `stp_operations` | Two tabs: **Plant Watch** (default) — process-health cards worst-first (efficiency, hydraulic load, TSE reuse, tankers, data completeness), load-vs-recovery chart, metric×day heatmap, auto Exceptions & Actions register (data-relative severity + efficiency bands); **Operations & Trends** keeps the KPIs, charts, daily log/CSV and folds the Airtable DB into a collapsible. Daily ops through May-26; 3D plant twin exists only on unmerged PR #21. `stp_operations` added to the `supabase_realtime` publication 2026-07-06, so both this page and the dashboard now refresh live on data changes (the page already subscribed but the table was unpublished) **2026-08-31:** Load vs Recovery rebuilt as an interactive area chart — two layered gradient bands (inlet, TSE) on a single m³ axis plus a 90/30/7-day window selector, replacing the bars-plus-efficiency-line pair on two axes. The bands are layered, not stacked: TSE is the portion of the inlet that came back out, so it sits inside the inlet band and the gap between them is the unrecovered water. Efficiency moved to the tooltip label (it keeps its own process-health tile) — a percentage never shared a scale with m³. TSE stays raw, so a negative reading dips below the axis and a TSE band above the inlet band shows >100% recovery, a physical impossibility the paired axes used to hide. KPI tiles swapped from `StatsGrid` to the Water tile (`HierarchyStatGrid`) so water, electricity and STP present headline figures identically. **2026-09-02:** swapped back to `StatsGrid` — the owner ruled that every module's KPI row is the HVAC tile (`DESIGN_SYSTEM.md` §7); `components/shared/hierarchy-stat-card.tsx` is now unreferenced and kept pending approval to delete |
| Assets | `/assets` | ✅ Live | `master_assets_register` | 6-card KPI grid; register table with toolbar (PR #25). **2026-07-10:** first load no longer flashes a false "Demo Data / OFFLINE / all-zero KPIs" state — the status bar shows a neutral "Connecting…" chip and the KPI grid stays skeletoned until the first fetch resolves (`PageStatusBar` gained a `loading` prop); realtime changes refresh the table silently instead of blanking it |
| Contractors | `/contractors` | ✅ Live | **`amc_register`** (AMC tab, renewals, alerts), `contractor_contracts` (Contracts tab + header KPIs — still legacy) | AMC tracking, yearly costs. **2026-07-10:** contractor names wrap to two lines with the full name on hover instead of truncating with no affordance (mobile cards wrap fully — touch has no hover). **2026-07-23:** AMC Tracker tab gained the missing database (CSV) export — all three contractor tabs now export. **2026-08-04:** repointed off `Contractor_Tracker` to the new `amc_register` (ACT-012) — see "AMC register cutover" below |
| HVAC | `/hvac` | ✅ Live | Gulf Expert tables | Findings/maintenance model — the layout template other modules align to |
| Fire Safety | `/firefighting` | ✅ Live (redesigned 2026-06-30) | `fire_safety_equipment`, `fire_ppm_activities`, `fire_issues_register`, `fire_ppm_contacts` | BEC AMC: 3 PPM cycles × 4 zones; aligned with HVAC layout (PRs #26/#27) |
| Pest Control | `/pest-control` | ✅ Live | pest tables | **2026-07-10:** the AITable embed (cross-origin iframe — internals can't be restyled) now follows the app's light/dark theme via its `theme` param, sits behind a card-surface loading cover until it finishes loading, and gains an "Open full view" header action |
| Firefighting quotes, settings, auth pages | various | ✅ Live | | |

**2026-07-10 — cross-module UX/perf pass** (applies to Dashboard, Water,
Electricity, STP, Contractors, HVAC, Fire Safety, Assets):

- **Instant module switching.** All module pages fetch client-side on mount;
  previously nothing was cached, so every sidebar navigation — including
  returning to a module visited seconds earlier — replaced the page with its
  full skeleton until the fetch resolved (felt like a full reload; links were
  already `next/link`). New `lib/page-cache.ts` (session-scoped
  stale-while-revalidate Map) seeds each page's state on revisit and the mount
  fetch refreshes silently in place. First-ever visits keep the one-time
  skeleton; the brand splash remains initial-app-load only. Sidebar + bottom-nav
  icons swap to a spinner while their navigation is in flight (`useLinkStatus`).
- **Toasts moved top-right** (below the topbar, aria-live, click-through
  wrapper) — they previously sat bottom-right where they covered the last KPI
  card (seen on `/stp` with "STP: High Tanker Activity").
- **KPI labels wrap instead of truncating mid-word** on narrow viewports
  ("WATER PRODUCTI…") — command deck + shared `StatsGrid`.

**2026-07-13 — alert reliability + interface consistency pass** (cross-module):

- **Data-driven operational alerts.** New pure rules engine
  `lib/operational-alerts.ts` (unit-tested) evaluates live data for the three
  operational risk classes and is the single source of truth for "is anything
  wrong": water system loss vs the 15% target (critical zones >25% listed;
  months without an A1/NAMA reading are skipped, never reported as fake loss),
  contract expiry from `amc_register` (past End Date while still marked
  Active = critical; within 60 days = warning; rows already marked Expired are
  treated as closed history), and STP critical failures (zero TSE output while
  sewage arrived, recovery under the 90/80% bands, daily log stale >3 days).
  `hooks/useOperationalAlerts.ts` fetches sources, re-evaluates on realtime
  changes + a 30-min clock tick, persists acknowledgements per condition
  fingerprint (localStorage; a new month/day/set re-raises), and fires ONE
  browser push per new warning/critical fingerprint. **Mock data is never
  evaluated** — when live sources are unreachable the feed says monitoring is
  offline/partial instead of pretending health. This closes the core alert
  bug: the app could show "all caught up" while the Water page flagged losses
  28.8 pp above target in red.
- **Alert surfaces.** Shared feed component (`components/alerts/alerts-feed.tsx`)
  renders active alerts (severity icon + module chip + Review link +
  Acknowledge/Reopen) above session notifications, with honest empty/degraded
  states. The mobile Alerts sheet now uses it, and a **new topbar bell**
  (`components/layout/notification-bell.tsx`) gives desktop its first alert
  surface (badge = unacked alerts + unseen session notifications; opening the
  feed marks session items read). Dashboard "Latest Updates" now leads with
  live alerts, so its previously-dead **critical** filter works.
- **Monthly-change calculation standardised.** One shared `lib/trends.ts`
  (`calcTrend`/`describeTrend`) replaced three divergent copies (dashboard
  hook, Electricity page, STP page) that disagreed on neutral labels
  ('0%' vs '—' vs '~0%'); no-baseline (`—`) is now distinguished from
  stable (`~0%`) everywhere, including the dashboard chart insight lines.
- **Dashboard chart time axes aligned.** Both hero charts plot one shared,
  calendar-contiguous last-8-months window (ending at the newest month across
  water + STP); months without a reading render as gaps instead of being
  silently dropped (the missing Jun-26 NAMA month now shows as a gap), and the
  water running-average ignores gap months. KPI subtitles standardised to the
  app-wide `Mon-YY` month format (STP previously showed "Mon YY").
- **Colour usage unified.** `lib/water-monthly-data.ts` was the last rogue
  hex palette: `sev()`/`statusFromLoss()` now resolve the same `--mb-*` status
  tokens as the shared inspection toolkit (plus a `chart` mid-tone for
  bar/border fills), and `TYPECOL` maps to `--chart-*` tokens — Water Monthly
  severity visuals now match STP Plant Watch / Electricity Load Watch and
  theme correctly in light/dark.
- **Settings corrected.** Profile card no longer claims information is
  "public"; the Account tab's stray Save button (it saved *profile* fields) was
  removed; the Notifications tab dropped the fictional email-digest and SMS
  toggles and now shows the real monitored conditions plus a working,
  persisted browser-push preference (`lib/alert-preferences.ts`) and the
  actual browser permission state with an Enable action.

**2026-07-11 — mobile bottom navigation redesign.** The mobile dock
(`components/layout/bottom-nav.tsx`) was rebuilt from the 5-modules-plus-"More"
bar into a floating, rounded **pill** with four tabs — **Overview** (dashboard
link), **Modules**, **Alerts** and **Profile**. Modules/Alerts/Profile open
slide-up sheets rather than navigating: Modules is a 2-column grid of every
operations module (RBAC-filtered, module-accent icons); Alerts renders the
in-app notification feed from `useAppNotifications` with a red unread-count
badge on the bell (plus push-enable prompt + "all caught up" empty state);
Profile carries the account card, a light/dark appearance toggle, Settings and
Sign Out. Because the sidebar is unreachable on phones, these sheets deliberately
expose everything the desktop sidebar does. Theme-aware and token-only (dark
elevated pill / light card pill, teal `--secondary` active state) with
focus-trap + Escape + background-scroll-lock on the sheets. Page bottom padding
(`client-layout.tsx`) was raised to clear the taller floating dock, and the
print stylesheet's stale `nav[aria-label="Primary navigation"]` selector was
corrected to `"Mobile navigation"` so the dock is hidden when printing.

**2026-07-23 — database export everywhere (cross-module).** Every data
table/register in the app now has a CSV download. A new shared
`ExportButton` (`components/shared/data-table/export-button.tsx`, exported
from the data-table index) standardises the button: exports the *filtered*
rows with the full column set of the underlying table, date-stamped
filename, disabled state when empty, row-count hover title. Added where
export was missing: **Contractors → AMC Tracker** (the `Contractor_Tracker`
table itself — Contracts and Yearly Costs already exported), **HVAC →
Maintenance** (`ge_ppm_findings`, 16 columns incl. action required /
contractor notes / recurring flags) and **Recurring Issues**
(`ge_recurring_issues`, via a new count-plus-export header), **Fire Safety
→ Equipment Register, Issues & Defects Register** (export action on the
section headings) **and the Maintenance PPM table** (toolbar button,
cycle/zone/status exported as readable labels), and the **Water Monthly
zone drill-downs** (A1 Reconciliation + Individual Meters panels — compact
CSV button beside the rows picker, using the dashboard's own
`downloadRows`). `lib/export-utils.ts` CSV downloads are now UTF-8
BOM-prefixed so Excel renders Arabic names and symbols correctly (benefits
all pre-existing exports), arrays export joined with `;`, and an explicit
column spec now yields a header-only file instead of an empty one when a
table has no rows. Pre-existing exports (water database tables,
electricity, STP daily log, assets, exceptions registers) are unchanged;
unit tests cover the CSV builder and the shared button (203 tests green).

**2026-07-25 — front-end & O&M evaluation + remediation wave** (cross-module,
PR #49). A full senior-management review of every route and subsection was run
against the codebase; the findings and the fixes below are the result.

*Scope decision from management:* the app **identifies** issues; it does not
track their resolution. Work orders, task assignment, owners, due dates,
status transitions and close-out evidence are **explicitly out of scope** —
issues are actioned on the floor. Accordingly the fake `Owner` /
`Status: "Open"` columns were **removed** from every exceptions register
(they implied a workflow that does not and will not exist). The registers are
now identification-only: severity, item, value, remarks, suggested action.

- **Fabricated data removed (P0).** `app/login/page.tsx` rendered a "Live
  System Status" panel with hardcoded figures (2,847 m³ water, 148 kWh,
  892 m³ TSE) and pulsing Normal/Nominal/Active pills, above a comment
  claiming it showed real system data — on a pre-auth page that cannot read
  any data. Replaced with a capability list carrying no figures.
- **Silent mock data removed (P0).** `/water` swapped in `MOCK_WATER_METERS`
  on a failed *or empty* fetch and rendered it as an ordinary dashboard.
  Nothing is substituted for live data now — `WaterErrorState` /
  `WaterEmptyState` say what happened and offer a retry.
- **Error boundaries were shipped but never mounted (P0).** Two
  implementations (`components/shared/error-boundary.tsx`,
  `components/ui/error-boundary.tsx`, ~212 LOC) had zero consumers, so any
  render fault blanked the whole route. Consolidated into
  `components/shared/section-boundary.tsx` and wrapped around every major
  section app-wide.
- **Wrong numbers corrected.** Assets "WITH AMC CONTRACTOR" was rendering a
  count of `is_asset_active`, and "HIGH CRITICALITY" a 3-way OR
  (`erl_years≤2 OR criticality=High OR status=TO VERIFY`); both now query what
  they claim. Warranty Expiry sort had no entry in `SORT_FIELD_MAP` and
  silently sorted by name. The row-count footer claimed "1–3061 of 3061"
  while fetching 500.
- **HVAC was showing an expired contract as current** — OMR 8,557.5 hardcoded
  in `overview-tab.tsx`, which `gulf_expert_contracts` marks EXPIRED; the live
  2026-27 contract is **OMR 7,234.000**. Now data-driven. HVAC also queried
  with no `.range()` and hit PostgREST's 1,000-row default silently; reads are
  paged and truncation is now surfaced.
- **Thresholds unified.** New `lib/thresholds.ts` is the single source for
  Electricity and STP. Previously four competing sets meant one meter could
  read Critical on Load Watch and merely High in the table below it. Active
  gate values are printed in the UI instead of hardcoded prose.
- **Data honesty.** Missing / zero / negative readings are three distinct
  states everywhere (electricity table + CSV preserve NULL-vs-0); negative TSE
  raises its own data-integrity finding instead of being masked as "reuse
  stopped"; STP silently-dropped future-dated rows are now reported; the three
  hand-rolled STP SVG charts became Recharts with tooltips and real axes, and
  the silent every-Nth sampling that could hide a one-day spike was removed.
- **Personal data removed.** `app/firefighting/page.tsx` contained two private
  Gmail addresses and named individuals for tanker agreements, committed in
  source. Removed. The PPM plan, contract, SLA and insurance blocks were moved
  out of component source into `ppm-programme.ts` / `contract-reference.ts`,
  each stamped "Contract reference · as of <date>" so static paperwork cannot
  read as a live reading.
- **Dormant functionality wired up.** `getContractorExpiry` /
  `getContractorDetails` / `getContractorPricing` were built, exported and
  called by no page. Contractors now has Renewals and Terms & SLA tabs; end
  dates are parsed (13 real-world formats) and given severity instead of being
  printed verbatim, so an expiring contract can finally be seen.
- **Dead code deleted (~4,300 LOC).** Nine unreferenced Water components plus
  an entire parallel daily implementation (`zone-panel`, `dc-panel`,
  `report-primitives`, `report-types`, `zone-analytics`), the duplicate error
  boundary, and the unused `hooks/useSTPData.ts`.
- **Accessibility & consistency.** `TableHead` defaults `scope="col"` (fixes 12
  consumers); status is never colour-only; 44px minimum touch targets on coarse
  pointers; remaining hex literals replaced with tokens; Fire/HVAC registers
  rebuilt on the shared table primitives; `RouteRoleGuard` finally wires
  `RequireRole`, which had been written but never imported (route gating was
  dead code — only nav links were hidden).
- **Chart motion now honours `prefers-reduced-motion` (2026-07-25).** Every
  other animated surface already checked the setting; Recharts did not. Recharts
  defaults `isAnimationActive` to `true` and offers no global switch, so all
  **49 series across 13 files** animated regardless of the user's OS preference
  — the single largest reduced-motion gap in the app. New reactive hook
  `hooks/useReducedMotion.ts` (`useReducedMotion` + `useChartMotion`) is now
  spread onto every series. It is built on `useSyncExternalStore`, so it also
  responds to the setting being toggled *mid-session*, which the existing
  one-shot `lib/motion.ts#prefersReducedMotion()` cannot do (that function is
  for calling inside a GSAP effect, not during render — both are correct, they
  serve different call sites). Chart duration also moved off Recharts' stock
  1500ms onto the shared `MOTION.dur.count`, so a chart and the KPI roll-up
  above it settle together. A duplicate one-shot `matchMedia` read in
  `liquid-bar-chart.tsx` was removed in favour of the hook.
- **KPI figures mark themselves when they change (2026-07-26).** The dashboard
  refreshes from Supabase realtime *in place*, so a reading could move under an
  operator with nothing to say it had — on a wall-mounted or glanced-at screen
  that is the difference between noticing a change and missing it. New hook
  `hooks/useValueChanged.ts`, wired into the KPI tiles: when a figure actually
  moves, its tile carries one sweep of the accent and the number lifts to the
  info colour, settling back over 1.4s. Three rules keep it from becoming
  noise: it **never fires on first render** (`previous` is seeded with the
  initial value, so a figure appearing is not a figure changing — flashing
  every tile on load would train people to ignore the signal); the comparison
  runs **during render**, React's documented "adjust state when a prop changes"
  pattern, so it costs no second render pass and does not trip
  `react-hooks/set-state-in-effect`; and it stays **silent under
  `prefers-reduced-motion`**, because the highlight only ever reinforces the
  change — the figure updates either way. `StatsGrid`'s tile is now a separate
  `StatTile` component, since the hook has to run per tile.
- **Dashboard for management.** Acknowledged alerts no longer persist; each
  severity has a distinct icon + text label; KPI period labels are always
  visible (they were suppressed whenever a trend existed, i.e. always) and the
  differing "latest month" rules are disclosed; targets, YTD and a labelled
  straight-line projection added; the five modules with no executive visibility
  (Assets, Contractors, HVAC, Fire, Pest) now appear via `useModuleCoverage`.
- **PWA / App Store groundwork.** Complete manifest, generated icon set,
  offline shell, service worker v7. Note a PWA **cannot** be listed on the App
  Store — see the `mobile/` Expo app below.

**Verified:** `tsc --noEmit` 0 errors · ESLint clean · 203/203 tests ·
`next build` succeeds (21 routes).

**2026-08-24 — unified table conformance pass (cross-module).** Every data
table was audited against the STP Daily Operations Log reference (the approved
unified-table look: brand-purple sticky header with sort arrows, toolbar with
title/search/filter/Export CSV/record count, zebra rows, emphasized first
column, pagination, mobile handling) and the gaps were closed. No new
dependencies — everything reuses `components/shared/data-table/` and
`components/ui/table`.

- **First-column emphasis is now a system default.** `.ops-table tbody
  td:first-child` renders at weight 600 (base cells 500) via `globals.css`,
  with a `data-plain-first-col` opt-out on `<Table>`. The base cell weight
  moved off `<TableCell>`'s Tailwind class into the `.ops-table` rule so the
  components-layer emphasis can win; per-cell weight utilities still override.
  Redundant per-file `font-medium` first cells were dropped (fire equipment /
  issues registers, HVAC PPM schedule).
- **`components/shared/findings-register.tsx` rebuilt on the unified
  primitives** (affects STP Plant Watch + Electricity Load Watch registers):
  raw `<table>` → `<Table>` (fixes the non-sticky header inside its scroll
  box), new column sorting, `TablePagination` (25/50/100/All) replacing the
  "show 50 more" batching, `ExportButton`, a `md:hidden` card list (it had no
  mobile variant), and the toolbar layout of the reference. Props API
  unchanged; still identification-only.
- **Sorting added** where header sorting was missing: STP Process health
  (status + summary), Electricity meters table Total (kWh) + Cost (OMR)
  columns, Contractors renewals (5 columns) and AMC pricing (contractor,
  total).
- **CSV export added** where absent: STP Process health, Electricity Category
  performance, Water Zone performance (Daily → Zone Watch), Water DC daily
  matrix, Water zone L3 day matrix (all via `ExportButton`, filtered rows,
  nulls exported empty — never 0), and the Water Monthly Buildings
  bulk-vs-apartments panel (compact `PanelExport`, matching its siblings).
  Bespoke export buttons on Contractors → Contracts, Assets (all five tabs,
  now per-tab column specs) and the Water daily database swapped to the shared
  `ExportButton`.
- **Raw-table migrations:** Contractors yearly cost matrix →
  `<Table>`/`TableFooter` (was a hand-classed `ops-table`), Water daily
  Exceptions & Actions → `<Table>` primitives.
- **Toolbar titles/subtitles** added inside `TableToolbar` (matching the
  reference) on: Electricity meters, HVAC PPM Findings + Recurring Issues,
  Fire PPM Maintenance Tracker, Contractors Contracts/Yearly/AMC Tracker,
  Contractors renewals/pricing/terms, Assets (tab-aware).
- **Deliberately exempt** (visualization matrices, not data tables):
  `MetricHeatmap` (`shared/inspection.tsx`), the zone×day heatmap in
  `zone-watch.tsx`, and the zone-loss heatmap in the water monthly dashboard.
  The water monthly dashboard's remaining bespoke tables (A1 reconciliation,
  zone meters, meter database, exceptions register) already wear the reference
  look — the CSS was originally modelled on them — and keep their internals;
  migrating them onto the primitives stays on the known-gaps list (§4).

**Verified:** `tsc --noEmit` 0 errors · ESLint clean · 284/284 tests ·
`next build` succeeds (21 routes) · headless-Chromium pass over STP,
Electricity, Contractors, Fire, Assets in mock/offline mode — zero console
errors, first-column weight 600 confirmed computed.

**2026-09-02 — production-hardening release candidate (not yet applied to the
live database).** The application-side security, data-integrity, performance,
accessibility and utility-layout work is implemented on
`codex/production-hardening`; the two SQL migrations remain deliberately
unapplied until staging verification and owner approval.

- **Access control:** public sign-up routes now present an invitation-only
  flow; server-side invitation validation supports approved addresses and
  domains. The first migration adds a Before User Created hook plus explicit
  role policies for viewer, contractor and admin access, without relying on UI
  visibility. A PostgREST adversarial test script is included for dummy Viewer
  and Contractor sessions.
- **Operational accuracy:** fire PPM status is date-driven; STP process alerts
  distinguish data-quality warnings from performance alerts; Gulf Expert and
  HVAC/BMS contract dates are reconciled from stored evidence; alert
  acknowledgement and resolution are separate incident timestamps; critical
  incidents remain visible until resolved or the underlying metric recovers.
  Live clients re-evaluate every 30 minutes and on realtime changes; the Vercel
  Hobby-compatible server safety sweep runs daily at 02:00 Oman time.
- **UI and performance:** Water, Electricity and STP use the same four-card KPI
  system, primary/secondary navigation hierarchy, status bar, briefing and
  chart shell. Heavy charts are dynamically imported, chart containers wait
  for measurable dimensions, pagination remains reachable on mobile, and KPI
  refreshes are committed as one state update.
- **Hardening and accessibility:** third-party embed URLs are allowlisted and
  sandboxed; CSP no longer permits unsafe script execution; robots and
  `X-Robots-Tag` block indexing; touch targets, heading order, table labels,
  duplicate ticker semantics and reduced-motion states are covered by tests.
- **Dependency and release checks:** Next.js is pinned to 16.2.11 and vulnerable
  transitive packages are refreshed. TypeScript, ESLint, 365 Vitest tests,
  production build, dependency audit and the signed-out Playwright suite pass.
  Authenticated profile/avatar/password/push flows and direct REST RLS tests
  stay staging-gated because no isolated staging project is currently recorded.

## 3. Water monthly data — how it works now (important)

Rebuilt 2026-07-03 (PRs #29/#30) so that **any monthly value present in the
backend appears in the frontend automatically** — the recurring "dashboard
stops at last month" problem is structurally closed:

- The app reads long-format tables: `water_meters` (registry, 350 meters,
  `meter_id` like `MB-L2-001`) + `water_monthly_consumption`
  (`meter_id, period 'YYYY-MM', consumption`). No month list is hardcoded
  anywhere in the app; no fetch ceiling (device-clock independent).
- The legacy wide sheet **"Water System" is a writable VIEW**: INSERT/UPDATE
  against it (Supabase Studio edits, old Airtable sync scripts,
  `scripts/update-water-data.ts`) fire an INSTEAD OF trigger
  (`water_system_view_write`) that upserts the base tables — auto-registering
  brand-new meters and translating legacy zone/type spellings to clean codes.
- The view **rebuilds itself monthly** (pg_cron job `water-system-view-rebuild`,
  00:10 UTC on the 1st) via `rebuild_water_system_view()`, extending its month
  columns one year past the newest data — new years need no schema work.
- `water_meters` + `water_monthly_consumption` are in the `supabase_realtime`
  publication; the Water page and dashboard hook subscribe to them, so open
  dashboards refresh live when data lands.
- Migration source of truth: `muscatbay/app/sql/migrations/20260703_water_monthly_auto_sync.sql`
  (applied to the live DB as `water_monthly_auto_sync` + `_hardening`).
- Daily data path (unchanged): CSV/Grafana → `water_daily_consumption`
  (GitHub-Actions Grafana sync exists on unmerged PR #6 only).
- **Current-month fallback (added 2026-07-29):** the official monthly reads for
  a month are imported a few days into the NEXT month (June-26's rows were
  created 3–4 July), so the in-progress month used to be invisible in the
  Monthly view (owner report: "July doesn't appear"). `fetchWaterMeters` now
  detects months present in `water_daily_consumption` but absent from
  `water_monthly_consumption` (PostgREST `not in` on the covered month keys),
  sums the real daily readings per meter (nulls skipped — an unread meter
  stays `null`, never 0; negatives kept and flagged), and merges them in as
  **month-to-date** values. It reports them as `derivedMonths`
  (`{ month, throughDay }`) and the dashboard shows a labelled info note
  ("July 2026 is month-to-date — summed from daily readings through day N;
  official monthly readings will replace these figures automatically"). By
  construction the merge never overwrites an official monthly value, and the
  month leaves the fallback on the first fetch after the import lands. The
  Water page also subscribes to `water_daily_consumption` realtime now, so the
  month-to-date figures freshen as daily data arrives. Note for testers: daily
  sums ≠ official monthly reads (June-26: 317/350 meters differ, avg ~56 m³),
  which is exactly why these months carry the provenance label.
- **Hand readings (added 2026-09-08, migration `20260908_manual_meter_readings.sql`,
  applied live the same day):** Kalhat's daily consumption figures for the eight
  potable bulk meters land in `water_manual_readings`; the trigger copies each
  day into the matching `water_daily_consumption.day_N` cell. Three
  accounts are `manual_owned` (C43659, 4300342, 4300320 — the initializer's
  EMAIL_OWNED set) and are always rewritten; the rest fill empty cells only and
  never overwrite Grafana. Because the fill lands in the same wide table, every
  existing reader (Daily, month-to-date fallback, Satellite, dashboard) sees it
  unchanged. Irrigation is a separate pair of tables (`irrigation_meters`,
  `irrigation_daily_readings`) and never touches the potable data. Both readings
  tables are added to the realtime publication. **If the 2026-09-01 security
  migration is ever re-run, add the four new tables to its inventory first** —
  its fail-closed sweep strips policies from unlisted tables. Local proof:
  `sql/tests/run-local.sh` (PostgreSQL 16, throwaway cluster).

## 4. Known gaps & data debt

- **Closed 2026-09-08 — a shipped column rename needs a service-worker bump.**
  After the hand-readings tables moved from `reading` to `consumption`, an
  already-open tab kept showing "column irrigation_daily_readings.reading
  does not exist". The deploy was correct and the database was correct; the
  PWA service worker caches `/_next/static/*` cache-first and only hands a
  client onto a new bundle when `sw.js` itself changes, so no new SW
  installed, no `controllerchange` fired, and `register-sw.tsx` never ran its
  reload. `public/sw.js` `CACHE_VERSION` bumped v8 → v9, which drops every
  cache and reloads open sessions. **Rule: any deploy that changes a column
  the client selects must bump `CACHE_VERSION` in the same commit** — a
  code-only deploy cannot reach a tab that is already open.
- **Open 2026-09-08 — hand readings, two loose ends.** (1) "SA TSE" on the
  Kalhat irrigation sheet is not on the owner's meter list; it is stored under
  its sheet name (`IRR-SA-TSE`) until the owner says which tank it is (Tank 05
  FM? Controller 08?) — renaming is a one-row registry update. (2) The
  entering colleague's `profiles.role` must be set to `operator` — the default
  `viewer` role sees the entry cards read-only by design. Also: the Kalhat
  zone-bulk figures differ from Grafana's for the same days (Zone 5 on
  6 May-26: 165 hand vs 108.5 Grafana); both are kept, Grafana in the daily
  table and Kalhat in `water_manual_readings`, and the daily views show the
  Grafana value. Screenshots (`npm run screenshots`) still not produced (no
  running app / login in the build session).

- **Closed 2026-09-04 — every module header now matches Water's.** Reported by
  the owner from `/water`, `/electricity` and `/stp` side by side: Water fitted
  on one row while Electricity ran the title onto two lines ("Electricity /
  Monitoring") beside a status cluster three times the height of Water's chip.
  Two shared components caused it on all eight legacy pages, so both were fixed
  once rather than page by page:
  - `components/shared/page-header.tsx` scaled its `h1` to `text-4xl` (36 px) and
    let the title and description wrap freely. It now uses the kit header's
    proportions — `md:h-header` (64 px), one `text-display` step, `truncate`,
    `md:max-w-[60%]` — so a long title is shortened rather than wrapped.
  - `components/shared/page-status-bar.tsx` rendered "Live Data (Supabase)" + a
    record count + a LIVE/Offline badge + a "DATA THROUGH …" pill + a
    to-the-second sync time. `DESIGN_SYSTEM.md` §6 allows one chip, and
    `StatusChip` was written to replace exactly that cluster (its own header
    comment says so); the pages had simply never adopted it. The bar now maps
    its props onto a single `StatusChip`, following the state mapping `/water`
    already uses, with data staleness outranking realtime state. **The recency
    warning is kept, not dropped** — Electricity still reads "Data to 01 Jul ·
    65 d behind" on an amber dot, now inside the one chip.
  Page titles were shortened to the sidebar names, closing backlog item (f):
  "Electricity Monitoring" → **Electricity**, "Assets Register" → **Assets**,
  "Contractor Management" → **Contractors**, "Fire Safety Management" → **Fire
  Safety**. Two Title Case descriptions moved to sentence case. Dropped from the
  headers: the `{n} readings` / `{n} daily records` counts and the per-page
  `connectedLabel` / `disconnectedLabel` overrides (provenance belongs in a
  caption, §0). Electricity's orphaned `readingsCount` state and cache field went
  with them. `eslint`, `tsc`, 334 tests and `next build` all green.
- **Closed 2026-09-04 — `mobile/` moved onto Design System v2.0.** The
  2026-09-03 audit found the Expo app running a fork of the pre-v2 palette,
  citing the superseded `BRAND_DESIGN.md` as authoritative. Status colours were
  the stock saturated set (`#22C55E`, `#F59E0B`, `#EF4444`, `#3B82F6`) with **no
  dark variants at all**, so a status icon measured 2.1–2.8:1 on a light card —
  below the 3:1 floor for non-text contrast — while the app's own contract
  promises a visible shape cue. `src/global.css` and `src/theme/tokens.ts` now
  carry the §2.2 muted status pairs per theme (4.7–6.5:1 light, 7.2–12.3:1
  dark), the §2.3 module accents (electricity, STP, HVAC and fire had all
  drifted), and the §2.4 six-series chart palette including the same dark lift
  for series 1/3/5 the web got the same day. `STATUS_COLORS` was a flat constant
  and is now per-theme, reached through `useTheme().colors.status`;
  `presentation()` takes a theme and `useStatusPresentation()` is the hook form.
  Because §2.2 defines five status colours, `stale` and `missing` map onto the
  warning and neutral tokens rather than inventing a sixth — `stale` took a
  **Clock** icon so it stays shape-distinct from `warning`, which now shares its
  colour. Also fixed in the same pass: the destructive button was white on
  `#D67A7A` (3.0:1) and is now white on `#B03A2E` (6.0:1) in both themes; the
  dashboard's "Open" affordance was a bare `<Text onPress>` about 34pt tall in
  `--ring` (3.5:1 light) and is now a 44pt `Pressable` with a haptic and a
  themed link colour (8.6:1 light, 11.9:1 dark); 33 half-step spacing utilities
  moved onto the 4/8 grid; the status-pill icon went 13px → the systems's 16px;
  and the last five hardcoded hexes left the components. **Deferred, and still
  open:** the app is on Inter, not DM Sans, and `title`/`heading` now share the
  16px step — moving to the seven named steps (page title at `text-display`
  28px, KPI weight 700) needs the DM Sans font package and is a separate job.
  `mobile/` has no working ESLint config (`expo lint` tries to fetch one), so
  `npx tsc --noEmit` remains the only gate there.
- **Closed 2026-09-04 — chart series legible in dark mode.** The 2026-09-03
  technical audit (`docs/audits/2026-09-03-technical-audit.md`) found brand
  purple `#4E4456` rendering at 1.99:1 on the dark card, so the primary series
  of every purple chart (`chartTheme.series[0]` on Water; legacy
  `--chart-brand` on the STP inlet area, dashboard STP bars and Electricity)
  vanished in the control room's primary theme. `app/design-tokens.css` now
  routes `--color-chart-1/3/5` through the semantic layer with dark values
  `#8B7F94` / `#6B9AC4` / `#A98BD1` (light values unchanged), and
  `globals.css` `.dark` lifts `--chart-brand` to the `#8B7F94` that
  `--chart-5` already used. All seven v2 series clear 4.5:1 on `#16141B`.
  Recorded in `DESIGN_SYSTEM.md` §2.4. The rest of the audit's findings
  (12 P1, 19 P2, 9 P3) remain open and are listed in that report.
- **Design-system migration in progress (2026-09-02).** Only Water is on
  v2.0. Until the last page migrates, `app/globals.css` keeps the legacy
  `:root` / `.dark` variables and `@theme` entries, plus a `bg-muted-bg`
  alias: the kit's `--color-muted` is the muted *text* colour (`text-muted`),
  so the legacy pages' `bg-muted` surface was renamed `bg-muted-bg` (a pure
  rename, no visual change). The shadcn `button.tsx` / `badge.tsx` remain
  beside the kit's `mb-button.tsx` / `mb-badge.tsx` for the same reason. The
  design lint (`eslint.design-rules.mjs`) is scoped to `app/water/**` and
  `components/water/**`; each migrated page adds its folders. Two Water files
  are no longer referenced by the page but are kept pending the owner's
  approval to delete: `components/water/date-range-picker.tsx` (still has
  its test) and `components/shared/period-filter-panel.tsx`. Three legacy
  pages (`/pest-control`, `/forgot-password`, `/auth/callback`) used
  `text-muted` while it still meant a light *surface* colour — their captions
  now render in the intended muted grey. **Backlog from the 2026-09-03 QA
  audit (each item belongs to that page's migration session, not to a
  one-off fix):** (a) five card treatments and three corner radii coexist —
  `SectionCard` 10.5 px on Water, `.card-elevated` 7 px on Dashboard/STP/
  Electricity/Settings/Pest, shadcn `Card` 12 px on Fire/HVAC, raw
  `rounded-[10.5px]` on Contractors/Assets; (b) STP is the only page whose
  top-level strip is `variant="secondary"` — under the §7 ruling every
  single-strip page should be, so Electricity, HVAC, Contractors, Assets, Fire
  and Settings switch when they migrate; (c) the KPI row sits above the tabs
  (Contractors), below them (STP) or inside one tab (HVAC, Assets, Fire,
  Electricity) — `DESIGN_SYSTEM.md` §5 says tabs → StatsGrid; (d) load
  failures on Electricity, STP, Assets and Fire surface only as small text
  under the status chip with no Retry, and STP has no empty-table state;
  (e) the dashboard shows two live/offline indicators (deck badge + ticker)
  and Pest Control none; (f) page titles differ from the sidebar names
  ("Electricity Monitoring", "Contractor Management", "Assets Register",
  "Fire Safety Management"); (g) two page-header and two breadcrumb components
  exist until the last page migrates; (h) `components/shared/hierarchy-stat-card.tsx`
  is now referenced by nothing (kept pending approval to delete); (i) the
  Recharts "width(-1) and height(-1)" dev-console warning fires on every chart
  rendered with `height="100%"` (dashboard, Electricity, Water daily) — cosmetic
  in production, but a chart-plumbing fix, not a design one. Arbitrary-value
  counts per page (migration effort, highest first): Electricity 54, STP 52,
  Fire 47, Contractors 38, HVAC 35, Dashboard 28, Assets 23, Pest 4, Settings 0,
  Water 0. One phone-width limitation is by design: the kit `PageHeader` keeps
  a fixed height and truncates its one-line description below ~640 px.
- **Closed 2026-09-03 — Water Daily cumulative balance chart removed.** It
  counted a missing L2 reading as 0 supply (`buildZoneMtd`, `cs += p.l2 ?? 0`
  while the day's ΣL3 was still added) and was the running sum of the "Zone
  daily consumption trend" chart above it. The owner chose removal; the
  month-to-date loss now lives in the trend card's footer, computed only over
  days with a bulk reading, and the freed half of the row carries the new
  "Where the water went" composition chart (see the Water — Daily row in §2).
  `buildZoneWatch` still sums `l2 ?? 0` for the fleet table's MTD columns —
  same missing-as-zero shape, flagged here for the Zone Watch session.
- **Daily module convention — ΣL3 counts an unread L3 meter as 0** (raised by
  CodeRabbit on PR #79, 2026-09-03). `buildZoneDaySeries`, `processReport` (the
  gauges), the L3 table, the Exceptions register and the new day-composition
  chart all sum the L3 meters that were read and compute loss as L2 − ΣL3, so
  an unread meter's use sits inside the unmetered figure. Declaring the balance
  "not computable" whenever any one of a zone's 17–81 meters is missing would
  blank most days, so the convention stands for now; the composition chart's
  loss bar is labelled "Unmetered (n unread)" and its footer counts the unread
  meters. Whether to change the convention module-wide is the owner's call.
- **Google sign-in ships dark until its provider is enabled in Supabase
  (2026-08-28).** `/login` and `/signup` now carry a "Continue with Google"
  button (`components/auth/google-sign-in-button.tsx` →
  `signInWithGoogle()` in `lib/auth.ts` → Supabase OAuth → the existing PKCE
  exchange in `/auth/callback`, which gained an `oauth` flow variant with
  Google-specific copy and an in-place retry). One flow covers sign-in AND
  first-time sign-up: Google has already verified the address, so new users
  skip the confirmation-email round-trip, and the DB-side
  `on_auth_user_created` trigger creates their `profiles` row (default role
  `user`, Google name/avatar from `raw_user_meta_data`) exactly as for email
  signups — no schema change needed. The code path is live but INERT until a
  one-time dashboard setup: (1) Google Cloud Console → create an OAuth 2.0
  Web client with authorised redirect URI
  `https://utnlgeuqajmwibqmdmgt.supabase.co/auth/v1/callback`; (2) Supabase →
  Authentication → Sign In / Providers → Google → enable and paste the client
  ID + secret; (3) Supabase → Authentication → URL Configuration → confirm
  `https://muscatbay.work/auth/callback` (plus www/vercel aliases) sits in
  the redirect allow-list (the email flows already use this URL). Until then
  the button surfaces Supabase's "provider is not enabled" error, mapped to a
  friendly "Google sign-in isn't switched on for this app yet" message —
  nothing breaks, nothing is faked.
  **Update 2026-08-28 (later):** the owner created the Google OAuth client
  (project `muscat-bay-410005`, verified remotely: Google serves the sign-in
  page for it with the Supabase callback) and enabled the provider in
  Supabase — Google sign-in works on the PR preview. ONE step remains: the
  Google consent screen is still in **Testing** (only listed test users can
  sign in) until the owner publishes it, which needs the app's public URLs —
  home `https://muscatbay.work`, privacy `https://muscatbay.work/privacy`,
  terms `https://muscatbay.work/terms`. To make those last two genuinely
  public, `/privacy` and `/terms` were added to the auth provider's
  `PUBLIC_ROUTES` (they were login-gated — a signed-out visitor, including
  anyone checking the consent-screen links, bounced to `/login`) and to a new
  `OPEN_WHEN_AUTHENTICATED` list so signed-in users can read them too
  instead of being bounced to `/`. The OAuth callback is built from
  `window.location.origin` (not `NEXT_PUBLIC_SITE_URL`): the PKCE verifier
  is host-scoped, so the round-trip must stay on the origin that started it
  — meaning every origin that should offer Google sign-in (canonical, www,
  vercel alias, previews) must be in Supabase's redirect allow-list.
  **Update 2026-08-28 (later still): the double-redemption bug is fixed.**
  With the provider live and the host canonicalised, sign-in still ended on
  "Google sign-in didn't work" every time — and the session had in fact
  been created. Two things redeemed the single-use PKCE code: GoTrue does
  it itself from its own constructor (`detectSessionInUrl` is on, and the
  browser client is built during the `/auth/callback` page load, while the
  code is still in the URL), saving the session and DELETING the code
  verifier; `/auth/callback`'s own `exchangeCodeForSession()` awaits that
  same initialisation, so it always ran second, found no verifier, and
  failed with "PKCE code verifier not found in storage" → the OAuth error
  card. The flag **cannot** be turned off from app code: `@supabase/ssr`'s
  `createBrowserClient` spreads `options.auth` first and then hardcodes
  `detectSessionInUrl`, so passing it is silently discarded. So
  on a failed PKCE exchange `/auth/callback` now forgives it **only
  when both** are true: the error says the verifier was already spent
  (`/code.verifier|flow.state/i`) **and** `getSession()` returns a live
  session. Together those mean something else completed that exact
  exchange. Any other failure still reports. Deliberately narrow — an
  earlier cut forgave *any* failed exchange whenever a session existed
  and also covered the `token_hash` email flows, which would have
  silently carried a signed-in user on from a genuinely expired link
  instead of telling them it expired. `detectSessionInUrl` never
  inspects `token_hash` (only the implicit hash and PKCE `?code=`), so
  there was no race to tolerate there; that branch reports as before.
  A `handledRef` guard runs the handler once per mount, so a re-run
  effect cannot re-spend a single-use credential. Two test layers:
  `__tests__/pages/auth-callback.test.tsx` covers the page's logic
  (with the auth client stubbed), and
  `__tests__/functions/pkce-double-redemption.test.ts` pins the *library*
  behaviour that logic exists to survive — it drives the real
  `@supabase/ssr` + `@supabase/auth-js` with only the network mocked, so a
  dependency bump that changes any of this fails there instead of
  silently breaking sign-in in production again.

- **`?next=` on /auth/callback was an open redirect, now closed
  (2026-08-28).** The post-auth destination was read straight from the
  query string and handed to `router.push()`, so
  `/auth/callback?next=https://evil.com` bounced a user off this origin
  at the moment they had just authenticated — a phishing hand-off out
  of the app's own sign-in, and the same hole pointed inward with a
  `javascript:` value. Pre-existing, found by a review bot on #71.
  `safeNext()` in `lib/validation.ts` now reduces the value to an
  internal path or `/`, rejecting any scheme, protocol-relative `//`
  or `/\`, and anything not rooted; `/auth/callback` sanitises once at
  the single point it reads the param, so all five `router.push(next)`
  sites are covered. A rejected value is not an error screen — sign-in
  did succeed, so it lands on the dashboard rather than stranding the
  user on a failure card over a destination they never chose. Tests:
  `__tests__/lib/auth-next-redirect.test.ts`.

- **Water monthly dashboard tables still bespoke (2026-08-24).** The A1
  reconciliation, per-zone meters, meter database and exceptions register in
  `components/water/monthly/water-monthly-dashboard.tsx` render raw `<table>`
  markup with inline token styles that *visually* match the unified table
  system (the `.ops-table` CSS was modelled on them) but bypass the `<Table>`
  primitives, use the `RowsPicker` truncation instead of `TablePagination`,
  have no column sorting, and export via `downloadRows` rather than
  `ExportButton`. Same for the `inline-shared.tsx` mini-library (its `Th` /
  `TableSearch` / `TablePagination` shadow the shared ones) used by the daily
  DC/L3 matrices. Functional gaps were closed in the 2026-08-24 pass (all now
  export; heavy tables keep their caps); the structural migration is deferred
  — it is a large, behavior-sensitive refactor of the app's most bespoke
  module.

- **Ticker always scrolls + STP down to four cards — 2026-07-29 (owner follow-up).**
  - **The "static when everything fits" ticker rule is retired.** The
    2026-07-26 jam fix held the strip still whenever one run was narrower than
    the viewport — geometrically correct, but the owner's verdict is that a
    news band should always be moving. `useTickerLoop` now satisfies the same
    seamlessness constraint the way a news channel does: the run is
    **repeated** (`repeat = ceil(viewport / run)` copies per half-track, both
    tickers render `2 × repeat` runs) so half the track always covers the
    viewport, and the strip always scrolls at the constant 26 px/s. Duration
    derives from the travelled distance (`repeat × runWidth`). Copies after
    the first are `aria-hidden` (read aloud once); under
    `prefers-reduced-motion` the CSS hides every hidden copy, so the repeat
    never shows duplicated stats — one still, swipeable run. `data-static`
    now means "unmeasured yet" only. Geometry tests updated (6 cases).
  - **STP summary: 5 → 4 cards** (Inlet Sewage, TSE for Irrigation, Tanker
    Trips, Total Economic Impact — one clean 4-across row). Treatment
    Efficiency stopped being a card: it is TSE ÷ inlet, so it now rides on the
    TSE subtitle ("N% of inlet recycled") and remains the LEAD health card on
    the Plant Watch tab with its target bands intact.
  - **Note for testers**: on a device with iOS/macOS "Reduce Motion" enabled
    (as on the iPad in the 2026-07-29 screenshots) the ticker deliberately
    does not auto-scroll — that is the OS accessibility contract, and the
    strip is swipeable instead. Turn off Settings → Accessibility → Motion →
    Reduce Motion to see the marquee.

- **Ticker pace/size + Electricity/STP KPI de-clutter — 2026-07-29 (owner request).**
  - **Ticker**: scroll speed lowered 40 → 26 px/s (`hooks/useTickerLoop.ts` —
    the speed constant is the single source; the pace test derives from it) and
    the band sized up: 34 → 42px min-height, label 10 → 11px, value 12.5 →
    14px, caption 9.5 → 10.5px, icons 14 → 16px. Applies to all four strips
    (Estate briefing, Water Daily briefing, Load briefing, Plant briefing) via
    the shared `mb-ticker-*` classes. Still a single-line news band.
  - **Electricity Load Watch**: the category health grid no longer renders all
    10 meter-type cards (a 2×5 wall). Cards are budgeted for triage: every
    non-healthy category ALWAYS gets its own card (a warning is never folded),
    the biggest quiet categories fill up to 5, and the remaining quiet ones
    collapse into one combined "Other categories (N)" card. Every category
    still has its own row in the heatmap directly below, so nothing is lost.
    Grid is now xl:3-across (wider, calmer cards).
  - **STP summary**: 8 KPI cards → 5. Nothing dropped — three figures stopped
    being headline cards: Daily Average Inlet folded into the Inlet Sewage
    subtitle; Generated Income + Water Savings folded into the Total Economic
    Impact subtitle (the total is their sum — three cards were saying one
    thing). The monthly financial chart still plots income and savings as
    separate series.

- **"Water section crashed" + "ticker ballooned" QA report — diagnosed and fixed 2026-07-29 (second pass).**
  Two screenshots from an operator's iPad, taken minutes after the 01:46 UTC
  production deploy. Neither was what it looked like:
  - **The /water "unexpected error" was the deploy race, not a water bug.** A
    PWA session opened before a deploy still references the old content-hashed
    chunk URLs; the first navigation to a not-yet-visited route requests a
    chunk the new deployment no longer serves → the rejected dynamic import
    lands in `app/error.tsx`. Proven not to be data-driven: both water views
    were rendered in a jsdom harness against the **full live production
    dataset** (350 meters × 30 months monthly; 350 Jul-26 daily rows, all five
    tabs) with zero throws. `sw.js`'s own v5 history note records this exact
    class. Fixes: `app/error.tsx` now detects stale-chunk errors and reloads
    once automatically (sessionStorage guard against loops, re-armed on clean
    boot by `register-sw`); `register-sw.tsx` re-checks for a new SW every
    30 min and on visibilitychange, so long-lived control-room sessions adopt
    new builds before an operator trips on one; both `/water` views are now
    wrapped in `SectionBoundary` so a genuine render fault degrades to a
    section panel instead of blanking the route.
  - **The ticker was the reduced-motion fallback, not a regression of the
    2026-07-26 fix.** That iPad has "Reduce Motion" on. The
    `prefers-reduced-motion` CSS wrapped the stats (`flex-wrap: wrap`),
    ballooning the 34px news band into a 4-row block. Reduced motion now stops
    the *auto*-scroll only: the band keeps its single-line shape and the
    off-screen tail is reachable by swipe (`overflow-x: auto`, scrollbar
    hidden) — a user-initiated gesture is not the motion the OS setting asks
    us to remove.
  - **Perf: `/water` first paint.** `fetchWaterMeters` walked the ~10.5k-row
    consumption table in 11 **sequential** 1000-row pages — ~11 back-to-back
    round-trips to ap-northeast-1 was most of the first-visit delay. It now
    HEAD-counts and fetches all pages in parallel (~2 round-trips total,
    independent of how many months accrue).

- **Mobile "missing sections / crash" incident — diagnosed and fixed 2026-07-29.**
  Reported after a colleague tested the PWA on their phone on 2026-07-28: the
  bottom navigation did not show all sections, some sections would not open, and
  the app "crashed and restarted from the beginning". **None of it was a crash.**
  All three symptoms were one root cause, confirmed against the live database:
  - That colleague's account was created **2026-07-28** and carries the role
    **`viewer`** — which is also the `profiles.role` column default, so it is
    what *every* new sign-up gets. `ROLE_MODULES.viewer` listed only dashboard,
    water, electricity, stp and settings.
  - **Symptom 1** — the Modules sheet in `components/layout/bottom-nav.tsx`
    filters through `canAccessModule`, so it rendered **3 of 8** modules.
    (The dock itself is always 4 fixed tabs: Overview / Modules / Alerts /
    Profile.)
  - **Symptom 2 + 3** — `components/dashboard/module-coverage.tsx` was **not**
    RBAC-filtered. It rendered `<Link>` cards for exactly the five modules a
    viewer cannot open. Tapping one hit `RouteRoleGuard`, which showed a
    "Module not available" panel and then **auto-redirected to `/` after 4 s**.
    Tap a module → it does not render → seconds later you are back at the start
    screen. That is the "crash and restart".

  Fixes, all in the 2026-07-29 change:
  - **`lib/rbac.ts` — every role now sees every module**, per the owner's
    instruction that all users may view all sections. The per-role split is gone
    rather than patched, so a new sign-up needs no manual promotion. The `Role`
    type and the gating machinery stay in place for future use.
  - **`components/dashboard/module-coverage.tsx` now applies the same RBAC
    filter as the sidebar and bottom nav**, so all three navigation surfaces
    agree and the dashboard can never again offer a door the guard slams.
  - **`components/auth/require-role.tsx` no longer auto-redirects.** Navigating
    the user away from a page they asked for, with no input from them, is what
    made a permissions block read as a crash. The panel now explains and offers
    an explicit button.
  - **`__tests__/lib/rbac.test.ts`** (14 tests) locks all of the above in.

- **`AbortSignal.any` was unguarded on older iOS — fixed 2026-07-29.**
  `functions/supabase-client.ts` wrapped every Supabase request in
  `AbortSignal.any([...])`, which landed in **Safari 17.4** (and Chrome 116 /
  Firefox 124). On an older iPhone that threw a `TypeError` inside *every*
  Supabase call, auth included — a whole-app failure that would look exactly
  like "sections don't render on his device but work on mine". `AbortSignal.timeout`
  (Safari 16) had the same exposure. Both are now feature-detected, falling back
  to Supabase's own signal rather than throwing. This was **not** confirmed as a
  cause of the 2026-07-28 report — the RBAC chain above fully explains it — but
  it is a real hazard on any device below those versions.

- **✅ CLOSED 2026-07-29 — Supabase RLS let any signed-in account become an admin.**
  Found 2026-07-29 by reading the **live** state of project
  `utnlgeuqajmwibqmdmgt` (not the migration files — the two disagree).
  `public.profiles` carries the correct anti-self-elevation policy
  (`"Users can update own profile"`, whose `WITH CHECK` pins `role` to its
  current value) **and** a blanket `mb_authenticated_all` (`ALL`, `USING true`,
  `WITH CHECK true`). Postgres **OR**s permissive policies, so the blanket one
  wins outright: any logged-in user can run
  `update profiles set role='admin' where id=auth.uid()` and self-promote — and
  can rewrite every other user's row. That makes `lib/rbac.ts`'s `viewer`
  default and the whole `ROLE_MODULES` gate unenforceable.
  **Applied to the live project on 2026-07-29** (migrations
  `rls_regression_fixes_20260729` + `revoke_secdef_execute_from_public_20260729`).
  Verified afterwards: `mb_authenticated_all` is gone and only the three scoped
  policies remain, so `role` can no longer be self-edited.

- **🟠 OPEN — RBAC is presentation-only.** 68 tables grant `authenticated` a
  blanket `ALL / USING true / WITH CHECK true`. A `viewer` (board-presentation
  profile) or `contractor` account is hidden from modules in the sidebar but can
  still read **and write and delete** every table through the REST API with its
  own session token. Closing this is a real behavioural change (a demoted
  account loses write access), so it is deliberately left out of the
  2026-07-29 migration and sketched at the bottom of that file instead — it
  needs a per-module decision on who may write.

- **✅ CLOSED 2026-07-29 — `water_monthly_consumption_backup_20260727` had RLS disabled.**
  The only table in `public` without RLS, so it is readable *and writable* by
  `anon` — i.e. by anyone holding the public anon key, which ships in the client
  bundle. It carries `account_number`. Created by migration `20260727061805`,
  which post-dates the 2026-07-18 hardening pass and so was missed by it.
  RLS is now enabled with no policy, denying anon and authenticated while
  leaving `service_role` (restore-from-backup) working.

- **✅ CLOSED 2026-07-29 — 13 SECURITY DEFINER functions were callable by `anon`.** Reachable
  unauthenticated at `/rest/v1/rpc/<name>`; the write-capable ones
  (`stp_upsert_operations`, `sync_grafana_water_consumption`,
  `aggregate_daily_to_monthly`, …) let an anonymous caller mutate operational
  data. None is called from the browser.

  **This one bit back and is worth remembering.** The first migration ran
  `revoke execute ... from anon` — a silent no-op. These functions carry the
  default `EXECUTE TO PUBLIC` grant (the `=X/postgres` entry in
  `pg_proc.proacl`), and `anon` inherits through PUBLIC; revoking from a *role*
  never removes what it holds *via PUBLIC*. Post-apply verification caught it —
  `anon` still had all 13 — and a second migration revoking from PUBLIC closed
  it properly. **Verify a REVOKE with `has_function_privilege(...)`; do not
  assume it did anything.** `service_role` (edge functions) and `postgres`
  (all four cron jobs) keep EXECUTE, so automation was never at risk;
  `authenticated` deliberately keeps it too, since the exposure was
  unauthenticated reach.

- **🔵 OPEN — dashboard-only auth settings.** Leaked-password protection
  (HaveIBeenPwned) is off, and signup restrictions are unconfirmed. Neither can
  be changed from SQL or the Management API — they are Supabase dashboard
  toggles and are the last items needing the owner. See `SECURITY_REMEDIATION.md`.

- **Net effect of the 2026-07-29 database work.** Supabase's security advisor
  went from **126 findings to 90**. Of the three ERROR-level items, two are
  closed; the remaining one is the `water_meters_hierarchy` SECURITY DEFINER
  *view* (a read-only helper, deliberately left alone). What remains is
  dominated by the 67 `rls_policy_always_true` hits described in the next
  item — the deliberate, product-decision-gated one.

- **Mock-data substitution removed from the last three live paths — 2026-07-29.**
  The 2026-07-25 pass caught the login screen, `/water` and `lib/water-data.ts`,
  but three sites survived and were still swapping fabricated figures in front
  of operators:
  - **`hooks/useDashboardData.ts` was the worst of them, because it substituted
    *partially*.** `isLiveData` was set true if **any one** of the four fetches
    succeeded, then `if (stpData.length === 0) stpData = await getSTPOperations()`
    filled the gaps with demo numbers. So a deck where water and electricity
    read fine but STP came back empty rendered invented STP inlet, TSE and
    revenue figures **under a green "Live Data" badge** — unfalsifiable from the
    UI. Now: demo data loads only when Supabase is unconfigured; a failed read
    is named in an error banner; an empty source renders `—` / "No reading", not
    `0.0k m³`; and a partially-failed deck is no longer written to the session
    cache.
  - **`app/electricity/page.tsx`** swapped in `MOCK` meters on a failed *or
    empty* fetch. Now mirrors the STP page's pattern (which was already correct
    and is the reference).
  - **`app/assets/page.tsx`** rendered a demo asset register on fetch failure.
    Now shows the failure.

- **Four readers queried tables that do not exist — removed 2026-07-29.**
  `getAmcContracts/Expiry/Contacts/Pricing` in `functions/api/contractors.ts`
  read `amc_contracts`, `amc_expiry`, `amc_contacts` and `amc_pricing`. The real
  tables are `amc_contractor_details/expiry/pricing/summary`. Every call had been
  failing and returning `[]` behind a `console.error`. Nothing in the UI called
  them, so nothing broke — but they were four live examples of the swallow-the-
  error pattern. Deleted along with their now-unused `entities/contractor.ts`
  types and `lib/supabase.ts` re-exports.

- **Ticker loop fixed — 2026-07-26. It was jamming on wide screens.**
  The `mb-ticker-*` strips hold two identical copies and animate
  `translateX(0 → -50%)`, i.e. they shift by exactly one copy's width `W`. For
  the viewport `V` to stay covered at the worst point of the cycle you need
  **`W >= V`**. Measured in the browser at 1440px: the strip was **1232px** wide
  holding a **440px** run — so the content slid off and left an ~800px blank gap
  before snapping back. That is what "the ticker is jammed" meant. It looked
  fine on a phone (182px viewport) purely because the run exceeded it there, so
  the bug was invisible on mobile and obvious on a desktop.
  CSS cannot measure, so the rule now lives in `hooks/useTickerLoop.ts`, used by
  both `InspectionTicker` and the Water `DailyBriefing`:
  - **Only scroll when scrolling reveals something.** If `W < V` every stat is
    already on screen; the track gets `data-static="true"`, the duplicate copy
    is hidden and the edge-fade mask is dropped (it was clipping the first
    label). Static never means hidden — all stats still render.
  - **Constant speed, not constant duration.** The fixed 36s made a short run
    crawl at ~12px/s and a long one race; duration is now derived from width at
    40px/s.

- **Briefing strips restyled as a news band — 2026-07-26.** Both tickers now
  read like a TV channel's breaking-news strip: a slim rectangular band with a
  solid caption block on the left and one line of stats beside it. The height
  came down from ~68px to **34px**, and the reason it was tall is worth
  recording — each stat stacked its label *above* its value, so the strip was
  inherently two lines. Stats are now single-line (`.mb-ticker-label` +
  `.mb-ticker-value`), which is what makes the band shape possible.

- **AMC register cutover — 2026-08-04. `Contractor_Tracker` retired as a source.**
  The owner's *Muscat Bay AMC Contract Register* (evidence review 04-Aug-2026)
  became the sole active AMC source, per its own **ACT-012** ("make the AMC
  Register the sole active source; keep one restricted read-only audit snapshot
  until evidence completion", owner: Application / Database).

  The cleanup on 2026-07-26 below fixed *duplication*. It could not fix the
  deeper problem, which the evidence review exposed: **the surviving rows
  asserted commercial figures no document supports.** `Contractor_Tracker` showed
  National Marine as Active at 57,093.12 OMR/yr when no formal contract exists at
  all; Muscat Electronics at 10,461.84 OMR/yr against a 1,071 proposal for an AMC
  that expired 02-Jun-2026; Kalhat at 386,409.718 OMR/yr with no executed
  contract ever located. `contractor_contracts` disagreed with it on the same
  contracts (Muna Noor 1,680 vs 16,000; Tadoom 2,211.60 vs 184.30) and the two
  had no join key, so neither could be reconciled against the other.

  Database (Supabase, all authenticated-only RLS): `amc_register` (10 agreements,
  typed `date`/`numeric`), `amc_open_actions` (12), `amc_excluded_leads` (5 —
  records *why* Tadoom, BUDGET, Iron Mountain, Al Nabaa and the two revenue
  agreements are out), `amc_historical_nouf_2025` (9, audit only).
  `amc_contractor_summary` and `amc_contractor_expiry` were **empty tables the app
  already read**; they are now **views over `amc_register`** (`security_invoker`),
  so they cannot drift from it — this is what finally lit up the Renewals panel,
  which had been rendering its "table holds no rows" fallback since it was built.

  App: `entities/contractor.ts` gains `AmcRegister` + `toTrackerRow()`;
  `getAmcRegister()` is the typed reader and `getContractorTrackerData()` now maps
  through it, which repoints the AMC grid, `useDashboardData` and
  `useOperationalAlerts` in one place rather than rewriting the 1,258-line page.
  Both realtime subscriptions moved to `amc_register`.
  **`ContractorTracker` remains the grid's view model but is `@deprecated` as a
  data source — never read that table again.**

  Two traps worth keeping: `getContractorCounts()` had to become a **prefix**
  match (`ilike 'Active%'`), because the register's own wording includes
  "Active — terms partial" / "Active — term conflict"; the old `.eq('Active')`
  counted 4 of 8 engaged agreements. And **null fee/date means "not evidenced",
  never zero** — only one fee (KONE 11,550) survived review, so ten rows render
  "—" by design. Do not backfill them from the legacy tables.

  Still legacy: the **Contracts tab and the page-header KPIs** read
  `contractor_contracts` (13 rows, includes 2 revenue agreements that belong in a
  revenue register). Not yet repointed.

- **`Contractor_Tracker` cleaned and keyed — 2026-07-26. 42 rows → 19.**
  Management reported unrecognised and duplicated contractors. The table held
  **42 rows for 19 real contracts**, and the root cause was structural: it had
  **no primary key and no uniqueness constraint**, so nothing stopped the same
  contract being inserted twice.
  - **21 unrecognised contractors deleted.** Several were plainly corrupted
    copies of real rows — `Gulf Egypt` ← Gulf **Expert**, `Ras Mountain` ←
    **Iron** Mountain, `Ocean Prime Manufacturing Om` ← **Oman Pumps**
    Manufacturing, `ACME Arabian … "Fit" Maintenance` ← "**Lift**". Two shared
    an identical corruption fingerprint — `OMR/hr` and `VTE` (for VAT), which
    appear nowhere else in the table.
  - **The STP contract was triplicated.** `(CWAN)`, `(OWATCO)` and `LLC` all
    carried *Comprehensive STP Operation and Maintenance* with overlapping
    dates and two different annual values. Email evidence settled it: order ref
    **`MB/COM/L 980-2024` dated 26/01/2024** (contract `CO-SBJ-24-0231`, 750
    m³/day MBR plant) matches the `(OWATCO)` row exactly, and OWATCO's own
    statement of account shows monthly O&M invoices of **3,229.821** (Jan-26)
    and **3,355.795** (Mar-26). That reconciles with 3,103.8/month ex-VAT →
    **37,245.4/year**. The `389,400` figure would require ~32,450/month —
    **ten times** what is actually invoiced — and clusters within 1% of the two
    Facility Management values (Kalhat 386,409.718, Nasco 389,468), i.e. it was
    import noise, not an STP cost. **The STP annual figure is 37,245.4 OMR.**
  - **Statuses corrected:** Celar Water, COMO and Rimal Global → `Canceled`.
    KONE Hiessen and Muscat Electronics → `Expired`; both were flagged `Active`
    with end dates already past (28 Feb 2025 and 2 Jun 2026), which is
    arithmetic rather than a business judgement.
  - **Structure fixed:** added an identity `id` primary key plus a unique
    constraint on **(Contractor, Service Provided)** — the pair, not the
    contractor alone, because Gulf Expert legitimately holds two AMCs. Verified
    by attempting a duplicate insert, which is now rejected with `23505`.
  - **Full pre-change snapshot retained** in `Contractor_Tracker_backup_20260726`
    (all 42 original rows). Every change above is reversible from it.
  - Still unverified and carrying no dates or values: **Genetco** and
    **Uni Gaz**. KONE Hiessen's stored `16,200` also came from a malformed
    `OMR/hr (inc VTE)` cell and should be re-checked against the contract.

- **June 2026 NAMA main-bulk reading — entered 2026-07-19: 57,932 m³**
  (`MB-L1-001`, account `C43659`). This is the NAMA-billed figure from the June
  invoice; it replaced a provisional 59,574 m³ that had been entered 2026-07-04
  (before the bill arrived). Note: `C43659` is the *account number* — the meter_id
  is `MB-L1-001`; an earlier audit query that filtered on `C43659` as the meter_id
  wrongly reported June as "missing". The main-bulk meter is under an active
  over-billing dispute with NAMA, so this figure is the *invoiced* volume, not
  necessarily the true measured supply.
- `Water_System` (underscore) table is an abandoned pre-v2 orphan (columns end
  Feb-26) — not read by anything; candidate for cleanup.
- **Security audit + hardening 2026-07-18 — APPLIED LIVE.** Findings + the
  remaining owner actions are in `SECURITY_REMEDIATION.md` (repo root). Applied to
  the live DB via `sql/migrations/20260718_security_hardening.sql` +
  `_part2.sql`: RLS tightened so the **anon (public) key can no longer write any
  table** (only the public contractor-application form + scoped own-profile insert
  remain), RLS enabled on the 5 previously-open tables (**0 public tables now
  lack RLS**), `profiles` reads restricted to signed-in users + role
  self-elevation blocked, avatars scoped to each user's folder with a 2 MB/MIME
  limit, and a DB trigger rejects future-dated STP rows. Code (merged to `main`):
  scripts read the `service_role` key from env, `normalizeRole` defaults to
  `viewer` (existing users grandfathered to admin → zero lockout), avatar uploads
  validated + de-orphaned. **Still owner-only (not doable via MCP):** rotate the
  leaked `service_role` key (it bypasses RLS, so it stays dangerous until rotated)
  + purge it from git history; enter the June-2026 NAMA reading; enable
  leaked-password protection; retire the `stp-debug` edge function. Automation is
  unaffected (syncs write via `service_role` / SECURITY DEFINER, bypassing RLS).
- Supabase advisors before hardening (2026-07-18): 133 security / 150 performance.
  After: RLS-disabled (5→0), and **the public anon key can no longer read or write
  any business/PII table** (verified by simulating the anon role — all reads
  return 0; only `professional_applications` INSERT + scoped `profiles` INSERT
  remain anon-accessible by design). Authenticated reads/writes verified intact
  across every module. Residual lower-severity items: mutable function search
  paths, 4 security-definer views, leaked-password protection still off.
- **Database / backup + electricity audit 2026-07-21 — see
  `muscatbay/app/ELECTRICITY_DATA_AUDIT.md`.** Reconciled `electricity_readings`
  against the owner's master spreadsheet
  (`Muscat_Bay_Coast_Electricity_Master_Apr24Apr26.xlsx`): a full row+column
  checksum match proved **the DB already equals the master** (grand total
  3,137,845.2 kWh; identical 60-meter roster and every month). Only 3 cells
  differed (Helipad / Lifting Station 02 / Zone-3 light 17 May-26 `0`→`NULL` =
  "not in service") — reconciled live
  (`sql/migrations/20260721_reconcile_electricity_to_master.sql`). So the odd
  electricity values (Beachwell Jan-26=0 & Mar-25=40, "Bank muscat" Sep-24=**−2**,
  "Bank muscat"+"Bank Muscat ATM" both **744** in Dec-25) are **in the master
  itself** — source-data items to fix at source, NOT DB corruption
  (`sql/fixes/electricity_source_review_20260721.sql`). **Security (3 live holes,
  all closed):** the `*_backup_20260720` Gulf Expert tables had RLS disabled
  (295/12/4 rows anon-readable) — secured then **dropped**; and 3 of the 4
  `v_electricity_*` views were SECURITY DEFINER, leaking consumption to the anon
  key (270/27/60 rows) — switched to `security_invoker`, anon now 0
  (`…_harden_electricity_views_drop_ge_backups.sql`). **Contractor data-loss — RESTORED:**
  `Contractor_Tracker` had dropped from 47 rows to 18 (26 lost contractors — not
  dedup; 18 Active incl. COSMO 562k, Nasco 389k, OWATCO LLC 389k). Restored **24**
  deletions (live 18 → **42**; value ~660k → ~**1.55M OMR/yr**) via
  `…_restore_lost_contractors.sql` + `…_restore_kone_hiessen.sql`. Ambiguities resolved
  with owner: KONE Hiessen restored (distinct); COSMO not restored (COMO/COSMO is
  Expired); "Future Cities (Tadoom)" left out (dup). Contractor backups KEPT until
  past-dated Active statuses are tidied. **Code:** `functions/api/electricity.ts`
  no longer coerces NULL→0 (missing ≠ zero, per the master's empty-vs-0 rule);
  188 tests pass. **Also flagged:** STP 2025 has 1 negative TSE reading;
  `v_electricity_monthly_pivot` hardcodes months.
- Capacity (2026-07-18): DB **28 MB / 500 MB** (5.7%), Storage **3.1 MB / 1 GB**
  (0.3%) — Free plan, ample headroom, limit not being approached.
- Monthly loads for electricity/STP still arrive via hand-run SQL in
  `sql/migrations/` — same class of manual step water had before 2026-07-03.
- **STP future-dated row — RESOLVED 2026-07-18.** The stray `2027-05-06` row
  (which had re-synced from AITable on 2026-07-07) was deleted from both
  `stp_operations` and `stp_daily_reports`, and a DB trigger
  (`stp_reject_future_dates`, in `_part2.sql`) now silently drops any row dated
  after "today" in Oman on both tables — so it cannot re-appear via the daily
  AITable sync. Max STP date is back to the correct latest real day. For full
  cleanliness the record should still be corrected in the AITable source
  (datasheet `dsteHeHSeZ59QTougo`). The in-progress current month (Jul-26) is
  legitimate live daily data and is kept as-is.
- **Design-system debt found in the 2026-07-25 consistency pass (reported, not
  fixed — none of it is user-visible today):**
  - `muscatbay/app/tailwind.config.ts` is **dead configuration**. Tailwind 4 only
    loads a JS config via an explicit `@config` directive, and `globals.css` has
    none — so the `fontSize` / `borderRadius` / `boxShadow` / `colors` blocks in
    that file have no effect. Fonts and tokens actually come from the
    `@theme inline` block in `app/globals.css`. `DESIGN_SYSTEM.md` §3 and
    `CLAUDE.md` both describe the config as wired; either delete the file or add
    `@config "../tailwind.config.ts";` — do not "fix" the docs to match.
  - `ExceptionsRegister` in `components/shared/inspection.tsx` is now unused
    (every module renders `components/inspection/findings-register.tsx`), but it
    still hardcodes the retired `Owner` / `Status: "Open"` columns. It is a live
    export, so it can be re-imported by accident — delete it in a follow-up.
  - `lib/config.ts` `CHART_COLORS` and the `color` fields in `lib/mock-data.ts`
    still hold raw hexes. Neither is read by any rendered chart today.
  - ~~`BRAND_DESIGN.md` §3 and `DESIGN_SYSTEM.md` §3 still name **Inter** as
    the font family while the app ships Geist~~ — **resolved 2026-08-31**: the
    app now ships **Inter** (owner's direction; `BRAND_DESIGN.md` §3 records
    the decision history, including the retained Geist Mono). Still open:
    `BRAND_DESIGN.md` §2.3/§8 give text-on-brand-teal as `#FFFFFF`, which is
    ~1.5:1 on `--secondary` `#A1D1D5` and contradicts that doc's own §10
    accessibility table; `globals.css` and `DESIGN_SYSTEM.md` §2.1 use
    `--secondary-foreground` `#1F2937` (~10:1) and the 2026-07-25 pass
    standardised every teal surface on that. That one is a doc edit an owner
    should make — the code is already correct.

## 4b. O&M scope — what this app deliberately is not

A capability assessment against a normal CMMS was run on 2026-07-25. The app
is a **monitoring, analysis and identification** platform. It has 9 live write
paths, only 3 of which record business data (a contract PDF link, the public
contractor application, and a user's own profile). Absent by decision, not by
oversight: work orders, PPM scheduling engines, task assignment, due dates,
SLA timers, close-out evidence, spares/procurement, permit-to-work, incident
registers, and any audit trail of resolution.

**Do not add these without an explicit instruction from the owner** —
management confirmed on 2026-07-25 that issues are actioned on the floor and
that the app's job is to surface them, not to track them. Fake affordances
that imply tracking (hardcoded owners, `Status: "Open"` chips) were removed
for exactly this reason and should not be reintroduced.

Genuinely useful data that exists but is unsurfaced, if ever wanted:
`fire_quotations` (4 rows) + `fire_quotation_items` (7 rows) are real, modelled
tables that no screen reads.

## 5. In-flight work (open PRs)

- **#79 Design System v2.0 — foundation + Water (2026-09-02).** Branch
  `claude/supabase-service-role-setup-zgjzno` (re-pointed at `main` after its
  earlier hardening PR was closed). Kept as a **draft through six review
  rounds on the Vercel preview** in light and dark mode
  (`muscatbay-git-claude-supabase-servic-76af09-arahim900s-projects.vercel.app/water`;
  1440 px light + dark captures in `muscatbay/app/screenshots/`); on
  2026-09-03 the owner delegated the merge decision ("you decide"), so the PR
  was taken out of draft for the automated review and merged (squash) once
  that review had run — the merge is what the next Development-log entry
  records. What it
  carries: the owner-supplied UI kit installed per its `INSTALL.md` —
  `/DESIGN_SYSTEM.md` at the repo root (the only design reference; the two
  older documents carry SUPERSEDED banners), `app/design-tokens.css` imported
  once from `globals.css`, DM Sans loaded in `app/layout.tsx` (Inter retired),
  the twelve primitives in `components/ui/` with a barrel, `lib/cn.ts`, the
  design lint wired into `eslint.config.mjs` (scoped to the Water folders),
  `npm run screenshots` (Playwright, 1440 px, light + dark), and the "Design
  rules for agents" section pasted verbatim into `CLAUDE.md`. Then the first
  page migration — **Water**, Monthly + Daily + Satellite — described in the
  §2 rows above. Deliberate deviations, each explained in the PR: the kit's
  `KpiCard` `any` became `ElementType` (repo lint forbids `any`); the kit's
  ESLint rule file gained a named export (repo lint); legacy pages keep their
  old tokens behind a `bg-muted-bg` alias (§4); the Water daily briefing
  ticker became a static card (kit rule 7); the old WCAG-checked focus-ring
  rule in `globals.css` still outranks the kit's teal outline. Gates:
  TypeScript, ESLint (design rule included), 322 Vitest tests, production
  build, mobile `tsc` — all clean. **Nothing in this PR touches the
  database.** **Round 2 (owner review of the preview, same day):** the
  kit's new looks were judged inconsistent with the rest of the app, so the
  primitives now wrap the app-wide `TabNavigation` strip and `StatsGrid`
  tile, the period control is restyled as pressable controls, the donut
  matches HVAC, the blue month-to-date note is gone, STP is back on
  `StatsGrid`, and the rulings are written into `DESIGN_SYSTEM.md` §7 and
  `CLAUDE.md`. **Round 3 (multi-agent QA, 2026-09-03):** a static
  consistency audit of all ten pages plus a Playwright crawl of every route in
  both themes at 1440 and 390 px (52 captures, a click on every tab). Clean on
  the hard checks — no page errors, no horizontal overflow at either width, one
  heading and a breadcrumb per route, every tab click lands. Fixed in the PR:
  the Water mode switch used to disappear when the monthly read failed, locking
  the operator out of Daily and Satellite — the switch now stays and only the
  two views fed by the monthly fetch show the error/empty state; the Water
  balance flow was clipped at phone width (`justify-center-safe`); the Daily
  tab panels had no ids; Contractors, HVAC and Fire Safety tabs pointed at
  panels that did not exist and Electricity's data tab at the wrong id (one
  `role="tabpanel"` wrapper per page now, page-specific tab-strip labels on all
  six pages); water-blue KPI tiles on the Assets and Fire pages became
  `primary`/`info`; the Electricity Load Watch "Load briefing" strip became a
  `StatsGrid` row of the same four figures after the owner compared the three
  KPI rows side by side. **Round 5 (2026-09-03, owner's second pass):** the
  Electricity category table lost its "6-month trend" column at the owner's
  request; `SectionBoundary` now recognises a chunk-load failure (a tab still
  running the previous build after a deployment asks for files that no longer
  exist) and reloads the page once instead of offering a Retry that re-requests
  the same missing file — the "HVAC Overview could not be displayed" report was
  this, not a data fault: the Overview is a `next/dynamic` section, the live
  tables were checked (361 findings, 22 recurring issues, 6 contracts, 19
  correspondence rows, no nulls in the fields the page reads) and nothing in
  the component's own render path can throw on that data. The Water Zone
  Analysis "Month-to-date cumulative balance" chart was reviewed at the
  owner's request (see the Water — Daily row and §4). **Round 6 (2026-09-03,
  owner's decision on that chart):** the cumulative chart is gone; "Zone daily
  consumption trend" moved to the right half of the row at the half-width
  chart height (260 px) with the month-to-date balance in its footer, and the
  left half is the new "Where the water went — Day N" bar chart (largest L3
  meters, "Other", and the unmetered loss ranked together) — 332 tests, new
  pure-function and render tests, screenshots
  `water-daily-zone-analysis-{light,dark}.png` added. **Round 7 (2026-09-03,
  CodeRabbit review after the PR left draft, 11 findings):** fixed — the
  stale-build boundary no longer auto-reloads when sessionStorage is blocked
  (a reload could have repeated on every load; manual button instead, with a
  test), `Breadcrumb` marks the last rendered crumb as current, `EmbedFrame`
  puts the theme parameter before any `#fragment`, the two wide Water tables
  moved `role="region"`/`tabIndex` from the `<table>` to the scroll shell (new
  `containerProps` on the shared `Table`), the Year/Month/zone selects got a
  visible focus ring, a linked KPI tile no longer announces "No change" when
  it has no trend, the design lint now catches `bg-[…]`/`border-[…]`/`ring-[…]`,
  the kit `Button` gained the 44 px coarse-pointer target, and the stale Inter
  note in `CLAUDE.md` was corrected. Answered, not applied — the CSS spinner /
  skeleton pulse stay (GSAP is the scroll-choreography tool; the global
  reduced-motion rule already stops them), the kit `Button` consolidates with
  the legacy shadcn one when the last page migrates (documented deviation),
  and the ΣL3 convention (§4).
  Left for the per-page migration sessions (all pre-existing,
  listed in §4): five card treatments and three radii across the unmigrated
  pages, the STP-only `variant="secondary"` top strip, KPI rows placed four
  different ways, error states without Retry on Electricity/STP/Assets/Fire, two
  live indicators on the dashboard and none on Pest Control, and the Recharts
  "width(-1)" dev warning shared by every `height="100%"` chart.

### 5a. Archived — 2026-09-02 hardening wave (pushed to `main` as `98375c0`, reverted in `5620c4a`)

> The entries below describe application work that reached `main` on
> 2026-09-02 and was **reverted the same day at the owner's request** (design
> and behaviour changes he had not asked for). They are kept as history only:
> none of that code is in the tree. The **database-side security migrations
> stay applied** to the live project — see §4.

- **#77 Production hardening — alert lifecycle & STP figure integrity
  (2026-09-02).** Follow-up branch `claude/supabase-service-role-setup-zgjzno`
  targets `codex/production-hardening`, fixing three defects an independent
  audit found in #77 *after* its checks went green:
  1. **Alert incidents split.** Fingerprints embedded the last-occurrence date
     and the severity band, so a continuing fault re-keyed itself every day and
     a recovery drift across the 80% band closed the acknowledged critical
     incident and opened a fresh un-acknowledged warning. An `id` now names the
     condition only; level, title and message are columns the reconciler updates
     in place. Water rules stay month-keyed — a new month IS a new incident.
  2. **Contract incidents keyed by a name set.** `contracts-expired:<joined
     names>` meant the eleventh expiry re-keyed the incident covering the other
     ten. Now one incident per agreement, keyed by `amc_register.agreement_id`
     (carried through `toTrackerRow`), warning→error in place as it lapses.
  3. **Auto-resolution on incomplete evidence.** Any non-empty fetch counted as
     a full evaluation, so sparse data produced fewer alerts and closed the
     rest. `evaluateOperationalAlertsWithCoverage()` now separates *read* from
     *resolvable*; `reconcile_operational_alert_incidents` takes
     `p_resolvable_modules` as a distinct grant. Detected alerts are still
     persisted for a read-only module — incomplete evidence withholds the
     authority to CLOSE, never the duty to RAISE.
  Plus **STP figure integrity**: the page's KPI cards, monthly/daily charts,
  log table, sort keys and CSV export summed raw columns filtering only nulls,
  so a negative TSE reading subtracted from headline reuse and paid a negative
  saving, while Plant Watch beside it excluded that same row. All of them now
  read `summariseSTPReadings()`; recovery is paired-day only and cannot exceed
  100%; excluded rows are counted and surfaced as an anomaly badge, and the CSV
  carries a `Data Quality` column. Gates: TypeScript, ESLint, 392 Vitest tests,
  production build, mobile `tsc` all clean.
  **The two migrations are still unapplied to the live project.**
- **Local SQL test harness (no cost) — `npm run test:sql:local`.** The owner
  declined a paid Supabase preview branch (USD 0.01344/hour), so **both**
  production-security migrations are now applied to a throwaway local
  PostgreSQL 16 cluster and asserted there — **52 assertions**, no network, no
  live data. `sql/tests/00-supabase-stubs.sql` supplies identity and structure
  only (`auth.users`, a session-settable `auth.uid()`, `storage`, the four
  Supabase roles, the preflight's core tables); every rule under test comes
  from the real migration files.
  - `sql/tests/rls-roles.test.sql` (31) runs as the `authenticated` and `anon`
    database roles PostgREST uses, with accounts created **through the
    invitation flow**: uninvited/revoked/expired identities are refused,
    Viewer reads but cannot write, Contractor sees only its `module_scope`,
    Operator writes but cannot delete, Admin deletes, an authenticated session
    with no profile sees nothing, `anon` may only submit a *pending*
    professional application and cannot read it back, a user cannot change
    their own role or widen their own scope, unlisted tables are fail-closed.
  - `sql/tests/alert-incidents.test.sql` (21) covers the incident lifecycle and
    the service-role-only reconciler grant.
  - **Found and fixed a real migration bug in the process:** the
    `contractor_contracts` guard in the RLS migration read
    `to_regclass('public.contractor_contracts') is not null and … conrelid =
    'public.contractor_contracts'::regclass`. SQL does not short-circuit `AND`,
    and a `regclass` literal resolves at plan time — so the guard did not
    guard, and the **whole migration aborted** with "relation does not exist"
    on any database lacking that optional table. Now resolved through a
    variable. See `sql/tests/README.md`.
  - Still **not** a substitute for staging: there is no PostgREST here, so
    JWT parsing and the REST error surface are unverified. Run
    `npm run test:rls:staging` against a real project before production.
- **Pre-deployment remediation wave (2026-09-02)** — same branch as #77's
  follow-up. A five-phase readiness list plus a UI/UX standardisation brief was
  audited item-by-item against the codebase before any code was written. Two
  phases needed nothing: **Phase 2 (data accuracy)** and **Phase 4 (embeds,
  CSP, indexing)** were already fully implemented — fire PPM statuses compute
  from the current date, STP flags TSE-above-inlet and recovery-above-100%,
  contract-date conflicts are reconciled, `acknowledged_at`/`resolved_at` are
  separate and the UI reads open incidents from the database, and
  `lib/embed-security.ts` + `proxy.ts` already enforce an iframe allowlist and a
  nonce/`strict-dynamic` production CSP with `robots.txt` and `X-Robots-Tag`.
  What was genuinely outstanding, and is now done:
  - **RLS is tested by CI.** `npm run test:sql:local` existed but ran only when
    someone remembered. A `sql-security` job in `.github/workflows/quality.yml`
    now applies both migrations to a throwaway PostgreSQL 16 cluster on every
    PR, plus weekly — policy rot changes nothing in the app, so no ordinary PR
    would catch it. Kept separate from `verify` so a lint failure cannot mask a
    broken access-control policy.
  - **A missing accent-as-text token.** `--secondary` (`#A1D1D5`) is a
    background tint, but eight call sites used it as *text* on light surfaces —
    about **1.6:1** against a 4.5:1 AA floor, unqualified by theme, so light mode
    was the broken one. The `--mb-*-text` convention existed for status colours
    but had no accent equivalent, which is why call sites reached for the raw
    teal. New **`--mb-secondary-text` (`#37767B`)**, derived the way
    `BRAND_DESIGN.md` §2.6 derives the status icon tier (brand hue and
    saturation held, lightness lowered): **4.89:1** on `--background`, **5.20:1**
    on `--card`, asserted by a unit test. `--ring` was not reusable — at 3.54:1
    it clears the 3:1 non-text floor only. Applied to the mobile bottom nav
    (highest traffic — the active tab on every route), topbar role label,
    secondary tab icon, Electricity meter chip and Fire Safety labels.
  - **Nine unnamed data tables** (5 Assets, 3 Contractors, 1 Fire Safety) gained
    screen-reader captions naming their real columns and stating that a blank
    means *not recorded*, so a missing value is never heard as a zero. Two
    existing `aria-label`s described tables they were not, and `aria-label`
    **beats** `<caption>` in the accessible-name computation — so those were
    renamed too; a caption alone would have left the wrong name announced.
  - **Three icon-only controls under 44px on touch** (bottom-nav close, export
    button, toast dismiss). The `@media (pointer: coarse)` floor in
    `globals.css` sets `min-block-size` only, so it raises height and leaves
    width alone; controls routed through `components/ui/button.tsx` were fine.
  - **The same defect in reverse.** `--mb-primary` is a *dark* purple, so as
    text it is comfortable in light mode (8.58:1) and fails in **dark**, where
    it lightens only to `#5f5168` — **2.71:1**, under the 3:1 graphic floor, let
    alone 4.5:1. It was carrying body copy in the Water daily legends, the
    Settings session label and several links. New **`--mb-primary-text`**, light
    `#4D445D` (unchanged brand purple), dark `#8b7f94` (the lightened brand
    purple already in the palette): 5.26:1 and 4.84:1 in dark.
  - **Recharts (~180 kB) shipped in the first load** of Contractors, Assets and
    Fire Safety — the only three routes with no dynamic import. All three now
    code-split behind size-matched fallbacks. Measured from `.next`, per-route
    first load: Fire Safety **315 → 201 kB gzip**, Contractors **350 → 241 kB**,
    Assets **343 → 231 kB**. The 326 kB Recharts chunk is gone from all three.
  - **HVAC and Fire Safety lost their page title while loading**, replacing the
    whole page with a generic skeleton. Both now keep the real `<h1>` and swap
    only the data regions, matching Water/STP/Electricity.
  - **Charts bypassing the shared container.** HVAC and Fire Safety imported
    Recharts' `ResponsiveContainer` directly; they survived only because a
    parent happened to carry a fixed height. Both now use `ChartContainer`.
  - **Water Monthly brought onto the shared module pattern** — see the
    Water — Monthly row in §2.
  Gates: TypeScript (web + `mobile/`), ESLint, **476** Vitest tests in 60 files
  (up from 392), production build, and 55 SQL assertions — all clean.

- **Security migrations applied to the live project (2026-09-02)** — both
  migrations are now **applied** to `utnlgeuqajmwibqmdmgt` via the Supabase MCP
  server, in the order `invitation_only_security_and_rls` →
  `operational_alert_incidents`. The database is the authority on access
  control from this point; the app no longer relies on every signed-in user
  being trusted.
  - **Rollback artefact first.** The org is on the **free plan**, so there is no
    PITR and no automated daily backup. Both migrations are schema/permission
    only and rewrite no operational data, so what was at risk was permission
    state — captured before the apply into four `mb_security_snapshot_20260902_*`
    tables (**95** policies with regenerated `CREATE POLICY` DDL, **1,703**
    grants, 2 buckets, 28 function ACLs). Restoring is replaying `restore_ddl`,
    not reconstructing from a transcript.
  - **Two defects were found by pre-flight and fixed before the apply**, both of
    which a staging run would have caught and neither of which the SQL suite
    covered:
    1. The view allowlist named four electricity views —
       `electricity_current_month`, `electricity_monthly_totals`,
       `electricity_readings_with_meters`, `unified_electricity_data` — **none
       of which exist**, while omitting `amc_contractor_summary` and
       `amc_contractor_expiry`, which Contractors reads on every load. It would
       have revoked a live read while protecting nothing.
    2. `amc_contractor_expiry` reads `amc_open_actions`, which the fail-closed
       sweep revokes. Because approved views are set `security_invoker = true`,
       simply re-approving the view would still have failed for every role,
       administrators included. `amc_open_actions` is now inventoried
       `server_owned`/`contractors` — read-only, no write path.
  - **A third defect was found by post-apply verification.**
    `operational_alert_incidents` revoked only INSERT/UPDATE/DELETE from `anon`,
    and Supabase grants every new public table to `anon` by default, so `anon`
    kept SELECT. RLS masked it (no policy names `anon`, so the read returned
    zero rows) — which is exactly how a boundary defect survives a green suite.
    Fixed to `REVOKE ALL`, and the suite now asserts the *grant* rather than the
    row count.
  - **Verified against the live database, not assumed.** Simulating each role
    with `set local role` + `request.jwt.claims`: all 28 app-read relations
    readable by admin and viewer with real row counts; `profiles` correctly
    scoped (admin 12 rows, viewer 1); a contractor scoped to `["water"]` reads
    water but gets zero rows from electricity and STP; viewer writes, viewer
    self-escalation to admin, and reads of fail-closed tables all denied. `anon`
    now holds exactly **one** privilege in the whole schema — `INSERT` on
    `professional_applications`, the public intake form. Supabase advisors
    report **zero ERROR-level lints**; the remaining `rls_enabled_no_policy`
    entries are INFO and are the fail-closed tables working as designed. All 21
    SECURITY DEFINER functions retain `service_role` EXECUTE, so the nightly
    Grafana water sync, STP submission, view rebuild and placeholder-nulling
    cron jobs are unaffected.
  - **The invitation gate is live and enforced now.** `auth_invitations` is
    empty, so no new account can be created. Enforcement comes from the
    `on_auth_user_created` trigger, which is already installed — it does not
    wait on the Auth Hook.
  - **One app-side regression surfaced by the change, found and fixed.**
    `NotificationProvider` was mounted in the root layout, outside
    `LayoutRouter`, so it ran on every route including `/login`, `/signup` and
    the public legal pages. It drives `useOperationalAlerts`, which reads
    water, contractor and STP tables and opens a realtime channel. That was
    invisible while every signed-in role could read everything — but anon was
    doing it too, which is precisely the hole RLS closed. Post-RLS the public
    login page fired four failing reads plus an unauthorised WebSocket on a
    repeating interval. The provider now wraps only the authenticated branch of
    `LayoutRouter`, which already knew which routes are public; all six context
    consumers live inside that branch, so no auth page loses its provider.
    Verified in a real browser: `/login`, `/signup` and `/privacy` now issue
    **zero** Supabase requests and log **zero** console errors, with the sign-in
    form intact.

- **Application code reverted in full to 1 September (2026-09-02)** — the owner
  reviewed the deployed result and rejected the appearance: *"even the font you
  have changed, even the colours even the table Design all the things."* The
  application code is now **byte-identical to `eaa38cc`** (1 Sep 13:28 UTC, the
  last commit before any of this work). Only `sql/` is kept, as the record of
  migrations already applied to the live database.
  - **Why three attempts were needed, and what I got wrong.** The first revert
    undid my own eleven design commits and I reported the look restored. It was
    not: the appearance had also been changed by **`464f66c` "feat: harden
    production operations dashboard"**, which was already on
    `codex/production-hardening` and had *never been live* — pushing that branch
    to `main` is what put it in front of the owner. It redesigned
    `components/shared/stats-grid.tsx`, which draws every KPI card in every
    module, cut Water's KPI row from six cards to four, and restyled the tab
    navigation, page status bar, table pagination and chart container. My
    verification was also weak: a `grep -c` matched an unrelated line and I read
    it as proof the labels were back. Reverting piecemeal after that missed the
    dashboard, then the shared components, then the rest.
  - **The font never changed.** Both versions load Inter through
    `interSans.className`, and `globals.css` is byte-identical across the range.
    What read as a font change was the typography inside the restyled shared
    components.
  - **Removed:** 30 files created during this work, including the alert-incidents
    library and its API route, `lib/embed-security.ts`, `lib/stp-data-quality.ts`,
    `lib/fire-ppm-status.ts`, `lib/contract-reconciliation.ts`, `app/robots.ts`,
    the invitation API route and its settings form, the shared
    `operational-briefing` component, the Playwright config and e2e specs, the
    `scripts/security/` harness and the `quality.yml` CI workflow.
  - **The database is untouched and still enforces everything.** RLS,
    invitation-only signup and the role assignment are server-side; reverting
    application code does not reopen them. That security does not depend on any
    of the code removed here.
  - **Two consequences to be aware of.** First, there is now **no way to invite a
    user from the app** — the invitation route and form were part of the removed
    set, while the database still requires an invitation to sign up, so new
    accounts need a row added directly. Second, the accent-as-text contrast
    tokens are gone, so the brand teal used as text is back to roughly **1.6:1**
    in light mode and the brand purple to **2.71:1** in dark, against a 4.5:1
    AA floor. Both were stated to the owner at the time.
  - Gates after the revert: TypeScript (web + `mobile/`), ESLint, **322** Vitest
    tests in 38 files (the 1 September baseline), and a passing production build.

- **Roles assigned and dormant accounts removed (2026-09-02)** — on the owner's
  instruction, the account estate went from **11 admins out of 12** to **one
  admin and eight viewers**. Until this, the RLS boundary applied the same day
  was largely decorative: `admin` passes every `mb_can_read_module` and
  `mb_has_any_role` check, so almost everyone sat on the permissive side of it.
  - **`alameeri900@gmail.com` is the sole `admin`.** The owner first specified
    *manager*, which would have left **no admin at all** — and
    `app/api/admin/invitations/route.ts` gates invitation creation on
    `role === 'admin'` while signup is now invitation-only, so a manager-only
    estate could never onboard anyone again without the Supabase dashboard.
    Raised before applying; the owner chose admin.
  - **Everyone else is `viewer`** — the "normal view": reads all seven module
    sections, sees and edits **their own** profile only, cannot write
    operational data, cannot change any role, cannot invite. Verified by role
    simulation: 4,687 rows readable across the seven modules, `profiles`
    returning **1** row, own-name edit allowed, own-role change denied.
  - **Three non-person accounts deleted** — `testuser@muscatbay.com` (never
    signed in), `test_schedule@example.com` (test artefact) and
    `ginejev728@zizvy.com` (disposable-mail domain; a stranger's self-service
    signup, which is precisely the abuse the invitation gate now prevents).
    Checked first against the two `NO ACTION` foreign keys that would block a
    delete — `operational_alert_incidents.acknowledged_by` and
    `professional_applications.reviewed_by` — plus storage ownership and
    invitations sent: all zero. `profiles`, sessions and identities cascade.
    End state: 9 users, 9 profiles, **no orphaned rows either way**.
  - Prior roles for all 12 accounts are recorded in
    `public.mb_role_snapshot_20260902`, so the role change is reversible. The
    three deletions are not.
  **Still the owner's call:**
  - **Configure the Auth Hook** (Dashboard → Authentication → Hooks → Before
    User Created → `public.mb_before_user_created`). This is *not* what makes
    signup invitation-only — the trigger already does. It converts the trigger's
    500 into a clean **403 "Dashboard access is invitation only."**
  - **`aalbalushi@muscatbay.com` (the owner's work address) is now a `viewer`**,
    following "the rest all to be users". Signing in with it gives read-only
    access — invitations and role changes need the `alameeri900@gmail.com`
    admin account. Say the word if that split is not what was intended.
  - **Leaked-password protection is disabled** (Supabase advisor, WARN). It is
    an Auth setting, not SQL, so it cannot be changed from a migration.
  - **`user_push_tokens` does not exist**, so mobile push registration in
    `mobile/src/lib/push.ts` fails today. Pre-existing, unrelated to these
    migrations, and creating the table is a product decision rather than a fix.
  - HTTP/PostgREST-level RLS verification (`npm run test:rls:staging`) and the
    credential-gated account-flow E2E specs still need dummy
    Viewer/Contractor/Admin accounts. The role simulation above exercises the
    policies through real `auth.uid()` evaluation, but it runs in-database and
    so does not cover JWT parsing or the REST error surface.
- **Typography — Inter adoption (2026-08-31)** — draft PR from branch
  `claude/typography-font-sizing-7shsei`. On the owner's direction the UI face
  switched **Geist → Inter** (variable, with the `opsz` optical-size axis;
  Geist Mono kept for meter IDs) in both the web app and `mobile/`
  (`@expo-google-fonts/inter`). Main headlines (`PageHeader` + command deck)
  unified on Inter SemiBold 600, 24→30→36px, `tracking-tight`; descriptions on
  Inter Regular 14→15px `text-muted-foreground`. Dead `--font-size-*` /
  `--line-height-*` tokens removed from `globals.css`; `BRAND_DESIGN.md` §3,
  `DESIGN_SYSTEM.md` §3 and `CLAUDE.md` realigned (the Geist-vs-Inter doc
  conflict in §4 is resolved).
- **#49 Front-end & O&M review remediation + Expo mobile foundation** — draft,
  active. Contents described in §2 (2026-07-25). Also introduces `mobile/`, an
  **Expo Router native app**: the web app is a PWA and a PWA cannot be listed
  on the App Store, so store distribution requires a native binary. Reuses the
  pure-TypeScript domain layer (`entities/`, `lib/`, `functions/api/`) via
  Metro `watchFolders` rather than duplicating it. Target is **internal-only
  distribution** (Apple Business Manager custom app), not the public store.
  Immediate priority is running in **Expo Go**, which needs no paid Apple
  membership; iOS push notifications require a development build and degrade
  honestly in Expo Go. Still outstanding: Apple Developer Program membership
  ($99, not yet purchased), EAS credentials, store assets.
- **Base44-style file reorganisation — DONE (2026-07-25).** See §1a. Remaining
  from this wave: a final colour/design-consistency pass, and test coverage for
  the six modules that still have no test file.

- **Security & data-integrity hardening (Phase 1) — MERGED (#43) + APPLIED
  2026-07-18.** Code merged to `main`; both SQL migrations applied to the live DB
  (see §4). Remaining owner-only actions (rotate `service_role` key, enter June
  NAMA reading, enable leaked-password protection, retire `stp-debug`) are in
  `SECURITY_REMEDIATION.md`. **UI unification (tables/fonts/colours) is the
  planned Phase 2** — not yet started.
- **#28 Senior-management water dashboard** — new default "Management" tab on
  `/water` (YTD KPIs + latest daily snapshot). Active, awaiting review/merge.
- **#21 3D app logo + STP plant twin** — draft; new logo assets + Three.js twin.
- **#6 Grafana → Supabase daily water sync workflow** — draft; needs 7 repo
  secrets before merge (see PR body).
- **#5 / #4** — stale (May-26 daily backfill already applied differently; codex
  lint fixes) — review for close-or-rebase.

## 6. Development log (auto-updated — newest first)

Entries below the marker are appended automatically on every push to `main`.
Do not hand-edit existing entries; curate meaning in the sections above.

<!-- STATUS:LOG:BEGIN -->
- 2026-09-04 — fix(ui): header parity, dark-mode chart tokens and mobile on Design System v2.0 (#80)
- 2026-09-03 — feat(design): Design System v2.0 foundation + Water page migration (#79)
- 2026-09-02 — revert: return the application code to its 1 September state
- 2026-09-02 — revert(ui): restore the KPI card, Water dashboard and daily report to their previous look
- 2026-09-02 — revert: restore the previous design and theme, keeping the security work
- 2026-09-02 — fix(layout): mount NotificationProvider only for authenticated routes
- 2026-09-02 — fix(sql): correct the RLS view allowlist and anon grant, then apply to production
- 2026-09-02 — refactor(firefighting): move the Overview charts into components/
- 2026-09-02 — test(setup): stub scrollIntoView, which jsdom does not implement
- 2026-09-02 — fix(a11y): add --mb-primary-text for brand purple used as text
- 2026-09-02 — fix(a11y,perf): finish the teal-as-text sweep and split Recharts off three routes
- 2026-09-02 — docs(brand): record --mb-secondary-text in the text-on-tint table
- 2026-09-02 — fix(a11y): use the accent-text token in the mobile navigation
- 2026-09-02 — feat(water): bring the Monthly dashboard onto the shared module pattern
- 2026-09-02 — test(hvac): pin the loading header and the shared chart container
- 2026-09-02 — fix(a11y,hvac): add an accent-as-text token, and stop HVAC losing its title
- 2026-09-02 — test(a11y): lock in the touch-target sizes for the two icon-only controls
- 2026-09-02 — fix(a11y): name nine data tables, and finish the touch-target pass
- 2026-09-02 — fix(a11y): give two icon-only controls a 44px touch target
- 2026-09-02 — ci(security): run the RLS harness in CI, and align two status affordances
- 2026-09-02 — docs(status-bar): correct the JSDoc to the label the component renders
- 2026-09-02 — docs(env): document the three server-only variables the app reads
- 2026-09-02 — test(sql): local RLS + invitation harness, and fix a guard that did not guard
- 2026-09-02 — fix(alerts,stp): stable incident identity, evidence-gated resolution, validated STP figures
- 2026-09-02 — fix: use hobby-compatible alert schedule
- 2026-09-02 — feat: harden production operations dashboard
- 2026-09-01 — Remove electricity summary cards
- 2026-08-31 — feat(design): adopt Inter as the UI typeface app-wide (web + mobile)
- 2026-08-30 — docs(load-testing): record first executed baseline (50-concurrent run + prod DB profile)
- 2026-08-30 — feat(load-testing): k6 + Artillery scalability harness (50 VU / 5 min)
- 2026-08-31 — feat(stp,electricity): interactive load-vs-recovery chart and Water-style KPI tiles
- 2026-08-30 — feat(contractors): make amc_register the sole AMC source (ACT-012)
- 2026-08-30 — fix(a11y,perf): logo restore, WebGL gating, chart code-splitting and container queries
- 2026-08-29 — fix(auth): close the open redirect on /auth/callback's ?next= (#72)
- 2026-08-29 — fix(auth): stop the double PKCE redemption that failed every Google sign-in (#71)
- 2026-08-28 — fix(auth): serve one canonical host so Google sign-in works on every domain (#70)
- 2026-08-28 — feat(auth): Google sign-in on login & signup — instant, no verification email (#69)
- 2026-08-25 — fix(water): remove ZEN bulk from direct connections
- 2026-08-25 — feat(water): surface ZEN project across dashboards
- 2026-08-24 — feat(tables): unify all data tables on the ops-table contract
- 2026-08-22 — feat(stp): streamline process health view
- 2026-08-22 — feat(water): refine daily zone summary
- 2026-08-21 — feat(electricity): align category summary with app table
- 2026-08-21 — feat(ui): refine responsive dashboard layouts
- 2026-08-06 — fix(water): show missing daily totals clearly
- 2026-08-06 — fix(water): preserve missing daily readings
- 2026-08-04 — feat(water/satellite): Village Square zone detail + distinct sub-connection colour
- 2026-08-04 — feat(water/satellite): building-footprint overlay — as-built outlines under the network
- 2026-08-04 — fix(water/satellite): retire the Zone 3 road mark — it cut through two buildings
- 2026-08-04 — fix(water/satellite): curve-true DWG extraction, reconciled with owner road marks
- 2026-08-04 — feat(water): improve Satellite View network accuracy
- 2026-08-04 — fix(water): version monthly initializer (#66)
- 2026-08-03 — fix(water): correct Satellite View zone mapping
- 2026-08-03 — feat(water): make satellite view actionable
- 2026-07-31 — feat(water/satellite): Stage 3 — overlay density, right-panel hierarchy, responsive (#64)
- 2026-07-31 — feat(water/satellite): Stage 2 — one period selector, View popover, region discipline (#63)
- 2026-07-31 — style(water/satellite): Stage 1 of the redesign — tokens, one panel style, typography cleanup (#62)
- 2026-07-30 — feat(water/satellite): focus-dim unselected zones, full loss story on zone cards (#61)
- 2026-07-30 — chore(lint): exclude vendored static bundles from ESLint (#60)
- 2026-07-30 — fix(water/satellite): anchor villa cards over their villas, cull by zoom
- 2026-07-30 — feat(water/satellite): monthly/daily data views + organised controls
- 2026-07-30 — feat(water/satellite): collapsible detail panel + dropdown controls
- 2026-07-30 — feat(water): Satellite View tab — as-built network map fed live from Supabase
- 2026-07-29 — Show the in-progress month in Water Monthly as labelled month-to-date data (#59)
- 2026-07-29 — Make the ticker always scroll and take the STP summary to four cards (#58)
- 2026-07-29 — Slow and enlarge the ticker, de-clutter the Electricity and STP KPI decks (#57)
- 2026-07-29 — Self-heal the PWA deploy race, fix the Reduce-Motion ticker, parallelise the water fetch (#56)
- 2026-07-29 — Audit fixes: honest dashboard figures, mobile nav access, Supabase RLS hardening (#55)
- 2026-07-26 — Fix the ticker jam, reshape it as a news band, record the contractor cleanup (#54)
- 2026-07-26 — Assert the KPI change highlight is actually wired up (#53)
- 2026-07-26 — Mark KPI figures that change while you are watching (#52)
- 2026-07-26 — Honour prefers-reduced-motion across all Recharts series (#51)
- 2026-07-25 — Estate briefing ticker on the dashboard + readable Water ticker (#50)
- 2026-07-25 — Front-end & O&M review remediation + Expo mobile foundation (#49)
- 2026-07-23 — feat(water): align Daily DC trend chart with the supply-chain gauges
- 2026-07-23 — feat(water): lead Daily DC gauges with Main Bulk (C43659) vs zone bulks + DC
- 2026-07-23 — feat(export): database CSV export on every table across all modules
- 2026-07-21 — fix(electricity,db): reconcile to master, close 3 live security holes, restore lost contractors (#46)
- 2026-07-19 — Add files via upload
- 2026-07-18 — docs(security): record anon read lockdown (app-side RLS now fully closed)
- 2026-07-18 — docs(security): record live-applied hardening (RLS sweep + STP future-date guard)
- 2026-07-18 — fix(security): remove leaked service_role key from scripts, fix fail-open RBAC, harden avatar uploads
- 2026-07-13 — feat(alerts): data-driven operational alerts + interface consistency pass (#42)
- 2026-07-11 — feat(mobile-nav): redesign bottom nav as a floating pill dock
- 2026-07-10 — feat(pest-control): frame AITable embed as a labelled, bounded external panel
- 2026-07-10 — fix(stp): date-range Start/End dropdowns no longer render empty
- 2026-07-10 — feat(perf): instant module switching — session data cache + link pending indicator
- 2026-07-10 — fix(assets): hold loading state until first fetch resolves — no false OFFLINE/zero flash
- 2026-07-10 — feat(pest-control): theme-synced, brand-framed AITable embed
- 2026-07-10 — fix(ui): stop mid-word truncation on contractor names and KPI labels
- 2026-07-10 — fix(ui): anchor toasts top-right below topbar so they never cover KPI cards
- 2026-07-10 — fix(water): show meter name in Zone Analysis L3 table Meter column
- 2026-07-06 — feat(dashboard, electricity): balance hero KPI deck + de-duplicate Meters & Data (#37)
- 2026-07-06 — feat(water): rows-per-page selector for the Monthly tables (#36)
- 2026-07-06 — Dashboard STP live-sync + asset KPI removal + Water A1→A2 trunk-loss view (#35)
- 2026-07-05 — fix(stability): guard sidebar localStorage parse against corrupt values
- 2026-07-05 — fix(stability): add error boundaries + harden STP date parsing
- 2026-07-05 — fix(inspection): make watch card grids fill with no trailing gaps
- 2026-07-05 — refine(inspection): elegant compact health cards + unified briefing ticker
- 2026-07-05 — feat(electricity): inspection-first Load Watch, consolidate to two tabs
- 2026-07-05 — feat(stp): inspection-first Plant Watch with exceptions register
- 2026-07-04 — feat(dashboard): animated brand-mark hero with scroll-driven choreography
- 2026-07-04 — chore(brand): add flat vector-accurate brand mark frame asset
- 2026-07-04 — feat(water): animate the daily briefing strip as a looping news ticker
- 2026-07-04 — refactor(water): collapse daily briefing tiles into one compact strip
- 2026-07-04 — feat(water): rebuild Daily section as zone-first leak-detection dashboard
- 2026-07-03 — Add living PROJECT_STATUS.md + auto-updating development log (#31)
- 2026-07-03 — Water Monthly: clock-proof the fetch window, flush stale client caches (#30)
- 2026-07-03 — Water Monthly: auto-sync any backend data to the dashboard, live (#29)
- 2026-06-30 — Align Fire Safety section with HVAC: 3 subsections, unified styling (#27)
- 2026-06-30 — Fire Safety: rename PPM Tracker to Maintenance, align with HVAC layout (#26)
- 2026-06-30 — Redesign Fire Safety Management around BEC PPM cycles, zones & live data
- 2026-06-30 — Remove DISCIPLINES KPI card from Assets Register (7 → 6 cards)
- 2026-06-30 — Reorganize Assets Register layout: KPI cards up top, search above table (#25)
- 2026-06-27 — feat(ui): unify KPI cards, tables & daily water section app-wide to the monthly standard
- 2026-06-27 — revert(water): restore monthly dashboard to original
- 2026-06-27 — fix(ui,water): review fixes — selected-row hover, STP axis precision, date-picker gaps & cross-year sync
- 2026-06-27 — Fix audit findings + stuck-splash service-worker bug (#24)
- 2026-06-26 — feat(water): rebuild Monthly section with Supabase-wired loss dashboard (#23)
<!-- STATUS:LOG:END -->

## 7. Where the deep detail lives

| Doc | Content | Freshness |
|---|---|---|
| `CLAUDE.md` (root) | Build/run commands, conventions, structure — auto-loaded by AI sessions | maintained |
| `BRAND_DESIGN.md` / `PRODUCT.md` / `muscatbay/app/DESIGN_SYSTEM.md` | Brand, tokens, design principles (BRAND_DESIGN wins conflicts) | stable |
| `muscatbay/app/FOLDER_STRUCTURE.md` | Authoritative folder layout + the two placement rules | 2026-07-25 |
| `muscatbay/app/ARCHITECTURE.md`, `README.md` | Architecture snapshots | 2026-05 snapshot |
| `muscatbay/app/DATABASE_AUDIT.md`, `AUTHENTICATION_AUDIT_REPORT.md` | Point-in-time audits | 2026-06 / earlier |
| `muscatbay/app/sql/migrations/` | Schema & data-load history (files are the DB change log) | append-only |
| `load-testing/README.md` | Load-testing harness (k6 primary + Artillery): 50-VU/5-min profiles, secure Bearer/Cookie auth, p50/p95/error gates, API-vs-DB interpretation guide. Journeys mirror `functions/api/*` reads — **update the mirrored queries in `load-testing/` whenever a reader changes** | 2026-08-30 |
| `load-testing/BASELINE.md` | First executed baseline (2026-08-30): 5-min ~50-concurrent HTTP runs (0 errors, flat p95) + production DB query profile. Verdict: DB engine healthy; costs are API-shape — `/water`'s 11-page OFFSET fan-out (0.8 ms page 1 → 104.6 ms page 11, top statement in `pg_stat_statements` at 157k calls), 60-connection ceiling, 4 duplicate index pairs on `water_daily_consumption` | 2026-08-30 |
