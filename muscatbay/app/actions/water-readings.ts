'use server'

/**
 * @fileoverview Server Action — save hand-recorded meter readings.
 *
 * Runs with the caller's OWN Supabase session (cookie), so Row-Level Security
 * decides who may write: operator, manager and admin can; viewer and
 * contractor get a permission error back, which the form shows verbatim.
 *
 * One call saves one date for one system. A `null` consumption clears that
 * meter's row for the date. For the potable system the database trigger then
 * copies the day into `water_daily_consumption`.
 */

import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
    MANUAL_READING_TABLES,
    validateManualReadings,
    type SaveManualReadingsInput,
} from '@/functions/api/manual-readings';

export interface SaveManualReadingsResult {
    /** Rows written (inserted or updated). */
    saved: number;
    /** Rows removed because the reading was cleared. */
    cleared: number;
    /** Set when nothing was written. Validation problems are joined with newlines. */
    error?: string;
}

export async function saveManualReadingsAction(input: SaveManualReadingsInput): Promise<SaveManualReadingsResult> {
    const problems = validateManualReadings(input);
    if (problems.length > 0) {
        return { saved: 0, cleared: 0, error: problems.join('\n') };
    }

    const tables = MANUAL_READING_TABLES[input.system];

    try {
        const supabase = await getSupabaseServerClient();

        const toWrite = input.entries.filter((e) => e.consumption !== null);
        const toClear = input.entries.filter((e) => e.consumption === null);

        let saved = 0;
        let cleared = 0;

        if (toWrite.length > 0) {
            const rows = toWrite.map((e) => ({
                [tables.keyColumn]: e.key,
                reading_date: input.date,
                consumption: e.consumption,
                note: e.note && e.note.trim() !== '' ? e.note.trim() : null,
            }));
            const { error, count } = await supabase
                .from(tables.readings)
                .upsert(rows, { onConflict: `${tables.keyColumn},reading_date`, count: 'exact' });
            if (error) return { saved: 0, cleared: 0, error: describe(error.message) };
            saved = count ?? rows.length;
        }

        if (toClear.length > 0) {
            const { error, count } = await supabase
                .from(tables.readings)
                .delete({ count: 'exact' })
                .eq('reading_date', input.date)
                .in(tables.keyColumn, toClear.map((e) => e.key));
            if (error) return { saved, cleared: 0, error: describe(error.message) };
            cleared = count ?? 0;
        }

        return { saved, cleared };
    } catch (err) {
        console.error('[water-readings] save failed:', err);
        return { saved: 0, cleared: 0, error: err instanceof Error ? err.message : 'Saving failed on the server' };
    }
}

/** Make the two RLS failure modes readable for an operator. */
function describe(message: string): string {
    if (/row-level security|permission denied/i.test(message)) {
        return 'Your account is not allowed to record readings. Ask an administrator for the operator role.';
    }
    return message;
}
