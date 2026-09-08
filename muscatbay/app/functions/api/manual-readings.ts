/**
 * @fileoverview Manual meter readings — readers and pure derivation helpers.
 *
 * Two hand-read systems share one code path, selected by `ManualReadingSystem`:
 *
 *   potable    → water_manual_meters / water_manual_readings   (key = account number)
 *   irrigation → irrigation_meters   / irrigation_daily_readings (key = meter key)
 *
 * Readings are CUMULATIVE METER INDEXES (m³). Consumption for a day is
 * today − yesterday and is `null` whenever either reading is absent — an
 * unread day is never shown as 0 (CLAUDE.md non-negotiable #1).
 *
 * Isomorphic: no `next/*`, no `window` — `mobile/` bundles this file as-is.
 * Writes live in `actions/water-readings.ts`.
 *
 * @module functions/api/manual-readings
 */

import { type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabase-client';
import type {
    IrrigationMeterRow,
    IrrigationReadingRow,
    ManualMeter,
    ManualReading,
    ManualReadingSystem,
    WaterManualMeterRow,
    WaterManualReadingRow,
} from '@/entities/manual-readings';

// ─── Table map ───────────────────────────────────────────────────────────────

interface SystemTables {
    meters: string;
    readings: string;
    /** Column that identifies the meter in both tables. */
    keyColumn: string;
}

export const MANUAL_READING_TABLES: Record<ManualReadingSystem, SystemTables> = {
    potable: { meters: 'water_manual_meters', readings: 'water_manual_readings', keyColumn: 'account_number' },
    irrigation: { meters: 'irrigation_meters', readings: 'irrigation_daily_readings', keyColumn: 'meter_key' },
};

export const MANUAL_READING_SYSTEMS: readonly ManualReadingSystem[] = ['potable', 'irrigation'];

export function isManualReadingSystem(value: unknown): value is ManualReadingSystem {
    return value === 'potable' || value === 'irrigation';
}

// ─── Date helpers (local calendar, no UTC drift) ─────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` from a Date, using the LOCAL calendar (never `toISOString`, which is UTC). */
export function toDateKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** Parse `YYYY-MM-DD` into a local-midnight Date, or `null` if malformed / impossible. */
export function parseDateKey(key: string): Date | null {
    if (!ISO_DATE.test(key)) return null;
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    // Reject rollovers such as 2026-02-30 (which JS would turn into 2 March).
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
}

/** `key ± n` days, as a date key. */
export function shiftDateKey(key: string, days: number): string {
    const d = parseDateKey(key);
    if (!d) throw new Error(`Invalid date key: ${key}`);
    d.setDate(d.getDate() + days);
    return toDateKey(d);
}

/** Every date key of the calendar month containing `key`, in order. */
export function monthDateKeys(key: string): string[] {
    const d = parseDateKey(key);
    if (!d) throw new Error(`Invalid date key: ${key}`);
    const y = d.getFullYear();
    const m = d.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: days }, (_, i) => toDateKey(new Date(y, m, i + 1)));
}

/** "Sep-26" for a date key — the same `Mon-YY` label the potable daily table uses. */
export function monthLabel(key: string): string {
    const d = parseDateKey(key);
    if (!d) return key;
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;
}

// ─── Row → normalised shape ──────────────────────────────────────────────────

/** PostgREST serialises `numeric` as a string; `null` stays `null`. */
function toNumberOrNull(v: number | string | null | undefined): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
}

function normalisePotableMeter(row: WaterManualMeterRow): ManualMeter {
    return {
        key: row.account_number,
        name: row.display_name,
        location: null,
        role: null,
        manualOwned: row.manual_owned,
        sortOrder: row.sort_order,
    };
}

function normaliseIrrigationMeter(row: IrrigationMeterRow): ManualMeter {
    return {
        key: row.meter_key,
        name: row.display_name,
        location: row.location,
        role: row.role,
        manualOwned: true,
        sortOrder: row.sort_order,
    };
}

function normalisePotableReading(row: WaterManualReadingRow): ManualReading | null {
    const reading = toNumberOrNull(row.reading);
    if (reading === null) return null;
    return {
        key: row.account_number,
        date: row.reading_date,
        reading,
        note: row.note,
        appliedConsumption: toNumberOrNull(row.applied_consumption),
    };
}

function normaliseIrrigationReading(row: IrrigationReadingRow): ManualReading | null {
    const reading = toNumberOrNull(row.reading);
    if (reading === null) return null;
    return { key: row.meter_key, date: row.reading_date, reading, note: row.note, appliedConsumption: null };
}

// ─── Readers ─────────────────────────────────────────────────────────────────

export interface ManualMetersResult {
    meters: ManualMeter[];
    /** Set when the read failed — the caller must show it, never an empty list as if nothing exists. */
    error: string | null;
}

export interface ManualReadingsResult {
    readings: ManualReading[];
    error: string | null;
}

