"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Button, SectionCard, Tabs, type TabItem } from "@/components/ui";
import { SectionBoundary } from "@/components/shared/section-boundary";
import { getDynamicMonths, findLatestMonthWithData } from "@/lib/water-data";
import { ZONE_BULK_CONFIG } from "@/lib/water-accounts";
import { getSupabaseClient } from "@/lib/supabase";
import { DAILY_WATER_CONSUMPTION_SELECT_COLUMNS, type SupabaseDailyWaterConsumption } from "@/entities/water";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { saveFilterPreferences, loadFilterPreferences } from "@/lib/filter-preferences";
import {
    ChevronLeft, ChevronRight, CalendarDays, RefreshCw,
    Gauge, MapPin, Plug, Database, ClipboardList, ClipboardPen,
} from "lucide-react";

// ─── Subcomponents extracted into ./daily-report/ for maintainability.
//     (An unused parallel implementation — zone-panel/dc-panel/zone-analytics/
//     report-primitives/report-types — was deleted; these are the live ones.)
import {
    type ReportData, type ReportStatus,
    processReport,
} from "./daily-report/inline-shared";
import { ZoneAnalyticsPanel } from "./daily-report/inline-zone-analytics";
import { ZoneL3Table } from "./daily-report/inline-zone-l3-table";
import { DCAnalyticsPanel, DCDailyTable } from "./daily-report/inline-dc-panel";
import { LoadingState, ErrorState, EmptyState } from "./daily-report/inline-states";
import { computeBriefing } from "./daily-report/briefing-metrics";
// ─── Daily section tabs (zone-first: no L1/NAMA daily account exists, so the
//     section is organised around the L2-vs-ΣL3 balance where leaks show up).
import { ZoneWatch } from "./daily-report/zone-watch";
import { DailyDatabase } from "./daily-report/daily-database";
import { DailyExceptions } from "./daily-report/daily-exceptions";
// ─── Hand readings — the bulk meters Kalhat reads by hand (Main Bulk, zone
//     bulks, Central Park). Its own fetch: reachable even when the month has
//     no Grafana rows yet, because that is exactly when it is needed.
import { PotableManualPanel } from "./manual-readings/potable-manual-panel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_ABBREVS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/** Return yesterday's day-of-month if `month` matches yesterday's calendar month, else 1. */
function getDefaultDay(month: string): number {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expected = `${MONTH_ABBREVS[yesterday.getMonth()]}-${String(yesterday.getFullYear()).slice(2)}`;
    return month === expected ? yesterday.getDate() : 1;
}

/**
 * Number of days in a `"Mon-YY"` month (leap years included).
 *
 * The day slider used to be hardcoded to `max={31}` for every month, so 30 and
 * 31 February were selectable and silently produced empty panels — a dead-end
 * the operator had no way to explain.
 */
function daysInMonth(month: string): number {
    const [abbrev, yy] = month.split('-');
    const monthIdx = MONTH_ABBREVS.indexOf(abbrev);
    if (monthIdx === -1 || !yy) return 31;
    // Day 0 of the next month === last day of this one.
    return new Date(2000 + Number(yy), monthIdx + 1, 0).getDate();
}

/** Return the month string (e.g. "Mar-26") for yesterday. */
function getDefaultMonth(): string {
    const months = getDynamicMonths();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = `${MONTH_ABBREVS[yesterday.getMonth()]}-${String(yesterday.getFullYear()).slice(2)}`;
    return months.includes(key) ? key : months[months.length - 1];
}

/** Extract unique years from dynamic months (e.g. ["24","25","26"]). */
function getAvailableYears(): string[] {
    return [...new Set(getDynamicMonths().map(m => m.split('-')[1]))];
}

/** Get months available for a given 2-digit year. */
function getMonthsForYear(year: string): string[] {
    return getDynamicMonths().filter(m => m.endsWith(`-${year}`));
}

// ─── Section tabs (mirrors the Monthly dashboard's five-section structure) ────

type DailyTab = 'watch' | 'zones' | 'dc' | 'database' | 'exceptions' | 'readings';

