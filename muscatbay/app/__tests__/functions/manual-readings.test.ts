import { describe, it, expect } from 'vitest';
import {
    buildLedger,
    deriveDay,
    indexReadings,
    monthDateKeys,
    monthLabel,
    parseDateKey,
    parseReadingInput,
    shiftDateKey,
    sumConsumption,
    toDateKey,
    validateManualReadings,
} from '@/functions/api/manual-readings';
import type { ManualMeter, ManualReading } from '@/entities/manual-readings';

/**
 * Hand readings are the day's consumption as Kalhat recorded it. These tests
 * pin the data-honesty rules: a day with no row is `null` (never 0), a
 * negative figure is kept for flagging, and the form / Server Action reject
 * what cannot be a reading.
 */

const meter = (key: string, role: ManualMeter['role'] = 'source'): ManualMeter =>
    ({ key, name: key, location: null, role, manualOwned: true, sortOrder: 0 });

const row = (key: string, date: string, consumption: number, note: string | null = null): ManualReading =>
    ({ key, date, consumption, note, appliedConsumption: null });

describe('date keys', () => {
    it('formats and parses local calendar dates without UTC drift', () => {
        expect(toDateKey(new Date(2026, 8, 5))).toBe('2026-09-05');
        expect(parseDateKey('2026-09-05')?.getDate()).toBe(5);
    });

    it('rejects impossible dates instead of rolling them over', () => {
        expect(parseDateKey('2026-02-30')).toBeNull();
        expect(parseDateKey('2026-13-01')).toBeNull();
        expect(parseDateKey('5 Sep 2026')).toBeNull();
    });

    it('shifts across month and year boundaries', () => {
        expect(shiftDateKey('2026-09-01', -1)).toBe('2026-08-31');
        expect(shiftDateKey('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('lists every day of the month, leap years included', () => {
        expect(monthDateKeys('2026-09-15')).toHaveLength(30);
        expect(monthDateKeys('2028-02-01')).toHaveLength(29);
        expect(monthDateKeys('2026-09-15')[0]).toBe('2026-09-01');
    });

    it('labels a month the way the daily table does', () => {
        expect(monthLabel('2026-09-05')).toBe('Sep-26');
    });
});

describe('deriveDay', () => {
    const index = indexReadings([
        row('M1', '2026-09-01', 1338),
        row('M1', '2026-09-02', 0, 'pump off'),
        row('M2', '2026-09-03', -9),
    ]);

    it('returns the recorded figure and note', () => {
        const day = deriveDay(index, 'M1', '2026-09-01');
        expect(day.consumption).toBe(1338);
        expect(day.note).toBeNull();
        expect(deriveDay(index, 'M1', '2026-09-02').note).toBe('pump off');
    });

    it('treats a recorded zero as a real figure, distinct from "not recorded"', () => {
        expect(deriveDay(index, 'M1', '2026-09-02').consumption).toBe(0);
        expect(deriveDay(index, 'M1', '2026-09-03').consumption).toBeNull();
    });

    it('keeps a negative figure so the UI can flag it', () => {
        expect(deriveDay(index, 'M2', '2026-09-03').consumption).toBe(-9);
    });

    it('is null for a meter with no rows at all', () => {
        expect(deriveDay(index, 'M9', '2026-09-02').consumption).toBeNull();
    });
});

describe('ledger and totals', () => {
    const meters = [meter('BW'), meter('TSE'), meter('OUT', 'outlet')];
    const readings = [
        row('BW', '2026-09-01', 10), row('BW', '2026-09-02', 15),
        row('TSE', '2026-09-02', -5),
    ];
    const ledger = buildLedger(meters, readings, monthDateKeys('2026-09-01'));

    it('places each figure on its day', () => {
        expect(ledger[0].days[0].consumption).toBe(10);
        expect(ledger[0].days[1].consumption).toBe(15);
        expect(ledger[0].days[2].consumption).toBeNull();
    });

    it('sums only recorded days and counts negatives', () => {
        const sources = sumConsumption(ledger, ['BW', 'TSE']);
        expect(sources.total).toBe(20); // 10 + 15 − 5
        expect(sources.daysCounted).toBe(2);
        expect(sources.negatives).toBe(1);
    });

    it('returns null, not 0, when nothing is recorded', () => {
        const outlet = sumConsumption(ledger, ['OUT']);
        expect(outlet.total).toBeNull();
        expect(outlet.daysCounted).toBe(0);
    });
});

describe('validateManualReadings', () => {
    const today = '2026-09-08';
    const base = { system: 'potable' as const, date: '2026-09-07', entries: [{ key: 'C43659', consumption: 1338 }] };

    it('accepts a well-formed request', () => {
        expect(validateManualReadings(base, today)).toEqual([]);
    });

    it('accepts today but not tomorrow', () => {
        expect(validateManualReadings({ ...base, date: today }, today)).toEqual([]);
        expect(validateManualReadings({ ...base, date: '2026-09-09' }, today)).toContain('Reading date cannot be in the future.');
    });

    it('keeps a negative figure but rejects a non-number and an absurd value', () => {
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', consumption: -9 }] }, today)).toEqual([]);
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', consumption: Number.NaN }] }, today)[0]).toMatch(/number/);
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', consumption: 1e9 }] }, today)[0]).toMatch(/implausibly/);
    });

    it('allows null to clear a figure', () => {
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', consumption: null }] }, today)).toEqual([]);
    });

    it('rejects duplicates, empty batches and unknown systems', () => {
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', consumption: 1 }, { key: 'A', consumption: 2 }] }, today)[0]).toMatch(/twice/);
        expect(validateManualReadings({ ...base, entries: [] }, today)).toContain('No readings to save.');
        expect(validateManualReadings({ ...base, system: 'gas' as never }, today)).toContain('Unknown reading system.');
    });

    it('caps the note length', () => {
        const long = 'x'.repeat(501);
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', consumption: 1, note: long }] }, today)[0]).toMatch(/note/);
    });
});

describe('parseReadingInput', () => {
    it('treats a blank field as "not recorded"', () => {
        expect(parseReadingInput('')).toBeNull();
        expect(parseReadingInput('   ')).toBeNull();
    });

    it('accepts integers, up to three decimals, thousands separators and a leading minus', () => {
        expect(parseReadingInput('1234')).toBe(1234);
        expect(parseReadingInput('1,234.567')).toBe(1234.567);
        expect(parseReadingInput('-9')).toBe(-9);
    });

    it('flags text that is not a figure instead of dropping it', () => {
        expect(parseReadingInput('12a')).toBeUndefined();
        expect(parseReadingInput('1.2345')).toBeUndefined();
        expect(parseReadingInput('New Meter')).toBeUndefined();
    });
});
