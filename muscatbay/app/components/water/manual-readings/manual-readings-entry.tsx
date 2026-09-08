"use client";

/**
 * Entry card — one date, every hand-read meter of a system.
 *
 * Columns: meter · the day's consumption (typed, m³) · note. A blank field
 * means "not recorded" and is stored as no row — never as 0. Inputs are only
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
    type ManualReadingEntry,
} from "@/functions/api/manual-readings";
import type { ManualReading } from "@/entities/manual-readings";
import { saveManualReadingsAction } from "@/actions/water-readings";
import { thBase, tdBase } from "@/components/water/daily-report/inline-shared";

const INPUT_CLASS =
    "h-9 w-full rounded-control border border-line bg-card px-2.5 text-body tabular-nums text-fg outline-none " +
    "placeholder:text-muted focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";

const EDITOR_ROLES = new Set(["admin", "manager", "operator"]);

/** The app-wide table body: 44 px rows, zebra on even rows — the same rule the
 *  migrated Water Monthly ledgers use (`water-monthly-dashboard.tsx`). */
const TBODY = "[&>tr]:h-11 [&>tr:nth-child(even)]:bg-component";

interface Draft {
    value: string;
    note: string;
}

function initialDrafts(rows: { meter: ManualMeter; day: { consumption: number | null; note: string | null } }[]): Record<string, Draft> {
    const next: Record<string, Draft> = {};
    for (const { meter, day } of rows) {
        next[meter.key] = { value: day.consumption === null ? "" : String(day.consumption), note: day.note ?? "" };
    }
    return next;
}

export function ManualReadingsEntry({
    system, date, meters, readings, onSaved, description,
}: {
    system: ManualReadingSystem;
    /** ISO `YYYY-MM-DD` being entered. */
    date: string;
    meters: ManualMeter[];
    /** Every row loaded for the month. */
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
        const stored = day.consumption === null ? "" : String(day.consumption);
        return draft.value.trim() !== stored || draft.note.trim() !== (day.note ?? "");
    });

    const invalid = rows.filter(({ meter }) => parseReadingInput(drafts[meter.key]?.value ?? "") === undefined);

    const save = () => {
        if (!canEdit || changed.length === 0 || invalid.length > 0) return;
        const entries: ManualReadingEntry[] = changed.map(({ meter }) => ({
            key: meter.key,
            consumption: parseReadingInput(drafts[meter.key].value) ?? null,
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
                                <th scope="col" className={cn(thBase, "text-right")}>Consumption (m³)</th>
                                <th scope="col" className={thBase}>Note</th>
                            </tr>
                        </thead>
                        <tbody className={TBODY}>
                            {rows.map(({ meter }) => {
                                const draft = drafts[meter.key] ?? { value: "", note: "" };
                                const typed = parseReadingInput(draft.value);
                                const isInvalid = typed === undefined;
                                const isNegative = typeof typed === "number" && typed < 0;
                                return (
                                    <tr key={meter.key} className="border-b border-line last:border-b-0">
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
                                        <td className={cn(tdBase, "w-48")}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                {isNegative && (
                                                    <span className="inline-flex items-center gap-1 text-caption text-danger" title="Negative consumption — check the figure">
                                                        <AlertTriangle size={14} strokeWidth={2} aria-hidden="true" />
                                                        Negative
                                                    </span>
                                                )}
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    aria-label={`${meter.name} consumption`}
                                                    aria-invalid={isInvalid || undefined}
                                                    placeholder="not recorded"
                                                    value={draft.value}
                                                    disabled={!canEdit || pending}
                                                    onChange={(e) => setDraft(meter.key, { value: e.target.value })}
                                                    className={cn(INPUT_CLASS, "w-32 text-right", isInvalid && "border-danger ring-2 ring-danger")}
                                                />
                                            </div>
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
                                    <td colSpan={3} className={cn(tdBase, "py-6 text-center text-muted")}>
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
                    ? "A figure must be a number with up to three decimals — clear the field to record “not recorded”."
                    : canEdit
                        ? "Enter the day’s consumption for each meter in m³, as on the Kalhat sheet. A blank field means the meter was not recorded — it is never stored as 0."
                        : "Recording readings needs the operator role. Ask an administrator to change your role in Settings."}
            </SectionCard.Footer>
        </SectionCard>
    );
}
