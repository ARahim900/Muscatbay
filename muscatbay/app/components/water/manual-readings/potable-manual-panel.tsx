"use client";

/**
 * "Hand readings" tab of the Daily view — the potable bulk meters Kalhat reads
 * by hand (Main Bulk, the zone bulks, Central Park).
 *
 * The stored value is the meter index; a database trigger derives each day's
 * consumption into `water_daily_consumption`, which is what every other Daily
 * section reads. So a reading saved here shows up in Zone Watch, the loss
 * balance and the Monthly month-to-date figures on the next refresh — the
 * realtime channel on `water_daily_consumption` triggers that refresh.
 */

import { useState } from "react";
import { Droplets, RefreshCw } from "lucide-react";
import { Button, SectionCard } from "@/components/ui";
import { SectionBoundary } from "@/components/shared/section-boundary";
import { Skeleton } from "@/components/shared/skeleton";
import { monthLabel, toDateKey } from "@/functions/api/manual-readings";
import { useManualReadings } from "./use-manual-readings";
import { DateStepper } from "./date-stepper";
import { ManualReadingsEntry } from "./manual-readings-entry";
import { ManualReadingsLedger } from "./manual-readings-ledger";

export function PotableManualPanel({
    initialDate,
}: {
    /** ISO `YYYY-MM-DD` the Daily view currently has selected; used as the starting date. */
    initialDate: string;
}) {
    // Today from the client's clock. The Daily report (and so this panel) is
    // loaded with `ssr: false`, so there is no server frame to disagree with.
    const [todayKey] = useState(() => toDateKey(new Date()));
    // Follows the Daily view's month/day selector: a new `initialDate` wins
    // over the stepper until the stepper is used again (derived in render).
    const [picked, setPicked] = useState<{ initial: string; date: string } | null>(null);
    const date = picked && picked.initial === initialDate ? picked.date : initialDate;
    const setDate = (d: string) => setPicked({ initial: initialDate, date: d });

    const safeDate = date > todayKey ? todayKey : date;
    return <PotableLoaded date={safeDate} todayKey={todayKey} onDateChange={setDate} />;
}

function PotableLoaded({ date, todayKey, onDateChange }: { date: string; todayKey: string; onDateChange: (d: string) => void }) {
    const { meters, readings, ledger, status, error, refetch } = useManualReadings("potable", date);
    const label = monthLabel(date);

    if (status === "loading") {
        return (
            <div className="space-y-6" role="status" aria-busy="true" aria-label="Loading hand readings">
                <Skeleton className="h-9 w-72 rounded-control" />
                <Skeleton className="h-96 w-full rounded-card" />
            </div>
        );
    }

    if (status === "error") {
        return (
            <SectionCard>
                <SectionCard.Header icon={Droplets} title="Hand readings could not be loaded" />
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
        <div className="space-y-6">
            <DateStepper value={date} onChange={onDateChange} max={todayKey} />

            <SectionBoundary title="Hand readings entry">
                <ManualReadingsEntry
                    system="potable"
                    date={date}
                    meters={meters}
                    readings={readings}
                    onSaved={() => refetch(true)}
                    description="Kalhat daily index of each bulk meter, m³ — consumption feeds the daily table"
                />
            </SectionBoundary>

            <SectionBoundary title="Hand readings month ledger">
                <ManualReadingsLedger ledger={ledger} monthLabel={label} selectedDate={date} todayKey={todayKey} />
            </SectionBoundary>

            <p className="text-caption text-muted">
                “Hand-read only” meters (Main Bulk, Zone 8, Central Park) are never reported by Grafana: the value derived here is
                their only daily figure and a correction always replaces it. For the other bulks the derived value fills an empty
                day only — an instrumented Grafana reading is never overwritten.
            </p>
        </div>
    );
}
