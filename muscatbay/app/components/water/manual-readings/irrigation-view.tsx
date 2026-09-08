"use client";

/**
 * Irrigation — the fourth Water mode. A separate hand-read network: three
 * sources into the main irrigation tank (bore well, TSE from the STP, the
 * potable line), the tank outlet, and the downstream zone tanks / controllers.
 *
 * Reads through `useManualReadings('irrigation')`; nothing here touches the
 * potable tables. Reports its fetch / realtime state upward so the page keeps
 * ONE status chip (DESIGN_SYSTEM.md §0).
 */

import { useEffect, useMemo, useState } from "react";
import {
    ArrowDownToLine, ArrowUpFromLine, CalendarCheck, RefreshCw, Sprout, TrendingUp, Waves,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button, ChartFrame, SectionCard, chartTheme } from "@/components/ui";
import { StatsGrid, type StatItem } from "@/components/shared/stats-grid";
import { SectionBoundary } from "@/components/shared/section-boundary";
import { Skeleton } from "@/components/shared/skeleton";
import type { ViewStatus } from "@/components/water/daily-water-report";
import { monthLabel, sumConsumption, toDateKey } from "@/functions/api/manual-readings";
import { useManualReadings } from "./use-manual-readings";
import { DateStepper } from "./date-stepper";
import { ManualReadingsEntry } from "./manual-readings-entry";
import { ManualReadingsLedger } from "./manual-readings-ledger";

const timeLabel = (d: Date | null): string | undefined =>
    d ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : undefined;

const fmt = (v: number | null): string =>
    v === null ? "—" : v.toLocaleString("en-GB", { maximumFractionDigits: 0 });

export function IrrigationView({ onStatusChange }: { onStatusChange?: (status: ViewStatus) => void }) {
    // Today from the client's clock. This view is loaded with `ssr: false`
    // (app/water/page.tsx), so there is no server frame to disagree with.
    const [todayKey] = useState(() => toDateKey(new Date()));
    const [date, setDate] = useState(todayKey);
    return <IrrigationLoaded date={date} todayKey={todayKey} onDateChange={setDate} onStatusChange={onStatusChange} />;
}

