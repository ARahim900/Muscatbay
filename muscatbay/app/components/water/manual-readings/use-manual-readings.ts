"use client";

/**
 * Data hook for one hand-read system (potable bulk meters or irrigation).
 *
 * Loads the meter registry and the readings for the calendar month of
 * `dateKey` (plus the day before, so day 1's consumption can be derived), keeps
 * them fresh over a realtime channel, and exposes the derived ledger.
 *
 * A failed read is reported as `error` — the hook never hands back an empty
 * ledger as if nothing had been recorded.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ManualMeter, ManualReading, ManualReadingSystem } from "@/entities/manual-readings";
import {
    MANUAL_READING_TABLES,
    buildLedger,
    fetchManualMeters,
    fetchManualReadingsForMonth,
    monthDateKeys,
} from "@/functions/api/manual-readings";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

export type ManualReadingsStatus = "loading" | "ready" | "error";

export interface UseManualReadingsResult {
    meters: ManualMeter[];
    readings: ManualReading[];
    /** Every calendar day of the month, meters in display order. */
    ledger: ReturnType<typeof buildLedger>;
    /** The month's date keys, in order. */
    monthDays: string[];
    status: ManualReadingsStatus;
    error: string | null;
    isLive: boolean;
    lastFetched: Date | null;
    /** Re-read the month. `silent` keeps the current data on screen while it runs. */
    refetch: (silent?: boolean) => Promise<void>;
}

interface Loaded {
    /** Which month these rows belong to — `status` is derived by comparing it with the requested month. */
    monthKey: string;
    meters: ManualMeter[];
    readings: ManualReading[];
    error: string | null;
    fetchedAt: Date;
}

export function useManualReadings(system: ManualReadingSystem, dateKey: string): UseManualReadingsResult {
    // One string per month so the fetch only re-runs when the MONTH changes,
    // not on every day step inside it.
    const monthDays = useMemo(() => monthDateKeys(dateKey), [dateKey]);
    const monthKey = monthDays[0];

    const [loaded, setLoaded] = useState<Loaded | null>(null);

    // A slow response for a month the user has already left must not land on
    // top of the current month — every request is numbered and only the latest
    // one may update state.
    const requestRef = useRef(0);

    // Pure fetch: no state is touched here, so the mount effect below can call
    // it directly and set state only once the response is in.
    const load = useCallback(async (): Promise<Loaded> => {
        const [metersResult, readingsResult] = await Promise.all([
            fetchManualMeters(system),
            fetchManualReadingsForMonth(system, monthKey),
        ]);
        return {
            monthKey,
            meters: metersResult.meters,
            readings: readingsResult.readings,
            error: metersResult.error ?? readingsResult.error,
            fetchedAt: new Date(),
        };
    }, [system, monthKey]);

    useEffect(() => {
        const requestId = ++requestRef.current;
        let cancelled = false;
        (async () => {
            const result = await load();
            if (cancelled || requestId !== requestRef.current) return;
            setLoaded(result);
        })();
        return () => { cancelled = true; };
    }, [load]);

    const refetch = useCallback(async (silent = false) => {
        const requestId = ++requestRef.current;
        if (!silent) setLoaded(null); // back to the loading state
        const result = await load();
        if (requestId !== requestRef.current) return;
        if (silent && result.error) return; // keep what is on screen — it is real, just not fresh
        setLoaded(result);
    }, [load]);

    const current = loaded && loaded.monthKey === monthKey ? loaded : null;
    const status: ManualReadingsStatus = !current ? "loading" : current.error ? "error" : "ready";
    const meters = useMemo(() => current?.meters ?? [], [current]);
    const readings = useMemo(() => current?.readings ?? [], [current]);

    const { isLive } = useSupabaseRealtime({
        table: MANUAL_READING_TABLES[system].readings,
        channelName: `manual-readings-${system}`,
        onChanged: () => { void refetch(true); },
        enabled: status === "ready",
    });

    const ledger = useMemo(() => buildLedger(meters, readings, monthDays), [meters, readings, monthDays]);

    return {
        meters,
        readings,
        ledger,
        monthDays,
        status,
        error: current?.error ?? null,
        isLive,
        lastFetched: current?.fetchedAt ?? null,
        refetch,
    };
}
