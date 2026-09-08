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
 * Hand readings are cumulative meter indexes; consumption is today − yesterday.
 * These tests pin the data-honesty rules: an unread day is `null` (never 0), a
 * negative difference is kept for flagging, and the form / Server Action reject
 * what a meter cannot physically show.
 */

const meter = (key: string, role: ManualMeter['role'] = 'source'): ManualMeter =>
    ({ key, name: key, location: null, role, manualOwned: true, sortOrder: 0 });

const reading = (key: string, date: string, value: number): ManualReading =>
    ({ key, date, reading: value, note: null, appliedConsumption: null });

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
        reading('M1', '2026-09-01', 1000),
        reading('M1', '2026-09-02', 1012.5),
        reading('M1', '2026-09-04', 1030),
        reading('M2', '2026-09-02', 500),
        reading('M2', '2026-09-03', 480),
    ]);

    it('is today minus yesterday when both were read', () => {
        expect(deriveDay(index, 'M1', '2026-09-02').consumption).toBe(12.5);
    });

    it('is null — not zero — when yesterday was not read', () => {
        const day = deriveDay(index, 'M1', '2026-09-04');
        expect(day.reading).toBe(1030);
        expect(day.previousReading).toBeNull();
        expect(day.consumption).toBeNull();
    });

    it('is null when today was not read, even if yesterday was', () => {
        expect(deriveDay(index, 'M1', '2026-09-03').consumption).toBeNull();
    });

    it('keeps a negative difference so the UI can flag it', () => {
        expect(deriveDay(index, 'M2', '2026-09-03').consumption).toBe(-20);
    });

    it('is fully null for a meter with no readings at all', () => {
        const day = deriveDay(index, 'M9', '2026-09-02');
        expect(day.reading).toBeNull();
        expect(day.consumption).toBeNull();
    });
});

describe('ledger and totals', () => {
    const meters = [meter('BW'), meter('TSE'), meter('OUT', 'outlet')];
    const readings = [
        reading('BW', '2026-08-31', 100), reading('BW', '2026-09-01', 110), reading('BW', '2026-09-02', 125),
        reading('TSE', '2026-09-01', 50), reading('TSE', '2026-09-02', 45),
    ];
    const ledger = buildLedger(meters, readings, monthDateKeys('2026-09-01'));

    it('derives day 1 from the last day of the previous month', () => {
        expect(ledger[0].days[0].consumption).toBe(10);
        expect(ledger[0].days[1].consumption).toBe(15);
    });

    it('sums only derivable days and counts negatives', () => {
        const sources = sumConsumption(ledger, ['BW', 'TSE']);
        expect(sources.total).toBe(20); // 10 + 15 − 5
        expect(sources.daysCounted).toBe(2);
        expect(sources.negatives).toBe(1);
    });

    it('returns null, not 0, when nothing is derivable', () => {
        const outlet = sumConsumption(ledger, ['OUT']);
        expect(outlet.total).toBeNull();
        expect(outlet.daysCounted).toBe(0);
    });
});

describe('validateManualReadings', () => {
    const today = '2026-09-08';
    const base = { system: 'potable' as const, date: '2026-09-07', entries: [{ key: 'C43659', reading: 123456.5 }] };

    it('accepts a well-formed request', () => {
        expect(validateManualReadings(base, today)).toEqual([]);
    });

    it('accepts today but not tomorrow', () => {
        expect(validateManualReadings({ ...base, date: today }, today)).toEqual([]);
        expect(validateManualReadings({ ...base, date: '2026-09-09' }, today)).toContain('Reading date cannot be in the future.');
    });

    it('rejects a negative index, a non-number and an absurd value', () => {
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', reading: -1 }] }, today)[0]).toMatch(/negative/);
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', reading: Number.NaN }] }, today)[0]).toMatch(/number/);
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', reading: 1e12 }] }, today)[0]).toMatch(/implausibly/);
    });

    it('allows null to clear a reading', () => {
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', reading: null }] }, today)).toEqual([]);
    });

    it('rejects duplicates, empty batches and unknown systems', () => {
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', reading: 1 }, { key: 'A', reading: 2 }] }, today)[0]).toMatch(/twice/);
        expect(validateManualReadings({ ...base, entries: [] }, today)).toContain('No readings to save.');
        expect(validateManualReadings({ ...base, system: 'gas' as never }, today)).toContain('Unknown reading system.');
    });

    it('caps the note length', () => {
        const long = 'x'.repeat(501);
        expect(validateManualReadings({ ...base, entries: [{ key: 'A', reading: 1, note: long }] }, today)[0]).toMatch(/note/);
    });
});

describe('parseReadingInput', () => {
    it('treats a blank field as "not read"', () => {
        expect(parseReadingInput('')).toBeNull();
        expect(parseReadingInput('   ')).toBeNull();
    });

    it('accepts integers, up to three decimals and thousands separators', () => {
        expect(parseReadingInput('1234')).toBe(1234);
        expect(parseReadingInput('1,234.567')).toBe(1234.567);
    });

    it('flags text that is not a reading instead of dropping it', () => {
        expect(parseReadingInput('12a')).toBeUndefined();
        expect(parseReadingInput('-5')).toBeUndefined();
        expect(parseReadingInput('1.2345')).toBeUndefined();
    });
});
