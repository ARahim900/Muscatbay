"use client";

/**
 * Month ledger — meters × days of derived consumption, the same shape as the
 * Kalhat sheet the readings come from. A cell shows "—" when either that day
 * or the day before was not read; hovering a cell shows the two indexes it was
 * derived from. Negative days are marked, never hidden.
 */

import { useMemo } from "react";
import { Table2 } from "lucide-react";
import { SectionCard } from "@/components/ui";
import { cn } from "@/lib/cn";
import { ExportButton } from "@/components/shared/data-table";
import { thBase, tdBase } from "@/components/water/daily-report/inline-shared";
import type { DerivedDay } from "@/functions/api/manual-readings";
import type { ManualMeter } from "@/entities/manual-readings";

const cell = (v: number | null): string =>
    v === null ? "—" : v.toLocaleString("en-GB", { maximumFractionDigits: 1 });

export function ManualReadingsLedger({
    ledger, monthLabel, selectedDate, todayKey,
}: {
    ledger: { meter: ManualMeter; days: DerivedDay[] }[];
    /** "Sep-26" */
    monthLabel: string;
    /** Highlighted column. */
    selectedDate: string;
    /** Days after this are greyed out — they have not happened yet. */
    todayKey: string;
}) {
    const days = ledger[0]?.days ?? [];

    const exportRows = useMemo(
        () => ledger.flatMap(({ meter, days }) => days.map((d) => ({
            meter: meter.name,
            key: meter.key,
            date: d.date,
            reading_m3: d.reading,
            consumption_m3: d.consumption,
            note: d.note ?? "",
        }))),
        [ledger],
    );

    return (
        <SectionCard>
            <SectionCard.Header
                icon={Table2}
                title={`Daily consumption — ${monthLabel}`}
                description="Derived from consecutive hand readings, m³"
                action={<ExportButton rows={exportRows} filename={`hand-readings-${monthLabel}`} />}
            />
            <SectionCard.Body flush>
                <div className="max-h-96 overflow-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th scope="col" className={cn(thBase, "sticky left-0 z-20")}>Meter</th>
                                {days.map((d) => {
                                    const dayNo = Number(d.date.slice(-2));
                                    return (
                                        <th
                                            key={d.date}
                                            scope="col"
                                            className={cn(thBase, "text-right", d.date === selectedDate && "underline underline-offset-4")}
                                        >
                                            {dayNo}
                                        </th>
                                    );
                                })}
                                <th scope="col" className={cn(thBase, "text-right")}>Month</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.map(({ meter, days }) => {
                                const derived = days.filter((d) => d.consumption !== null);
                                const monthTotal = derived.length === 0
                                    ? null
                                    : derived.reduce((s, d) => s + (d.consumption ?? 0), 0);
                                return (
                                    <tr key={meter.key} className="border-b border-line last:border-b-0 odd:bg-component/40">
                                        <th scope="row" className={cn(tdBase, "sticky left-0 z-10 whitespace-nowrap bg-card text-left font-medium")}>
                                            {meter.name}
                                        </th>
                                        {days.map((d) => {
                                            const future = d.date > todayKey;
                                            const negative = d.consumption !== null && d.consumption < 0;
                                            const title = d.reading === null
                                                ? "Not read"
                                                : d.previousReading === null
                                                    ? `Index ${d.reading} m³ · no reading the day before`
                                                    : `${d.previousReading} → ${d.reading} m³`;
                                            return (
                                                <td
                                                    key={d.date}
                                                    title={title}
                                                    className={cn(
                                                        tdBase,
                                                        "text-right tabular-nums",
                                                        future && "text-muted opacity-50",
                                                        d.date === selectedDate && "bg-accent-tint",
                                                        negative && "text-danger font-medium",
                                                    )}
                                                >
                                                    {future ? "" : cell(d.consumption)}
                                                    {negative && <span className="sr-only"> (negative)</span>}
                                                </td>
                                            );
                                        })}
                                        <td className={cn(tdBase, "text-right font-medium tabular-nums")}>{cell(monthTotal)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </SectionCard.Body>
            <SectionCard.Footer>
                “—” = not derivable (that day or the day before was not read). Month = sum of the derivable days only, not an estimate of the full month.
            </SectionCard.Footer>
        </SectionCard>
    );
}
