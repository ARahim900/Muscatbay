"use client";

import { useEffect, useState, useCallback } from "react";
import { BarChart3, CalendarDays, DatabaseZap, RefreshCw, AlertTriangle, Satellite, Sprout } from "lucide-react";

// Water data
import type { WaterMeter } from "@/lib/water-data";

// Supabase — the result-returning fetch, so a failure is reported rather than
// silently swallowed (it also hands back the negative-reading register).
import { fetchWaterMeters, type NegativeReading, type DerivedMonth } from "@/functions/api/water";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

// Design-system primitives (DESIGN_SYSTEM.md §6) + the shared render boundary
import { Badge, Breadcrumb, Button, PageHeader, SectionCard, SegmentedControl, StatusChip } from "@/components/ui";
import { SectionBoundary } from "@/components/shared/section-boundary";
import { Skeleton } from "@/components/shared/skeleton";
import { saveFilterPreferences, loadFilterPreferences } from "@/lib/filter-preferences";
import type { ViewStatus } from "@/components/water/daily-water-report";

// All three dashboard views are loaded on demand (Supabase-wired).
//
// Every one of them carries Recharts (or, for Satellite, maplibre), and none
// can render before the water fetch resolves — the page shows the skeleton
// below until then. Loading them lazily lets those chunks download alongside
// the data instead of sitting in the route's first-load JS, and each fallback
// is sized to the real view so hydration doesn't shift the page.
import { getPageCache, setPageCache } from "@/lib/page-cache";
import dynamic from "next/dynamic";
const WaterMonthlyDashboard = dynamic(
    () => import("@/components/water/monthly/water-monthly-dashboard").then((m) => ({ default: m.WaterMonthlyDashboard })),
    {
        loading: () => (
            <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading monthly water analysis">
                {/* KPI row · period control · section tabs · first card */}
                <KpiRowSkeleton />
                <Skeleton className="h-11 w-full rounded-card" />
                <Skeleton className="h-10 w-full max-w-2xl rounded-control" />
                <Skeleton className="h-chart-lg w-full rounded-card" />
            </div>
        ),
        ssr: false,
    },
);
const DailyWaterReport = dynamic(
    () => import("@/components/water/daily-water-report").then((m) => ({ default: m.DailyWaterReport })),
    { loading: () => <Skeleton className="h-96 w-full rounded-card" />, ssr: false },
);
// Satellite View hosts a maplibre engine — browser-only by nature.
const SatelliteView = dynamic(
    () => import("@/components/water/satellite/satellite-view").then((m) => ({ default: m.SatelliteView })),
    { loading: () => <Skeleton className="h-embed w-full rounded-card" />, ssr: false },
);
// Irrigation — a separate hand-read network with its own fetch (like Daily).
const IrrigationView = dynamic(
    () => import("@/components/water/manual-readings/irrigation-view").then((m) => ({ default: m.IrrigationView })),
    { loading: () => <Skeleton className="h-96 w-full rounded-card" />, ssr: false },
);

type DashboardView = "monthly" | "daily" | "satellite" | "irrigation";

// Base tables behind the monthly dashboard — module-level so the array
// reference stays stable across renders (the realtime hook re-subscribes
// when the reference changes).
const WATER_REALTIME_TABLES = ["water_meters", "water_monthly_consumption", "water_daily_consumption"];

// Session cache — revisiting /water renders the last data instantly and
// refreshes silently in the background instead of re-showing the skeleton.
const WATER_CACHE_KEY = "water:page";
interface WaterPageCache {
    meters: WaterMeter[];
    lastUpdated: Date;
    /** Months whose figures are month-to-date daily sums (may be absent in old caches). */
    derivedMonths?: DerivedMonth[];
}

/** "12:34" for the status chip — the transport recency, shown as "Synced 12:34". */
const timeLabel = (d: Date | null): string | undefined =>
    d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : undefined;

/** Six 104 px tiles — the exact footprint of the KPI row, so nothing shifts. */
function KpiRowSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-kpi w-full rounded-card" />
            ))}
        </div>
    );
}

/**
 * Honest failure state.
 *
 * This page used to fall back to `MOCK_WATER_METERS` whenever the fetch failed
 * or returned nothing, and render it as an ordinary dashboard — a manager could
 * read fabricated supply/loss figures with no indication they weren't real.
 * Nothing is ever substituted for live data now: we say what went wrong and
 * offer a retry.
 */
function WaterErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <SectionCard>
            <SectionCard.Header icon={AlertTriangle} title="Water data could not be loaded" />
            <SectionCard.Body>
                <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-danger-tint p-4 text-danger">
                    <p className="text-body">{message}</p>
                    <p className="text-caption">
                        No figures are shown for this period — nothing is estimated or substituted. Retry once the
                        connection is restored.
                    </p>
                    <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>Retry</Button>
                </div>
            </SectionCard.Body>
        </SectionCard>
    );
}

/** Benign "connected, but there is nothing to show yet" state. */
function WaterEmptyState({ onRetry }: { onRetry: () => void }) {
    return (
        <SectionCard>
            <SectionCard.Header icon={DatabaseZap} title="No water meters found" />
            <SectionCard.Body className="flex flex-col items-start gap-3">
                <p className="max-w-prose text-body text-muted">
                    The database is reachable but returned no meters. Once meters and monthly readings are
                    loaded they will appear here.
                </p>
                <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>Check again</Button>
            </SectionCard.Body>
        </SectionCard>
    );
}

export default function WaterPage() {
    const [dashboardView, setDashboardView] = useState<DashboardView>("monthly");

    // Supabase data state — seeded from the session cache when available
    const [cached] = useState(() => getPageCache<WaterPageCache>(WATER_CACHE_KEY));
    const [waterMeters, setWaterMeters] = useState<WaterMeter[]>(cached?.meters ?? []);
    const [isLoading, setIsLoading] = useState(!cached);
    const [error, setError] = useState<string | null>(null);
    const [negatives, setNegatives] = useState<NegativeReading[]>([]);
    const [derivedMonths, setDerivedMonths] = useState<DerivedMonth[]>(cached?.derivedMonths ?? []);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(cached?.lastUpdated ?? null);
    // The Daily view has its own fetch + realtime channel; it reports them here
    // so the page keeps ONE data-source chip (DESIGN_SYSTEM.md §0 — no duplicate
    // "live data" information).
    const [dailyStatus, setDailyStatus] = useState<ViewStatus | null>(null);
    // Same arrangement for Irrigation — its own fetch and realtime channel.
    const [irrigationStatus, setIrrigationStatus] = useState<ViewStatus | null>(null);

    // Stable fetch function — used both on mount and by the real-time handler
    const fetchWaterData = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        const result = await fetchWaterMeters();
        if (silent && result.error) {
            // A background refresh failed: keep showing the data already on
            // screen (it is real, just not fresh) rather than blanking the page.
            return;
        }
        setError(result.error);
        setNegatives(result.negatives);
        if (!result.error) {
            setWaterMeters(result.meters);
            setDerivedMonths(result.derivedMonths);
            const now = new Date();
            setLastUpdated(now);
            if (result.meters.length > 0) {
                setPageCache<WaterPageCache>(WATER_CACHE_KEY, {
                    meters: result.meters,
                    lastUpdated: now,
                    derivedMonths: result.derivedMonths,
                });
            }
        }
        if (!silent) setIsLoading(false);
    }, []);

    const retry = useCallback(() => {
        fetchWaterData(false);
    }, [fetchWaterData]);

    // ── Supabase real-time subscription for the water tables ───────────────
    // Subscribe to the base tables the app reads ("Water System" is a view —
    // views never emit postgres_changes events), so new monthly readings
    // appear without a manual refresh.
    const { isLive } = useSupabaseRealtime({
        table: WATER_REALTIME_TABLES,
        channelName: "water-system-rt",
        onChanged: () => fetchWaterData(true),
        enabled: !error && waterMeters.length > 0,
    });

    // Fetch on mount + restore the saved view. When the session cache seeded
    // the state, fetch silently — the page is already rendering last data and
    // this call only freshens it in place (stale-while-revalidate).
    // Mount-only: `fetchWaterData` is a stable useCallback and `cached` is read
    // once from the session cache, so re-running this would only refetch.
    useEffect(() => {
        fetchWaterData(Boolean(cached));
        const savedPrefs = loadFilterPreferences<{ dashboardView?: DashboardView }>("water");
        // localStorage is client-only, so restoring the saved view must happen after
        // hydration; a lazy useState initialiser would render a different value on the
        // server than on the client.
        if (savedPrefs?.dashboardView) setDashboardView(savedPrefs.dashboardView);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; deps are stable by construction
    }, []);

    // Persist the selected view
    useEffect(() => {
        saveFilterPreferences("water", { dashboardView });
    }, [dashboardView]);

    const hasData = waterMeters.length > 0;

    // One chip, four states. "connecting" also covers "data loaded, realtime
    // channel still handshaking" — it never claims live until the channel is.
    // The Daily view owns its own fetch, so while it is showing, its status wins
    // even if the monthly read has failed.
    const status: ViewStatus = isLoading
        ? { state: "connecting" }
        : dashboardView === "daily" && dailyStatus
            ? dailyStatus
            : dashboardView === "irrigation" && irrigationStatus
                ? irrigationStatus
            : error
                ? { state: "offline", syncedAt: timeLabel(lastUpdated) }
                : { state: isLive ? "live" : "connecting", syncedAt: timeLabel(lastUpdated) };

    // Monthly and Satellite both render from the monthly fetch; Daily and
    // Irrigation do not. A failed or empty monthly read therefore blocks those
    // two views only — the mode switch stays on screen so the daily report and
    // the irrigation entry remain reachable.
    const monthlyBlocked = Boolean(error) || !hasData;
    const readsMonthly = dashboardView === "monthly" || dashboardView === "satellite";

    return (
        <div className="space-y-6">
            {/* Breadcrumb → PageHeader (DESIGN_SYSTEM.md §5) */}
            <div>
                <Breadcrumb items={[{ label: "Dashboard", href: "/" }, { label: "Water" }]} />
                <PageHeader
                    title="Water"
                    description="Consumption and loss across the network"
                    accent="water"
                    status={
                        <div className="flex items-center gap-2">
                            {negatives.length > 0 && (
                                <span
                                    title={negatives
                                        .slice(0, 10)
                                        .map((r) => `${r.label} (${r.account}) ${r.month}: ${r.value} m³`)
                                        .join("\n")}
                                >
                                    <Badge tone="warning" icon={AlertTriangle}>
                                        {negatives.length} negative reading{negatives.length === 1 ? "" : "s"}
                                    </Badge>
                                </span>
                            )}
                            <StatusChip state={status.state} syncedAt={status.syncedAt} />
                        </div>
                    }
                />
            </div>

            {isLoading && (
                <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading water system data">
                    <Skeleton className="h-9 w-72 rounded-control" />
                    <KpiRowSkeleton />
                    <Skeleton className="h-11 w-full rounded-card" />
                    <Skeleton className="h-10 w-full max-w-2xl rounded-control" />
                    <Skeleton className="h-chart-lg w-full rounded-card" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* PRIMARY mode switch: Monthly / Daily / Satellite / Irrigation — always
                        rendered once loading ends, so a failed monthly read never
                        locks the operator out of the daily report. */}
                    <SegmentedControl<DashboardView>
                        aria-label="View mode"
                        value={dashboardView}
                        onChange={setDashboardView}
                        options={[
                            { value: "monthly", label: "Monthly", icon: BarChart3 },
                            { value: "daily", label: "Daily", icon: CalendarDays },
                            { value: "satellite", label: "Satellite", icon: Satellite },
                            { value: "irrigation", label: "Irrigation", icon: Sprout },
                        ]}
                    />

                    {/* Monthly Dashboard View — boundary-wrapped so a render fault
                        in the (large) monthly dashboard degrades to a section
                        panel instead of blanking the whole route into
                        app/error.tsx. The Daily view's sections carry their own
                        boundaries internally. */}
                    <div id={`panel-${dashboardView}`} role="tabpanel" aria-labelledby={`tab-${dashboardView}`} tabIndex={0}>
                        {/* Daily Dashboard View — its own fetch, so it renders even when the monthly read failed */}
                        {dashboardView === "daily" && (
                            <SectionBoundary title="Daily water report">
                                <DailyWaterReport onStatusChange={setDailyStatus} />
                            </SectionBoundary>
                        )}

                        {/* Irrigation — hand-read network, its own fetch, unaffected by the monthly read */}
                        {dashboardView === "irrigation" && (
                            <SectionBoundary title="Irrigation">
                                <IrrigationView onStatusChange={setIrrigationStatus} />
                            </SectionBoundary>
                        )}

                        {readsMonthly && error && <WaterErrorState message={error} onRetry={retry} />}
                        {readsMonthly && !error && !hasData && <WaterEmptyState onRetry={retry} />}

                        {dashboardView === "monthly" && !monthlyBlocked && (
                            <SectionBoundary title="Monthly water analysis">
                                <WaterMonthlyDashboard waterMeters={waterMeters} derivedMonths={derivedMonths} />
                            </SectionBoundary>
                        )}

                        {/* Satellite View — as-built network map fed from the same fetch as Monthly */}
                        {dashboardView === "satellite" && !monthlyBlocked && (
                            <SectionBoundary title="Satellite network view">
                                <SatelliteView waterMeters={waterMeters} derivedMonths={derivedMonths} />
                            </SectionBoundary>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
