"use client";

/**
 * Hand Readings — the fourth Water mode. The readings Kalhat staff record by
 * hand every day, in two separate tables:
 *
 *   Irrigation    — its own network and its own tables (irrigation_meters /
 *                   irrigation_daily_readings). Never touches the potable data.
 *   Potable water — the bulk meters Grafana misses (Main Bulk, the zone bulks,
 *                   Central Park). Stored in water_manual_readings; a DB trigger
 *                   derives each day's consumption into water_daily_consumption
 *                   so the Daily, Monthly, Satellite and dashboard views see it.
 *
 * Entry is per DAY: pick a date, type each meter's consumption for that day,
 * save. A day with nothing recorded stays "—", never 0. The KPI row describes
 * the selected day; the log below lists every day of the month so a missed
 * day is visible at a glance.
 *
 * Reports its fetch / realtime state upward so the page keeps ONE status chip.
 */

import { useEffect, useMemo, useState } from "react";
import {
    ArrowDownToLine, ArrowUpFromLine, CalendarCheck, Droplets, Gauge, MapPin, RefreshCw,
    Sprout, TrendingUp, Waves,
} from "lucide-react";
import {
    Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button, ChartFrame, SectionCard, Tabs, chartTheme, type TabItem } from "@/components/ui";
import { StatsGrid, type StatItem } from "@/components/shared/stats-grid";
import { SectionBoundary } from "@/components/shared/section-boundary";
import { Skeleton } from "@/components/shared/skeleton";
import { saveFilterPreferences, loadFilterPreferences } from "@/lib/filter-preferences";
import { MAIN_BULK_ACCOUNT } from "@/lib/water-accounts";
import type { ViewStatus } from "@/components/water/daily-water-report";
import type { ManualMeter, ManualReadingSystem } from "@/entities/manual-readings";
import { monthLabel, sumConsumption, toDateKey, type DerivedDay } from "@/functions/api/manual-readings";
import { useManualReadings } from "./use-manual-readings";
import { DateStepper } from "./date-stepper";
import { ManualReadingsEntry } from "./manual-readings-entry";
import { ManualReadingsLedger } from "./manual-readings-ledger";

/** "Central park" on the Kalhat sheet = the existing Irrigation Tank 02 meter. */
const CENTRAL_PARK_ACCOUNT = "4300320";

const SYSTEM_TABS: TabItem<ManualReadingSystem>[] = [
    { value: "irrigation", label: "Irrigation", icon: Sprout },
    { value: "potable", label: "Potable water", icon: Droplets },
];
const isSystem = (v: unknown): v is ManualReadingSystem => v === "irrigation" || v === "potable";

const timeLabel = (d: Date | null): string | undefined =>
    d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : undefined;

const fmt = (v: number | null): string =>
    v === null ? "—" : v.toLocaleString("en-GB", { maximumFractionDigits: 1 });

type Ledger = { meter: ManualMeter; days: DerivedDay[] }[];

/** Sum of the derived consumption of `keys` on ONE day; `null` if none was derivable. */
function dayTotal(ledger: Ledger, keys: readonly string[], date: string): number | null {
    let total: number | null = null;
    for (const row of ledger) {
        if (!keys.includes(row.meter.key)) continue;
        const c = row.days.find((d) => d.date === date)?.consumption ?? null;
        if (c !== null) total = (total ?? 0) + c;
    }
    return total === null ? null : Math.round(total * 1000) / 1000;
}

/** "Month to date 1,234 m³ · 7 days" for a KPI subtitle; honest when nothing is derivable. */
function mtdNote(ledger: Ledger, keys: readonly string[], label: string): string {
    const s = sumConsumption(ledger, keys);
    if (s.daysCounted === 0) return `${label} · nothing recorded yet`;
    return `${label} to date ${fmt(s.total)} m³ · ${s.daysCounted} day${s.daysCounted === 1 ? "" : "s"}${s.negatives ? ` · ${s.negatives} negative` : ""}`;
}

