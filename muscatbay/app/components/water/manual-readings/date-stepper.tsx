"use client";

/**
 * Previous / date / next — the one date control for hand-read entry.
 * Bordered, pressable controls per DESIGN_SYSTEM.md §0 ("filters must look
 * pressable"). Days after `max` (today) are unreachable: a reading cannot be
 * recorded for a day that has not happened.
 */

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui";
import { parseDateKey, shiftDateKey } from "@/functions/api/manual-readings";

export function DateStepper({
    value, onChange, max, label = "Reading date",
}: {
    /** ISO `YYYY-MM-DD`. */
    value: string;
    onChange: (next: string) => void;
    /** Latest selectable date key (inclusive). */
    max: string;
    label?: string;
}) {
    const atMax = value >= max;
    const longLabel = parseDateKey(value)?.toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short", year: "numeric",
    });

    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                variant="secondary"
                size="md"
                icon={ChevronLeft}
                aria-label="Previous day"
                onClick={() => onChange(shiftDateKey(value, -1))}
            />
            <span className="inline-flex h-9 items-center gap-1.5 rounded-control border border-line bg-card px-2.5 shadow-card">
                <CalendarDays size={16} strokeWidth={2} className="shrink-0 text-muted" aria-hidden="true" />
                <input
                    type="date"
                    aria-label={label}
                    value={value}
                    max={max}
                    onChange={(e) => {
                        const next = e.target.value;
                        if (parseDateKey(next) && next <= max) onChange(next);
                    }}
                    className="bg-transparent text-label text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
            </span>
            <Button
                variant="secondary"
                size="md"
                icon={ChevronRight}
                aria-label="Next day"
                disabled={atMax}
                onClick={() => onChange(shiftDateKey(value, 1))}
            />
            {longLabel && <span className="text-caption text-muted">{longLabel}</span>}
        </div>
    );
}