const DAILY_TABS: TabItem<DailyTab>[] = [
    { value: 'watch', label: 'Zone Watch', icon: Gauge },
    { value: 'zones', label: 'Zone Analysis', icon: MapPin },
    { value: 'dc', label: 'Direct Connections', icon: Plug },
    { value: 'database', label: 'Daily Database', icon: Database },
    { value: 'exceptions', label: 'Exceptions', icon: ClipboardList },
    { value: 'readings', label: 'Hand Readings', icon: ClipboardPen },
];

/** `"Sep-26"` + day → `"2026-09-05"`, the date key the hand-readings panel works in. */
function toDateKeyFromMonth(month: string, day: number): string {
    const [abbrev, yy] = month.split('-');
    const monthIdx = MONTH_ABBREVS.indexOf(abbrev);
    const year = 2000 + Number(yy);
    const safeDay = Math.min(Math.max(day, 1), daysInMonth(month));
    return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

const isDailyTab = (v: unknown): v is DailyTab => DAILY_TABS.some(t => t.value === v);

/**
 * What the page's single data-source chip should say for the Daily view. The
 * Daily report has its own fetch and realtime channel; instead of rendering a
 * second "Live / Offline" pill (DESIGN_SYSTEM.md §0 — no duplicate live-data
 * information) it reports its state upward.
 */
export type ViewStatus = { state: 'live' | 'connecting' | 'offline'; syncedAt?: string };

/** Native select in the design-system control idiom (tokens only). */
const SELECT_CLASS = "h-9 rounded-control border border-line bg-card px-2 text-label text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50";

// ─── Main component ───────────────────────────────────────────────────────────

export function DailyWaterReport({ onStatusChange }: { onStatusChange?: (status: ViewStatus) => void } = {}) {
    // Safe initial state (matches SSR output — last available month, day 1).
    // The real default ("yesterday" from the client's local clock) is applied
    // in a client-only useEffect below, to avoid SSR timezone drift where the
    // server's UTC clock could produce a different "yesterday" than the user's.
    const initialMonths = getDynamicMonths();
    const [selectedMonth, setSelectedMonth] = useState<string>(
        initialMonths[initialMonths.length - 1],
    );
    const [selectedDay, setSelectedDay] = useState<number>(1);
    const [defaultsApplied, setDefaultsApplied] = useState(false);
    const [status, setStatus] = useState<ReportStatus>('loading');
    const [monthData, setMonthData] = useState<SupabaseDailyWaterConsumption[]>([]);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [lastFetched, setLastFetched] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState<DailyTab>('watch');
    const [activeZone, setActiveZone] = useState<string>(ZONE_BULK_CONFIG[0].zoneName);

    // ── Restore / persist the selected tab & zone (client-only) ────────────────
    useEffect(() => {
        const prefs = loadFilterPreferences<{ tab?: string; zone?: string }>('water-daily');
        if (isDailyTab(prefs?.tab)) setActiveTab(prefs.tab);
        if (prefs?.zone && ZONE_BULK_CONFIG.some(z => z.zoneName === prefs.zone)) setActiveZone(prefs.zone);
    }, []);
    useEffect(() => {
        saveFilterPreferences('water-daily', { tab: activeTab, zone: activeZone });
    }, [activeTab, activeZone]);

    // Days the selected month actually has — the slider and the chevrons are
    // bounded by this, so e.g. day 30 is unreachable in February.
    const maxDay = daysInMonth(selectedMonth);

    // Guard against a stale selection surviving a month change (e.g. day 31 in
    // Jan → Feb). Clamping here rather than at every setSelectedMonth callsite.
    useEffect(() => {
        setSelectedDay(d => (d > maxDay ? maxDay : d));
    }, [maxDay]);

    // ── Cross-navigation: Zone Watch cards/heatmap → Zone Analysis drill-down ──
    const inspectZone = useCallback((zone: string, day?: number) => {
        if (day !== undefined) setSelectedDay(day);
        setActiveZone(zone);
        setActiveTab('zones');
    }, []);

    // ── Cheap existence probe: does a month have any rows? (HEAD count, no data)
    const monthHasData = useCallback(async (month: string): Promise<boolean> => {
        const client = getSupabaseClient();
        if (!client) return false;
        const { count, error } = await client
            .from('water_daily_consumption')
            .select('id', { count: 'exact', head: true })
            .eq('month', month);
        if (error) throw new Error(error.message);
        return (count ?? 0) > 0;
    }, []);

    // ── Resolve the default month on client mount ──────────────────────────────
    // `getDynamicMonths()` extends to the current calendar month, so on the first
    // days of a new month "yesterday" points at a month with no rows yet → a
    // scary "Failed to Load" error. Instead, default to the most recent month
    // that actually has data (falling back to the "yesterday" heuristic only if
    // the probe errors). Client-only so `new Date()` uses the user's local time.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            let m: string;
            try {
                const latest = await findLatestMonthWithData(getDynamicMonths(), monthHasData);
                m = latest ?? getDefaultMonth();
            } catch {
                // Probe failed (network/DB) — fall back to the calendar default and
                // let the normal fetch below surface the real error to the user.
                m = getDefaultMonth();
            }
            if (cancelled) return;
            setSelectedMonth(m);
            setSelectedDay(getDefaultDay(m));
            setDefaultsApplied(true);
        })();
        return () => { cancelled = true; };
    }, [monthHasData]);

    // ── Build report from cached month rows for any day (no network call) ──────
    const computeReport = useCallback((rows: SupabaseDailyWaterConsumption[], day: number) => {
        const dayCol = `day_${day}` as keyof SupabaseDailyWaterConsumption;
        const readings: Record<string, number | null> = {};
        for (const row of rows) {
            const val = row[dayCol];
            readings[row.account_number] = val != null ? Number(val) : null;
        }
        return processReport(readings);
    }, []);

    // ── Fetch all rows for a month from Supabase ──────────────────────────────
    const fetchMonth = useCallback(async (month: string, silent = false) => {
        if (!silent) {
            setStatus('loading');
            setErrorMsg('');
        }
        try {
            const client = getSupabaseClient();
            if (!client) throw new Error('Supabase is not configured.');

            const { data, error } = await client
                .from('water_daily_consumption')
                .select(DAILY_WATER_CONSUMPTION_SELECT_COLUMNS)
                .eq('month', month);

            if (error) throw new Error(error.message);

            if (!data || data.length === 0) {
                if (!silent) {
                    // Not a failure — the month simply hasn't been uploaded yet.
                    // Clear cached rows/report so the recompute effect can't
                    // resurrect a previous month's data under the empty state.
                    setMonthData([]);
                    setReportData(null);
                    setErrorMsg('');
                    setStatus('empty');
                }
                return;
            }

            setMonthData(data as unknown as SupabaseDailyWaterConsumption[]);
            setLastFetched(new Date());
            if (!silent) setStatus('success');
        } catch (err) {
            if (!silent) {
                setErrorMsg(err instanceof Error ? err.message : String(err));
                setStatus('error');
            }
        }
    }, []);

    // ── Recompute report whenever cached data OR selected day changes ─────────
    useEffect(() => {
        if (monthData.length === 0) return;
        setReportData(computeReport(monthData, selectedDay));
        setStatus('success');
    }, [monthData, selectedDay, computeReport]);

    // ── Management briefing: pure derivation from the current report, plus the
    //    previous day recomputed from already-cached month rows (no network). ──
    const briefing = useMemo(() => {
        if (!reportData) return null;
        const yesterday = selectedDay > 1 ? computeReport(monthData, selectedDay - 1) : null;
        return computeBriefing(reportData, yesterday);
    }, [reportData, monthData, selectedDay, computeReport]);

    // ── Stable slider handler — inline arrow would recreate every render and
    //    cause Radix Slider to call onValueChange in a loop (infinite updates)
    const handleSliderChange = useCallback((v: number[]) => {
        setSelectedDay(v[0]);
    }, []); // setSelectedDay is a stable useState dispatcher — no deps needed

    // ── Auto-fetch when month changes ─────────────────────────────────────────
    // Guarded by `defaultsApplied` so we only fetch once the client-side
    // "yesterday" default has been applied — avoiding a wasted fetch for the
    // SSR placeholder month.
    useEffect(() => {
        if (!defaultsApplied) return;
        setReportData(null);
        fetchMonth(selectedMonth);
    }, [selectedMonth, fetchMonth, defaultsApplied]);

    // ── Supabase real-time subscription ───────────────────────────────────────
    const { isLive } = useSupabaseRealtime({
        table: 'water_daily_consumption',
        channelName: `water-daily-rt-${selectedMonth}`,
        filter: `month=eq.${selectedMonth}`,
        onChanged: () => fetchMonth(selectedMonth, true),
    });

    // ── Report the data-source state to the page's single StatusChip ──────────
    useEffect(() => {
        if (!onStatusChange) return;
        const syncedAt = lastFetched
            ? lastFetched.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
            : undefined;
        onStatusChange(
            status === 'error' ? { state: 'offline', syncedAt }
            : status === 'loading' ? { state: 'connecting', syncedAt }
            : isLive ? { state: 'live', syncedAt }
            : { state: 'connecting', syncedAt },
        );
    }, [onStatusChange, status, isLive, lastFetched]);

    const selectedYear = selectedMonth.split('-')[1];

    // ── Controls bar ──────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <SectionCard>
                <SectionCard.Body className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                    {/* Year + Month selector */}
                    <div className="flex items-center gap-2">
                        <CalendarDays size={16} strokeWidth={2} className="shrink-0 text-muted" aria-hidden="true" />
                        <select
                            aria-label="Year"
                            value={selectedYear}
                            onChange={e => {
                                const yr = e.target.value;
                                const months = getMonthsForYear(yr);
                                const currentAbbrev = selectedMonth.split('-')[0];
                                const match = months.find(m => m.startsWith(currentAbbrev));
                                const next = match ?? months[months.length - 1];
                                setSelectedMonth(next);
                                setSelectedDay(getDefaultDay(next));
                            }}
                            disabled={status === 'loading'}
                            className={SELECT_CLASS}
                        >
                            {[...getAvailableYears()].reverse().map(yr => (
                                <option key={yr} value={yr}>20{yr}</option>
                            ))}
                        </select>
                        <select
                            aria-label="Month"
                            value={selectedMonth}
                            onChange={e => { const m = e.target.value; setSelectedMonth(m); setSelectedDay(getDefaultDay(m)); }}
                            disabled={status === 'loading'}
                            className={SELECT_CLASS}
                        >
                            {getMonthsForYear(selectedYear).map(m => (
                                <option key={m} value={m}>{m.split('-')[0]}</option>
                            ))}
                        </select>
                    </div>

                    {/* Day selector — own row on mobile (w-full), flex-1 inline on sm+ */}
                    <div className="flex w-full items-center gap-2 sm:w-auto sm:min-w-64 sm:flex-1 sm:gap-3">
                        <Button
                            variant="secondary"
                            icon={ChevronLeft}
                            onClick={() => setSelectedDay(d => Math.max(1, d - 1))}
                            disabled={selectedDay <= 1 || status === 'loading'}
                            aria-label="Previous day"
                        />
                        <div className="min-w-0 flex-1 sm:max-w-56">
                            <Slider
                                value={[selectedDay]}
                                onValueChange={handleSliderChange}
                                min={1} max={maxDay} step={1}
                                disabled={status === 'loading'}
                                aria-label={`Day of ${selectedMonth}`}
                            />
                        </div>
                        <Button
                            variant="secondary"
                            icon={ChevronRight}
                            onClick={() => setSelectedDay(d => Math.min(maxDay, d + 1))}
                            disabled={selectedDay >= maxDay || status === 'loading'}
                            aria-label="Next day"
                        />
                        <span className="min-w-20 text-right text-label tabular-nums text-fg">
                            Day {selectedDay}
                            <span className="text-muted"> / {maxDay}</span>
                        </span>
                    </div>

                    {/* Refresh — the fetch/realtime state itself lives in the page header chip */}
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            variant="ghost"
                            icon={RefreshCw}
                            loading={status === 'loading'}
                            onClick={() => fetchMonth(selectedMonth)}
                            title="Refresh"
                        >
                            Refresh
                        </Button>
                    </div>
                </SectionCard.Body>
            </SectionCard>

            {/* ─── Content ─────────────────────────────────────────────────── */}
            {status === 'loading' && !reportData && <LoadingState />}
            {status === 'error' && <ErrorState message={errorMsg} onRetry={() => fetchMonth(selectedMonth)} />}
            {status === 'empty' && <EmptyState month={selectedMonth} onRetry={() => fetchMonth(selectedMonth)} />}

            {/* ── Section tabs (mirrors the Monthly dashboard). Rendered as soon
                   as the month has been probed — the Hand Readings tab must stay
                   reachable for a month that has no Grafana rows yet. */}
            {(reportData || status === 'empty') && (
                <Tabs<DailyTab>
                    aria-label="Water daily sections"
                    value={activeTab}
                    onChange={setActiveTab}
                    tabs={DAILY_TABS}
                />
            )}

            {/* ── Hand Readings — Kalhat's bulk-meter indexes, own fetch ──── */}
            {(reportData || status === 'empty') && activeTab === 'readings' && (
                <SectionBoundary title="Hand Readings">
                <div id="panel-readings" role="tabpanel" aria-labelledby="tab-readings" tabIndex={0}>
                    <PotableManualPanel initialDate={toDateKeyFromMonth(selectedMonth, selectedDay)} />
                </div>
                </SectionBoundary>
            )}

            {reportData && (
                <>

                    {/* ── Zone Watch — fleet view, heatmap, leak triage ───── */}
                    {activeTab === 'watch' && (
                        <SectionBoundary title="Zone Watch">
                        <div id="panel-watch" role="tabpanel" aria-labelledby="tab-watch" tabIndex={0}>
                            <ZoneWatch
                                briefing={briefing}
                                monthData={monthData}
                                selectedDay={selectedDay}
                                month={selectedMonth}
                                onInspectZone={inspectZone}
                            />
                        </div>
                        </SectionBoundary>
                    )}

                    {/* ── Zone Analysis — per-zone drill-down ─────────────── */}
                    {activeTab === 'zones' && (
                        <SectionBoundary title="Zone Analysis">
                        <div id="panel-zones" role="tabpanel" aria-labelledby="tab-zones" tabIndex={0} className="space-y-6">
                            {/* Zone selector — the same control idiom as the Monthly zone picker */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-label text-fg">Zone</span>
                                <span className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-card px-2.5">
                                    <MapPin size={16} strokeWidth={2} aria-hidden="true" className="shrink-0 text-muted" />
                                    <select
                                        aria-label="Select zone"
                                        value={activeZone}
                                        onChange={e => setActiveZone(e.target.value)}
                                        className="cursor-pointer rounded-control bg-transparent text-label text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                    >
                                        {ZONE_BULK_CONFIG.map(z => (
                                            <option key={z.zoneName} value={z.zoneName}>{z.zoneName}</option>
                                        ))}
                                    </select>
                                </span>
                            </div>

                            <ZoneAnalyticsPanel
                                reportData={reportData}
                                monthData={monthData}
                                selectedDay={selectedDay}
                                month={selectedMonth}
                                activeZoneName={activeZone}
                            />
                            <ZoneL3Table
                                key={activeZone}
                                zoneRow={reportData.zoneRows.find(r => r.zoneName === activeZone)!}
                                zoneConfig={ZONE_BULK_CONFIG.find(z => z.zoneName === activeZone)!}
                                monthData={monthData}
                                buildingRows={reportData.buildingRows}
                            />
                        </div>
                        </SectionBoundary>
                    )}

                    {/* ── Direct Connections ──────────────────────────────── */}
                    {activeTab === 'dc' && (
                        <SectionBoundary title="Direct Connections">
                        <div id="panel-dc" role="tabpanel" aria-labelledby="tab-dc" tabIndex={0} className="space-y-6">
                            <DCAnalyticsPanel
                                reportData={reportData}
                                monthData={monthData}
                                selectedDay={selectedDay}
                                month={selectedMonth}
                            />
                            <DCDailyTable monthData={monthData} />
                        </div>
                        </SectionBoundary>
                    )}

                    {/* ── Daily Database — meter × day ledger ─────────────── */}
                    {activeTab === 'database' && (
                        <SectionBoundary title="Daily Database">
                        <div id="panel-database" role="tabpanel" aria-labelledby="tab-database" tabIndex={0}>
                            <DailyDatabase
                                monthData={monthData}
                                selectedDay={selectedDay}
                                month={selectedMonth}
                            />
                        </div>
                        </SectionBoundary>
                    )}

                    {/* ── Exceptions — daily action queue ─────────────────── */}
                    {activeTab === 'exceptions' && (
                        <SectionBoundary title="Exceptions">
                        <div id="panel-exceptions" role="tabpanel" aria-labelledby="tab-exceptions" tabIndex={0}>
                            <DailyExceptions
                                monthData={monthData}
                                selectedDay={selectedDay}
                                month={selectedMonth}
                            />
                        </div>
                        </SectionBoundary>
                    )}
                </>
            )}
        </div>
    );
}