export function HandReadingsView({ onStatusChange }: { onStatusChange?: (status: ViewStatus) => void }) {
    // Today from the client's clock. This view is loaded with `ssr: false`
    // (app/water/page.tsx), so there is no server frame to disagree with.
    const [todayKey] = useState(() => toDateKey(new Date()));
    // One date for both tables — Kalhat records both systems on the same day.
    const [date, setDate] = useState(todayKey);
    const [system, setSystem] = useState<ManualReadingSystem>(() => {
        const prefs = loadFilterPreferences<{ system?: string }>("water-hand-readings");
        return isSystem(prefs?.system) ? prefs.system : "irrigation";
    });
    useEffect(() => { saveFilterPreferences("water-hand-readings", { system }); }, [system]);

    return (
        <div className="space-y-6">
            <Tabs<ManualReadingSystem>
                aria-label="Hand readings systems"
                value={system}
                onChange={setSystem}
                tabs={SYSTEM_TABS}
            />
            <div id={`panel-${system}`} role="tabpanel" aria-labelledby={`tab-${system}`} tabIndex={0} className="space-y-6">
                <DateStepper value={date} onChange={setDate} max={todayKey} />
                <SystemPanel key={system} system={system} date={date} todayKey={todayKey} onStatusChange={onStatusChange} />
            </div>
        </div>
    );
}

