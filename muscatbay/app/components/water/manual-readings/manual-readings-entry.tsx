"use client";

/**
 * Entry card — one date, every hand-read meter of a system.
 *
 * Columns: meter · previous index · today's index (typed) · derived consumption
 * · note. The consumption preview is today − yesterday and stays "—" until
 * both readings exist, exactly as the stored data will read. Inputs are only
 * editable for operator / manager / admin; everyone else sees the same card
 * read-only with a caption saying why. The hard gate is Supabase RLS — the
 * Server Action returns its permission error verbatim.
 */

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPen, Save } from "lucide-react";
import { Badge, Button, SectionCard } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useAuth } from "@/components/auth/auth-provider";
import { useUserRole } from "@/hooks/useUserRole";
import type { ManualMeter, ManualReadingSystem } from "@/entities/manual-readings";
import {
    deriveDay,
    indexReadings,
    parseReadingInput,
    round3,
    type ManualReadingEntry,
} from "@/functions/api/manual-readings";
import type { ManualReading } from "@/entities/manual-readings";
import { saveManualReadingsAction } from "@/actions/water-readings";
import { thBase, tdBase } from "@/components/water/daily-report/inline-shared";

const INPUT_CLASS =
    "h-9 w-full rounded-control border border-line bg-card px-2.5 text-body tabular-nums text-fg outline-none " +
    "placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

const EDITOR_ROLES = new Set(["admin", "manager", "operator"]);

interface Draft {
    reading: string;
    note: string;
}

function initialDrafts(rows: { meter: ManualMeter; day: { reading: number | null; note: string | null } }[]): Record<string, Draft> {
    const next: Record<string, Draft> = {};
    for (const { meter, day } of rows) {
        next[meter.key] = { reading: day.reading === null ? "" : String(day.reading), note: day.note ?? "" };
    }
    return next;
}

const m3 = (v: number | null): string =>
    v === null ? "—" : v.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 3 });