const NOT_CONFIGURED = 'Supabase is not configured';

/** Active hand-read meters for one system, in display order. */
export async function fetchManualMeters(
    system: ManualReadingSystem,
    clientOverride?: SupabaseClient,
): Promise<ManualMetersResult> {
    const client = clientOverride ?? getSupabaseClient();
    if (!client) return { meters: [], error: NOT_CONFIGURED };

    const tables = MANUAL_READING_TABLES[system];
    try {
        if (system === 'potable') {
            const { data, error } = await client
                .from(tables.meters)
                .select('account_number, display_name, sort_order, manual_owned, is_active')
                .eq('is_active', true)
                .order('sort_order')
                .returns<WaterManualMeterRow[]>();
            if (error) return { meters: [], error: `Could not read hand-read meters: ${error.message}` };
            return { meters: (data ?? []).map(normalisePotableMeter), error: null };
        }
        const { data, error } = await client
            .from(tables.meters)
            .select('meter_key, display_name, location, role, sort_order, is_active')
            .eq('is_active', true)
            .order('sort_order')
            .returns<IrrigationMeterRow[]>();
        if (error) return { meters: [], error: `Could not read irrigation meters: ${error.message}` };
        return { meters: (data ?? []).map(normaliseIrrigationMeter), error: null };
    } catch (err) {
        return { meters: [], error: err instanceof Error ? err.message : 'Unexpected error reading meters' };
    }
}

/**
 * Readings for every meter of one system between two date keys (inclusive).
 * Callers that want consumption for `from` should ask from `from − 1 day`, as
 * `fetchManualReadingsForMonth` does.
 */
export async function fetchManualReadings(
    system: ManualReadingSystem,
    fromDate: string,
    toDate: string,
    clientOverride?: SupabaseClient,
): Promise<ManualReadingsResult> {
    const client = clientOverride ?? getSupabaseClient();
    if (!client) return { readings: [], error: NOT_CONFIGURED };

    const tables = MANUAL_READING_TABLES[system];
    try {
        if (system === 'potable') {
            const { data, error } = await client
                .from(tables.readings)
                .select('id, account_number, reading_date, reading, note, applied_consumption, updated_at')
                .gte('reading_date', fromDate)
                .lte('reading_date', toDate)
                .order('reading_date')
                .limit(2000)
                .returns<WaterManualReadingRow[]>();
            if (error) return { readings: [], error: `Could not read hand readings: ${error.message}` };
            return {
                readings: (data ?? []).map(normalisePotableReading).filter((r): r is ManualReading => r !== null),
                error: null,
            };
        }
        const { data, error } = await client
            .from(tables.readings)
            .select('id, meter_key, reading_date, reading, note, updated_at')
            .gte('reading_date', fromDate)
            .lte('reading_date', toDate)
            .order('reading_date')
            .limit(2000)
            .returns<IrrigationReadingRow[]>();
        if (error) return { readings: [], error: `Could not read irrigation readings: ${error.message}` };
        return {
            readings: (data ?? []).map(normaliseIrrigationReading).filter((r): r is ManualReading => r !== null),
            error: null,
        };
    } catch (err) {
        return { readings: [], error: err instanceof Error ? err.message : 'Unexpected error reading readings' };
    }
}

/**
 * Readings for the calendar month of `dateKey`, plus the last day of the
 * previous month so day 1's consumption can be derived.
 */
export async function fetchManualReadingsForMonth(
    system: ManualReadingSystem,
    dateKey: string,
    clientOverride?: SupabaseClient,
): Promise<ManualReadingsResult> {
    const days = monthDateKeys(dateKey);
    return fetchManualReadings(system, shiftDateKey(days[0], -1), days[days.length - 1], clientOverride);
}

// ─── Pure derivation ─────────────────────────────────────────────────────────

/** One meter on one day, as the UI needs it. */
export interface DerivedDay {
    key: string;
    date: string;
    /** Today's index, or `null` if not read. */
    reading: number | null;
    /** Yesterday's index, or `null` if not read. */
    previousReading: number | null;
    /** today − yesterday; `null` unless both were read. Negative is kept and must be flagged. */
    consumption: number | null;
    note: string | null;
    appliedConsumption: number | null;
}

/** `readings` indexed as key → date → reading. */
export function indexReadings(readings: ManualReading[]): Map<string, Map<string, ManualReading>> {
    const byKey = new Map<string, Map<string, ManualReading>>();
    for (const r of readings) {
        let byDate = byKey.get(r.key);
        if (!byDate) {
            byDate = new Map();
            byKey.set(r.key, byDate);
        }
        byDate.set(r.date, r);
    }
    return byKey;
}