function SystemPanel({
    system, date, todayKey, onStatusChange,
}: {
    system: ManualReadingSystem;
    date: string;
    todayKey: string;
    onStatusChange?: (status: ViewStatus) => void;
}) {
    const { meters, readings, ledger, status, error, isLive, lastFetched, refetch } = useManualReadings(system, date);

    useEffect(() => {
        if (!onStatusChange) return;
        onStatusChange(
            status === "loading" ? { state: "connecting" }
                : status === "error" ? { state: "offline", syncedAt: timeLabel(lastFetched) }
                    : { state: isLive ? "live" : "connecting", syncedAt: timeLabel(lastFetched) },
        );
    }, [status, isLive, lastFetched, onStatusChange]);

    const label = monthLabel(date);

    // Meter groups — irrigation by network role, potable by what the meter is.
    const groups = useMemo(() => {
        if (system === "irrigation") {
            return {
                a: meters.filter((m) => m.role === "source").map((m) => m.key),
                b: meters.filter((m) => m.role === "outlet").map((m) => m.key),
                c: meters.filter((m) => m.role === "distribution").map((m) => m.key),
            };
        }
        return {
            a: meters.filter((m) => m.key === MAIN_BULK_ACCOUNT).map((m) => m.key),
            b: meters.filter((m) => m.key !== MAIN_BULK_ACCOUNT && m.key !== CENTRAL_PARK_ACCOUNT).map((m) => m.key),
            c: meters.filter((m) => m.key === CENTRAL_PARK_ACCOUNT).map((m) => m.key),
        };
    }, [meters, system]);

    const kpis = useMemo<StatItem[]>(() => {
        const readToday = ledger.filter((row) => row.days.find((d) => d.date === date)?.consumption !== null).length;
        const names = system === "irrigation"
            ? { a: "Into main tank", b: "Main tank outlet", c: "Zone tanks & controllers" }
            : { a: "Main Bulk (NAMA)", b: "Zone bulks", c: "Central Park" };
        const icons = system === "irrigation"
            ? { a: ArrowDownToLine, b: ArrowUpFromLine, c: Waves }
            : { a: Gauge, b: MapPin, c: Waves };
        const tile = (g: "a" | "b" | "c", variant: StatItem["variant"]): StatItem => {
            const v = dayTotal(ledger, groups[g], date);
            return {
                label: names[g],
                value: fmt(v),
                unit: "m³",
                subtitle: mtdNote(ledger, groups[g], label),
                icon: icons[g],
                variant,
                status: v !== null && v < 0 ? "warning" : undefined,
            };
        };
        return [
            tile("a", "water"),
            tile("b", "primary"),
            tile("c", "info"),
            {
                label: "Meters recorded",
                value: `${readToday} / ${meters.length}`,
                subtitle: `${date} · a blank meter is "not recorded", never 0`,
                icon: CalendarCheck,
                variant: meters.length === 0 ? "primary" : readToday === meters.length ? "success" : readToday === 0 ? "danger" : "warning",
            },
        ];
    }, [ledger, groups, meters.length, date, label, system]);

    const trend = useMemo(() => {
        const days = ledger[0]?.days ?? [];
        return days
            .filter((d) => d.date <= todayKey)
            .map((d) => ({
                day: Number(d.date.slice(-2)),
                a: dayTotal(ledger, groups.a, d.date),
                b: dayTotal(ledger, groups.b, d.date),
                c: dayTotal(ledger, groups.c, d.date),
            }));
    }, [ledger, groups, todayKey]);
    const hasTrend = trend.some((t) => t.a !== null || t.b !== null || t.c !== null);

    // The leading series (main supply) carries the average line and the Max
    // marker, as on the app's other trend charts. Both are computed over the
    // RECORDED days only — a blank day is never treated as a zero.
    const leadStats = useMemo(() => {
        const recorded = trend.filter((t): t is typeof t & { a: number } => t.a !== null);
        if (recorded.length === 0) return null;
        const peak = recorded.reduce((best, t) => (t.a > best.a ? t : best), recorded[0]);
        return {
            avg: Math.round((recorded.reduce((sum, t) => sum + t.a, 0) / recorded.length) * 10) / 10,
            days: recorded.length,
            maxDay: peak.day,
            maxValue: peak.a,
        };
    }, [trend]);

    const legend = system === "irrigation"
        ? [
            { label: "Into main tank", color: chartTheme.series[2] },
            { label: "Main tank outlet", color: chartTheme.series[0] },
            { label: "Zone tanks & controllers", color: chartTheme.series[1] },
        ]
        : [
            { label: "Main Bulk (NAMA)", color: chartTheme.series[2] },
            { label: "Zone bulks", color: chartTheme.series[0] },
            { label: "Central Park", color: chartTheme.series[1] },
        ];

    if (status === "loading") {
        return (
            <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading hand readings">
                <Skeleton className="h-kpi w-full rounded-card" />
                <Skeleton className="h-96 w-full rounded-card" />
            </div>
        );
    }

    if (status === "error") {
        return (
            <SectionCard>
                <SectionCard.Header icon={system === "irrigation" ? Sprout : Droplets} title="Hand readings could not be loaded" />
                <SectionCard.Body>
                    <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-danger-tint p-4 text-danger">
                        <p className="text-body">{error}</p>
                        <p className="text-caption">
                            Nothing is shown — no figure is estimated or substituted. If this is the first run, the migration{" "}
                            <span className="meter">20260908_manual_meter_readings.sql</span> may not be applied yet.
                        </p>
                        <Button variant="secondary" icon={RefreshCw} onClick={() => refetch(false)}>Retry</Button>
                    </div>
                </SectionCard.Body>
            </SectionCard>
        );
    }

    return (
        <>
            <StatsGrid stats={kpis} />

            <SectionBoundary title="Hand readings entry">
                <ManualReadingsEntry
                    system={system}
                    date={date}
                    meters={meters}
                    readings={readings}
                    onSaved={() => refetch(true)}
                    description={system === "irrigation"
                        ? "Each irrigation meter's consumption on the selected day, m³"
                        : "Each bulk meter's consumption on the selected day, m³ — copied into the daily table"}
                />
            </SectionBoundary>

            <SectionBoundary title="Hand readings daily log">
                <ManualReadingsLedger ledger={ledger} monthLabel={label} selectedDate={date} todayKey={todayKey} />
            </SectionBoundary>

            <SectionBoundary title="Hand readings trend">
                <SectionCard>
                    <SectionCard.Header
                        icon={TrendingUp}
                        title={`Daily consumption — ${label}`}
                        description={system === "irrigation"
                            ? "Into the main tank, out of it, and reaching the zone tanks and controllers"
                            : "Main Bulk supply against the zone bulks and Central Park"}
                    />
                    <SectionCard.Body>
                        {hasTrend ? (
                            <ChartFrame series={3} height="chart-lg" legend={legend}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trend} margin={{ top: 16, right: 28, left: 0, bottom: 0 }}>
                                        {/* One gradient per series — the app-wide area treatment
                                            (STP Load vs Recovery, Electricity consumption). */}
                                        <defs>
                                            {legend.map((l, i) => (
                                                <linearGradient key={l.label} id={`hr-${system}-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={l.color} stopOpacity={i === 0 ? 0.38 : 0.22} />
                                                    <stop offset="95%" stopColor={l.color} stopOpacity={0} />
                                                </linearGradient>
                                            ))}
                                        </defs>
                                        <CartesianGrid {...chartTheme.grid} />
                                        <XAxis dataKey="day" {...chartTheme.axis} interval={2} />
                                        <YAxis
                                            {...chartTheme.axis}
                                            width={52}
                                            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                                        />
                                        <Tooltip
                                            {...chartTheme.tooltip}
                                            labelFormatter={(d) => `Day ${d}`}
                                            formatter={(value) => (value === null || value === undefined ? "—" : `${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 1 })} m³`)}
                                        />
                                        {(["a", "b", "c"] as const).map((key, i) => (
                                            <Area
                                                key={key}
                                                type="natural"
                                                dataKey={key}
                                                name={legend[i].label}
                                                stroke={legend[i].color}
                                                fill={`url(#hr-${system}-${i})`}
                                                strokeWidth={i === 0 ? 3 : 2}
                                                connectNulls={false}
                                                dot={false}
                                                activeDot={{ r: 5, stroke: "var(--color-card)", strokeWidth: 2 }}
                                            />
                                        ))}
                                        {/* Drawn after the areas so both sit above the fill. */}
                                        {leadStats && (
                                            <ReferenceLine
                                                y={leadStats.avg}
                                                stroke={chartTheme.target}
                                                strokeDasharray="6 4"
                                                strokeWidth={2}
                                                ifOverflow="extendDomain"
                                                label={{
                                                    value: `Avg ${fmt(leadStats.avg)}`,
                                                    position: "insideBottomRight",
                                                    fill: "var(--color-muted)",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                }}
                                            />
                                        )}
                                        {leadStats && (
                                            <ReferenceDot
                                                x={leadStats.maxDay}
                                                y={leadStats.maxValue}
                                                r={4}
                                                fill={legend[0].color}
                                                stroke="var(--color-card)"
                                                strokeWidth={2}
                                                label={{
                                                    value: "Max",
                                                    position: "top",
                                                    fill: "var(--color-muted)",
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                }}
                                            />
                                        )}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartFrame>
                        ) : (
                            <p className="text-body text-muted">
                                Nothing recorded yet for {label}. The chart appears once a day has been saved.
                            </p>
                        )}
                    </SectionCard.Body>
                    <SectionCard.Footer>
                        Gaps are days with nothing recorded — lines are not joined across them.
                        {leadStats
                            ? ` The dashed line is ${legend[0].label.toLowerCase()} averaged over its ${leadStats.days} recorded day${leadStats.days === 1 ? "" : "s"}, not over the whole month.`
                            : ""}
                    </SectionCard.Footer>
                </SectionCard>
            </SectionBoundary>

            {system === "potable" && (
                <p className="text-caption text-muted">
                    “Hand-read only” meters (Main Bulk, Zone 8, Central Park) are never reported by Grafana: the figure recorded here is
                    their only daily value and a correction always replaces it. For the other bulks the figure fills an empty day
                    only — an instrumented Grafana reading is never overwritten.
                </p>
            )}
        </>
    );
}
