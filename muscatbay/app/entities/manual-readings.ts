/**
 * @fileoverview Manual meter readings — row shapes for the two hand-read systems.
 *
 *   potable    → `water_manual_meters` + `water_manual_readings`
 *                (bulk meters Kalhat reads by hand; a DB trigger derives daily
 *                consumption into `water_daily_consumption`)
 *   irrigation → `irrigation_meters` + `irrigation_daily_readings`
 *                (a separate network; consumption derived in the app)
 *
 * Both store the DAY'S CONSUMPTION (m³) exactly as Kalhat recorded it — the
 * Kalhat sheets are day-by-day consumption, confirmed from the owner's file on
 * 2026-09-08. A day with no row is "not recorded" and renders as "—", never 0.
 *
 * Types only, zero runtime — safe for `mobile/` and server code alike.
 * @module entities/manual-readings
 */

/** Which hand-read system a call refers to. */
export type ManualReadingSystem = 'potable' | 'irrigation';

/** `water_manual_meters` row. */
export interface WaterManualMeterRow {
    account_number: string;
    display_name: string;
    sort_order: number;
    manual_owned: boolean;
    is_active: boolean;
}

/** `water_manual_readings` row. */
export interface WaterManualReadingRow {
    id: number;
    account_number: string;
    /** ISO `YYYY-MM-DD`. */
    reading_date: string;
    /** The day's consumption, m³. Postgres numeric — PostgREST serialises it as a string. */
    consumption: number | string;
    note: string | null;
    applied_consumption: number | string | null;
    updated_at: string;
}

/** `irrigation_meters` row. */
export interface IrrigationMeterRow {
    meter_key: string;
    display_name: string;
    location: string | null;
    role: 'source' | 'outlet' | 'distribution';
    sort_order: number;
    is_active: boolean;
}

/** `irrigation_daily_readings` row. */
export interface IrrigationReadingRow {
    id: number;
    meter_key: string;
    reading_date: string;
    consumption: number | string;
    note: string | null;
    updated_at: string;
}

/**
 * One hand-read meter, normalised across both systems for the UI.
 * `key` is the account number (potable) or the meter key (irrigation).
 */
export interface ManualMeter {
    key: string;
    name: string;
    /** Irrigation: where the meter sits. Potable: unused. */
    location: string | null;
    /** Irrigation only: what the meter measures in the network. */
    role: IrrigationMeterRow['role'] | null;
    /** Potable only: Grafana never reports it, the hand reading is the sole source. */
    manualOwned: boolean;
    sortOrder: number;
}

/** One hand reading, normalised across both systems. */
export interface ManualReading {
    key: string;
    /** ISO `YYYY-MM-DD`. */
    date: string;
    /** The day's consumption as recorded, m³. Negative values are kept and flagged. */
    consumption: number;
    note: string | null;
    /**
     * Potable only: the value the DB trigger wrote into
     * `water_daily_consumption` for this date (`null` = nothing written, e.g. a
     * Grafana value already occupied the cell).
     */
    appliedConsumption: number | null;
}