function IrrigationLoaded({
    date, todayKey, onDateChange, onStatusChange,
}: {
    date: string;
    todayKey: string;
    onDateChange: (d: string) => void;
    onStatusChange?: (status: ViewStatus) => void;
}) {
    const { meters, readings, ledger, status, error, isLive, lastFetched, refetch } = useManualReadings("irrigation", date);

    useEffect(() => {
        if (!onStatusChange) return;
        onStatusChange(
            status === "loading" ? { state: "connecting" }
                : status === "error" ? { state: "offline", syncedAt: timeLabel(lastFetched) }
                    : { state: isLive ? "live" : "connecting", syncedAt: timeLabel(lastFetched) },
        );
    }, [status, isLive, lastFetched, onStatusChange]);

    const label = monthLabel(date);

    // Meter groups by their role in the network.
    const groups = useMemo(() => ({
        source: meters.filter((m) => m.role === "source").map((m) => m.key),
        outlet: meters.filter((m) => m.role === "outlet").map((m) => m.key),
        distribution: meters.filter((m) => m.role === "distribution").map((m) => m.key),
    }), [meters]);

    const kpis = useMemo<StatItem[]>(() => {
        const sources = sumConsumption(ledger, groups.source);
        const outlet = sumConsumption(ledger, groups.outlet);
        const distribution = sumConsumption(ledger, groups.distribution);
        const monthDaysSoFar = ledger[0]?.days.filter((d) => d.date <= todayKey).length ?? 0;
        const daysRecorded = new Set(
            ledger.flatMap(({ days }) => days.filter((d) => d.reading !== null).map((d) => d.date)),
        ).size;
        const dayNote = (s: { daysCounted: number; negatives: number }) =>
            s.daysCounted === 0
                ? `${label} · no consecutive readings yet`
                : `${label} · ${s.daysCounted} day${s.daysCounted === 1 ? "" : "s"} derived${s.negatives ? ` · ${s.negatives} negative` : ""}`;
        return [
            {
                label: "Into main tank",
                value: fmt(sources.total),
                unit: "m³",
                subtitle: dayNote(sources),
                icon: ArrowDownToLine,
                variant: "water",
                status: sources.negatives > 0 ? "warning" : undefined,
            },
            {
                label: "Main tank outlet",
                value: fmt(outlet.total),
                unit: "m³",
                subtitle: dayNote(outlet),
                icon: ArrowUpFromLine,
                variant: "primary",
                status: outlet.negatives > 0 ? "warning" : undefined,
            },
            {
                label: "Zone tanks & controllers",
                value: fmt(distribution.total),
                unit: "m³",
                subtitle: dayNote(distribution),
                icon: Waves,
                variant: "info",
                status: distribution.negatives > 0 ? "warning" : undefined,
            },
            {
                label: "Days recorded",
                value: `${daysRecorded} / ${monthDaysSoFar}`,
                subtitle: `${label} · days with at least one reading`,
                icon: CalendarCheck,
                variant: daysRecorded === 0 ? "warning" : daysRecorded < monthDaysSoFar ? "warning" : "success",
            },
        ];
    }, [ledger, groups, label, todayKey]);

    const trend = useMemo(() => {
        const days = ledger[0]?.days ?? [];
        return days
            .filter((d) => d.date <= todayKey)
            .map((d, i) => {
                const sum = (keys: string[]) => {
                    let total: number | null = null;
                    for (const row of ledger) {
                        if (!keys.includes(row.meter.key)) continue;
                        const c = row.days[i]?.consumption ?? null;
                        if (c !== null) total = (total ?? 0) + c;
                    }
                    return total;
                };
                return {
                    day: Number(d.date.slice(-2)),
                    sources: sum(groups.source),
                    outlet: sum(groups.outlet),
                    distribution: sum(groups.distribution),
                };
            });
    }, [ledger, groups, todayKey]);
    const hasTrend = trend.some((t) => t.sources !== null || t.outlet !== null || t.distribution !== null);

    return (
        <div className="space-y-6">
            {status === "loading" && (
                <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading irrigation readings">
                    <Skeleton className="h-9 w-72 rounded-control" />
                    <Skeleton className="h-kpi w-full rounded-card" />
                    <Skeleton className="h-96 w-full rounded-card" />
                </div>
            )}

            {status === "error" && (
                <SectionCard>
                    <SectionCard.Header icon={Sprout} title="Irrigation readings could not be loaded" />
                    <SectionCard.Body>
                        <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-danger-tint p-4 text-danger">
                            <p className="text-body">{error}</p>
                            <p className="text-caption">
                                Nothing is shown for this month — no figure is estimated or substituted.
                                If this is the first run, the migration <span className="meter">20260908_manual_meter_readings.sql</span> may not be applied yet.
                            </p>
                            <Button variant="secondary" icon={RefreshCw} onClick={() => refetch(false)}>Retry</Button>
                        </div>
                    </SectionCard.Body>
                </SectionCard>
            )}

            {status === "ready" && (
                <>
                    <StatsGrid stats={kpis} />

                    <DateStepper value={date} onChange={onDateChange} max={todayKey} />

                    <SectionBoundary title="Irrigation readings entry">
                        <ManualReadingsEntry
                            system="irrigation"
                            date={date}
                            meters={meters}
                            readings={readings}
                            onSaved={() => refetch(true)}
                            description="Cumulative index of each irrigation meter, m³"
                        />
                    </SectionBoundary>

                    <SectionBoundary title="Irrigation month ledger">
                        <ManualReadingsLedger ledger={ledger} monthLabel={label} selectedDate={date} todayKey={todayKey} />
                    </SectionBoundary>

                    <SectionBoundary title="Irrigation trend">
                        <SectionCard>
                            <SectionCard.Header
                                icon={TrendingUp}
                                title={`Daily flow — ${label}`}
                                description="Into the main tank, out of it, and reaching the zone tanks and controllers"
                            />
                            <SectionCard.Body>
                                {hasTrend ? (
                                    <ChartFrame
                                        series={3}
                                        height="chart-lg"
                                        legend={[
                                            { label: "Into main tank", color: chartTheme.series[2] },
                                            { label: "Main tank outlet", color: chartTheme.series[0] },
                                            { label: "Zone tanks & controllers", color: chartTheme.series[1] },
                                        ]}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={trend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                                                <CartesianGrid {...chartTheme.grid} />
                                                <XAxis dataKey="day" {...chartTheme.axis} interval={2} />
                                                <YAxis {...chartTheme.axis} />
                                                <Tooltip
                                                    {...chartTheme.tooltip}
                                                    labelFormatter={(d) => `Day ${d}`}
                                                    formatter={(value) => (value === null || value === undefined ? "—" : `${Number(value).toLocaleString("en-GB", { maximumFractionDigits: 1 })} m³`)}
                                                />
                                                <Line type="monotone" dataKey="sources" name="Into main tank" stroke={chartTheme.series[2]} {...chartTheme.line} connectNulls={false} />
                                                <Line type="monotone" dataKey="outlet" name="Main tank outlet" stroke={chartTheme.series[0]} {...chartTheme.line} connectNulls={false} />
                                                <Line type="monotone" dataKey="distribution" name="Zone tanks & controllers" stroke={chartTheme.series[1]} {...chartTheme.line} connectNulls={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </ChartFrame>
                                ) : (
                                    <p className="text-body text-muted">
                                        No consecutive readings yet for {label}. The chart appears once two days in a row have been recorded.
                                    </p>
                                )}
                            </SectionCard.Body>
                            <SectionCard.Footer>
                                Gaps in a line are days that could not be derived. Lines are not joined across gaps.
                            </SectionCard.Footer>
                        </SectionCard>
                    </SectionBoundary>
                </>
            )}
        </div>
    );
}