export function ManualReadingsEntry({
    system, date, meters, readings, onSaved, description,
}: {
    system: ManualReadingSystem;
    /** ISO `YYYY-MM-DD` being entered. */
    date: string;
    meters: ManualMeter[];
    /** Every reading loaded for the month (the day before `date` must be included). */
    readings: ManualReading[];
    /** Called after a successful save so the owner can refetch. */
    onSaved: () => void;
    description?: string;
}) {
    const role = useUserRole();
    const { isDevMode } = useAuth();
    const canEdit = isDevMode || EDITOR_ROLES.has(role);

    const index = useMemo(() => indexReadings(readings), [readings]);
    const rows = useMemo(() => meters.map((meter) => ({ meter, day: deriveDay(index, meter.key, date) })), [meters, index, date]);

    // Drafts belong to one `rows` value (memoised on date + loaded readings),
    // so a new date or a refetch after saving starts from the stored values
    // again — derived during render, no effect needed.
    const [draftState, setDraftState] = useState<{ rows: typeof rows; drafts: Record<string, Draft> } | null>(null);
    const drafts = draftState && draftState.rows === rows ? draftState.drafts : initialDrafts(rows);
    const setDraft = (key: string, patch: Partial<Draft>) =>
        setDraftState((prev) => {
            const base = prev && prev.rows === rows ? prev.drafts : initialDrafts(rows);
            return { rows, drafts: { ...base, [key]: { ...base[key], ...patch } } };
        });

    // The save outcome is tied to the date it was saved for.
    const [outcome, setOutcomeState] = useState<{ forDate: string; tone: "success" | "danger"; text: string } | null>(null);
    const setOutcome = (next: { tone: "success" | "danger"; text: string } | null) =>
        setOutcomeState(next ? { ...next, forDate: date } : null);
    const visibleOutcome = outcome && outcome.forDate === date ? outcome : null;
    const [pending, startTransition] = useTransition();

    const changed = rows.filter(({ meter, day }) => {
        const draft = drafts[meter.key];
        if (!draft) return false;
        const stored = day.reading === null ? "" : String(day.reading);
        return draft.reading.trim() !== stored || draft.note.trim() !== (day.note ?? "");
    });

    const invalid = rows.filter(({ meter }) => parseReadingInput(drafts[meter.key]?.reading ?? "") === undefined);

    const save = () => {
        if (!canEdit || changed.length === 0 || invalid.length > 0) return;
        const entries: ManualReadingEntry[] = changed.map(({ meter }) => ({
            key: meter.key,
            reading: parseReadingInput(drafts[meter.key].reading) ?? null,
            note: drafts[meter.key].note,
        }));
        startTransition(async () => {
            const result = await saveManualReadingsAction({ system, date, entries });
            if (result.error) {
                setOutcome({ tone: "danger", text: result.error });
                return;
            }
            const parts: string[] = [];
            if (result.saved > 0) parts.push(`${result.saved} reading${result.saved === 1 ? "" : "s"} saved`);
            if (result.cleared > 0) parts.push(`${result.cleared} cleared`);
            setOutcome({ tone: "success", text: parts.join(", ") || "Nothing changed" });
            onSaved();
        });
    };

    return (
        <SectionCard>
            <SectionCard.Header
                icon={ClipboardPen}
                title="Record readings"
                description={description}
                action={
                    canEdit ? (
                        <Button
                            variant="primary"
                            icon={Save}
                            loading={pending}
                            disabled={changed.length === 0 || invalid.length > 0}
                            onClick={save}
                        >
                            Save{changed.length > 0 ? ` (${changed.length})` : ""}
                        </Button>
                    ) : (
                        <Badge tone="neutral">Read-only</Badge>
                    )
                }
            />
            <SectionCard.Body flush>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th scope="col" className={thBase}>Meter</th>
                                <th scope="col" className={cn(thBase, "text-right")}>Previous (m³)</th>
                                <th scope="col" className={cn(thBase, "text-right")}>Reading (m³)</th>
                                <th scope="col" className={cn(thBase, "text-right")}>Consumption (m³)</th>
                                <th scope="col" className={thBase}>Note</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(({ meter, day }) => {
                                const draft = drafts[meter.key] ?? { reading: "", note: "" };
                                const typed = parseReadingInput(draft.reading);
                                const preview =
                                    typed === undefined ? null
                                        : typed === null ? null
                                            : day.previousReading === null ? null
                                                : round3(typed - day.previousReading);
                                const isInvalid = typed === undefined;
                                const isNegative = preview !== null && preview < 0;
                                return (
                                    <tr key={meter.key} className="border-b border-line last:border-b-0 odd:bg-component/40">
                                        <td className={cn(tdBase, "min-w-48")}>
                                            <div className="flex flex-col">
                                                <span className="text-body text-fg">{meter.name}</span>
                                                <span className="flex flex-wrap items-center gap-1.5 text-caption text-muted">
                                                    {system === "potable" && <span className="meter">{meter.key}</span>}
                                                    {meter.location && <span>{meter.location}</span>}
                                                    {system === "potable" && (
                                                        <Badge tone={meter.manualOwned ? "info" : "neutral"}>
                                                            {meter.manualOwned ? "Hand-read only" : "Fills Grafana gaps"}
                                                        </Badge>
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={cn(tdBase, "text-right tabular-nums text-muted")}>
                                            {m3(day.previousReading)}
                                        </td>
                                        <td className={cn(tdBase, "w-40")}>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                aria-label={`${meter.name} reading`}
                                                aria-invalid={isInvalid || undefined}
                                                placeholder="not read"
                                                value={draft.reading}
                                                disabled={!canEdit || pending}
                                                onChange={(e) => setDraft(meter.key, { reading: e.target.value })}
                                                className={cn(INPUT_CLASS, "text-right", isInvalid && "border-danger ring-2 ring-danger")}
                                            />
                                        </td>
                                        <td className={cn(tdBase, "text-right tabular-nums", isNegative && "text-danger")}>
                                            <span className="inline-flex items-center justify-end gap-1.5">
                                                {isNegative && <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />}
                                                {m3(preview)}
                                            </span>
                                            {preview === null && typed !== null && typed !== undefined && day.previousReading === null && (
                                                <p className="text-caption text-muted">no reading the day before</p>
                                            )}
                                        </td>
                                        <td className={cn(tdBase, "min-w-48")}>
                                            <input
                                                type="text"
                                                aria-label={`${meter.name} note`}
                                                maxLength={500}
                                                placeholder="optional"
                                                value={draft.note}
                                                disabled={!canEdit || pending}
                                                onChange={(e) => setDraft(meter.key, { note: e.target.value })}
                                                className={INPUT_CLASS}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={5} className={cn(tdBase, "py-6 text-center text-muted")}>
                                        No meters are registered for this system.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {visibleOutcome && (
                    <div
                        role={visibleOutcome.tone === "danger" ? "alert" : "status"}
                        className={cn(
                            "m-5 flex items-start gap-2 rounded-card p-3 text-body",
                            visibleOutcome.tone === "danger" ? "bg-danger-tint text-danger" : "bg-success-tint text-success",
                        )}
                    >
                        {visibleOutcome.tone === "danger"
                            ? <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />
                            : <CheckCircle2 size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden="true" />}
                        <span className="whitespace-pre-line">{visibleOutcome.text}</span>
                    </div>
                )}
            </SectionCard.Body>
            <SectionCard.Footer tone={invalid.length > 0 ? "danger" : canEdit ? "neutral" : "info"}>
                {invalid.length > 0
                    ? "A reading must be a number with up to three decimals — clear the field to record “not read”."
                    : canEdit
                        ? "Enter the cumulative index shown on the meter, in m³. Consumption is today’s index minus yesterday’s; a blank field means the meter was not read."
                        : "Recording readings needs the operator role. Ask an administrator to change your role in Settings."}
            </SectionCard.Footer>
        </SectionCard>
    );
}