/** Derive one meter-day from the index. */
export function deriveDay(
    index: Map<string, Map<string, ManualReading>>,
    key: string,
    date: string,
): DerivedDay {
    const byDate = index.get(key);
    const today = byDate?.get(date) ?? null;
    const yesterday = byDate?.get(shiftDateKey(date, -1)) ?? null;
    const reading = today?.reading ?? null;
    const previousReading = yesterday?.reading ?? null;
    return {
        key,
        date,
        reading,
        previousReading,
        consumption: reading !== null && previousReading !== null ? round3(reading - previousReading) : null,
        note: today?.note ?? null,
        appliedConsumption: today?.appliedConsumption ?? null,
    };
}

/** meters × dates grid of derived days, meters in display order. */
export function buildLedger(
    meters: ManualMeter[],
    readings: ManualReading[],
    dates: string[],
): { meter: ManualMeter; days: DerivedDay[] }[] {
    const index = indexReadings(readings);
    return meters.map((meter) => ({ meter, days: dates.map((date) => deriveDay(index, meter.key, date)) }));
}

/**
 * Sum of derived consumption over `days` for the given meter keys.
 * Returns `null` when NOT ONE day was derivable — a blank, not a 0.
 */
export function sumConsumption(
    ledger: { meter: ManualMeter; days: DerivedDay[] }[],
    keys: readonly string[],
): { total: number | null; daysCounted: number; negatives: number } {
    const wanted = new Set(keys);
    let total: number | null = null;
    let daysCounted = 0;
    let negatives = 0;
    const seenDays = new Set<string>();
    for (const row of ledger) {
        if (!wanted.has(row.meter.key)) continue;
        for (const day of row.days) {
            if (day.consumption === null) continue;
            total = (total ?? 0) + day.consumption;
            seenDays.add(day.date);
            if (day.consumption < 0) negatives += 1;
        }
    }
    daysCounted = seenDays.size;
    return { total: total === null ? null : round3(total), daysCounted, negatives };
}

export function round3(v: number): number {
    return Math.round(v * 1000) / 1000;
}

// ─── Validation (shared by the form and the Server Action) ───────────────────

export interface ManualReadingEntry {
    key: string;
    /** `null` clears the reading for that meter/date. */
    reading: number | null;
    note?: string | null;
}

export interface SaveManualReadingsInput {
    system: ManualReadingSystem;
    /** ISO `YYYY-MM-DD`. */
    date: string;
    entries: ManualReadingEntry[];
}

export const MAX_MANUAL_ENTRIES = 50;
export const MAX_NOTE_LENGTH = 500;
/** A cumulative index above this is a typo, not a reading (largest bulk meter reads ~10⁷ m³). */
export const MAX_READING = 999_999_999;

/**
 * Validates a save request. Returns the list of problems (empty = valid).
 * `today` is injectable so tests are clock-independent.
 */
export function validateManualReadings(input: SaveManualReadingsInput, today: string = toDateKey(new Date())): string[] {
    const problems: string[] = [];
    if (!isManualReadingSystem(input.system)) problems.push('Unknown reading system.');
    if (!parseDateKey(input.date)) problems.push('Reading date must be a valid YYYY-MM-DD date.');
    else if (input.date > today) problems.push('Reading date cannot be in the future.');
    if (!Array.isArray(input.entries) || input.entries.length === 0) problems.push('No readings to save.');
    else if (input.entries.length > MAX_MANUAL_ENTRIES) problems.push(`At most ${MAX_MANUAL_ENTRIES} readings per save.`);
    else {
        const seen = new Set<string>();
        for (const entry of input.entries) {
            if (typeof entry.key !== 'string' || entry.key.trim() === '') {
                problems.push('Every reading needs a meter.');
                continue;
            }
            if (seen.has(entry.key)) problems.push(`Meter ${entry.key} appears twice.`);
            seen.add(entry.key);
            if (entry.reading !== null) {
                if (typeof entry.reading !== 'number' || !Number.isFinite(entry.reading)) {
                    problems.push(`Meter ${entry.key}: reading must be a number.`);
                } else if (entry.reading < 0) {
                    problems.push(`Meter ${entry.key}: a meter index cannot be negative.`);
                } else if (entry.reading > MAX_READING) {
                    problems.push(`Meter ${entry.key}: reading is implausibly large.`);
                }
            }
            if (entry.note != null && (typeof entry.note !== 'string' || entry.note.length > MAX_NOTE_LENGTH)) {
                problems.push(`Meter ${entry.key}: note must be text of at most ${MAX_NOTE_LENGTH} characters.`);
            }
        }
    }
    return problems;
}

/**
 * Turns the text the operator typed into a number or `null` (blank = clear).
 * Returns `undefined` when the text is not a number at all, so the form can
 * mark the field instead of silently dropping it.
 */
export function parseReadingInput(text: string): number | null | undefined {
    const trimmed = text.trim().replace(/,/g, '');
    if (trimmed === '') return null;
    if (!/^\d+(\.\d{0,3})?$/.test(trimmed)) return undefined;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : undefined;
}
