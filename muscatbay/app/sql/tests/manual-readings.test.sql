-- Trigger and access tests for 20260908_manual_meter_readings.sql.
--
-- Runs after 00-supabase-stubs.sql, a realistic water_meters /
-- water_daily_consumption pair (see run-local.sh), the 20260901 security
-- migration and the manual-readings migration. Everything asserted here is
-- the real migration's behaviour: the derivation function, the overwrite
-- rules, the bookkeeping column and the role grants.

\set ON_ERROR_STOP on

-- ── identities through the invitation flow (same as rls-roles.test.sql) ──
INSERT INTO public.auth_invitations (email, role, module_scope) VALUES
    ('operator@example.test', 'operator', '[]'::jsonb),
    ('viewer@example.test', 'viewer', '[]'::jsonb);
INSERT INTO auth.users (id, email) VALUES
    ('00000000-0000-0000-0000-0000000000b3', 'operator@example.test'),
    ('00000000-0000-0000-0000-0000000000b4', 'viewer@example.test');

-- ── registry sanity ──────────────────────────────────────────────────────
DO $$
BEGIN
    IF (SELECT count(*) FROM public.water_manual_meters) <> 8 THEN
        RAISE EXCEPTION 'FAIL: expected 8 hand-read potable meters, got %', (SELECT count(*) FROM public.water_manual_meters);
    END IF;
    IF (SELECT count(*) FROM public.water_manual_meters WHERE manual_owned) <> 3 THEN
        RAISE EXCEPTION 'FAIL: exactly C43659, 4300342 and 4300320 must be manual_owned';
    END IF;
    IF (SELECT count(*) FROM public.irrigation_meters) <> 12 THEN
        RAISE EXCEPTION 'FAIL: expected 12 irrigation meters';
    END IF;
END $$;

-- ── act as the operator ─────────────────────────────────────────────────
SET ROLE authenticated;
SET test.uid = '00000000-0000-0000-0000-0000000000b3';

-- Day 1 alone: no previous reading → nothing derivable, month row created, cell NULL.
INSERT INTO public.water_manual_readings (account_number, reading_date, reading)
VALUES ('C43659', '2026-09-01', 1000000);

DO $$
DECLARE v numeric;
BEGIN
    SELECT day_1 INTO v FROM public.water_daily_consumption
     WHERE account_number = 'C43659' AND month = 'Sep-26' AND year = 2026;
    IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: month row was not created for C43659 Sep-26'; END IF;
    IF v IS NOT NULL THEN RAISE EXCEPTION 'FAIL: day_1 must stay NULL without a previous reading, got %', v; END IF;
END $$;

-- Day 2: 1000250 − 1000000 = 250 lands in day_2 (owned meter).
INSERT INTO public.water_manual_readings (account_number, reading_date, reading)
VALUES ('C43659', '2026-09-02', 1000250);

DO $$
DECLARE v numeric; applied numeric;
BEGIN
    SELECT day_2 INTO v FROM public.water_daily_consumption WHERE account_number = 'C43659' AND month = 'Sep-26';
    IF v IS DISTINCT FROM 250 THEN RAISE EXCEPTION 'FAIL: day_2 should be 250, got %', v; END IF;
    SELECT applied_consumption INTO applied FROM public.water_manual_readings WHERE account_number = 'C43659' AND reading_date = '2026-09-02';
    IF applied IS DISTINCT FROM 250 THEN RAISE EXCEPTION 'FAIL: applied_consumption should record 250, got %', applied; END IF;
END $$;

-- Correcting day 1 re-derives day 2 (owned meter → always rewritten).
UPDATE public.water_manual_readings SET reading = 1000100
 WHERE account_number = 'C43659' AND reading_date = '2026-09-01';

DO $$
DECLARE v numeric;
BEGIN
    SELECT day_2 INTO v FROM public.water_daily_consumption WHERE account_number = 'C43659' AND month = 'Sep-26';
    IF v IS DISTINCT FROM 150 THEN RAISE EXCEPTION 'FAIL: corrected day_2 should be 150, got %', v; END IF;
END $$;

-- A negative difference is written as-is, never clamped to 0.
INSERT INTO public.water_manual_readings (account_number, reading_date, reading)
VALUES ('C43659', '2026-09-03', 1000200);   -- 1000200 − 1000250 = −50

DO $$
DECLARE v numeric;
BEGIN
    SELECT day_3 INTO v FROM public.water_daily_consumption WHERE account_number = 'C43659' AND month = 'Sep-26';
    IF v IS DISTINCT FROM -50 THEN RAISE EXCEPTION 'FAIL: negative consumption must be kept, got %', v; END IF;
END $$;

-- Deleting a reading empties the cells that depended on it (owned meter).
DELETE FROM public.water_manual_readings WHERE account_number = 'C43659' AND reading_date = '2026-09-02';

DO $$
DECLARE v2 numeric; v3 numeric;
BEGIN
    SELECT day_2, day_3 INTO v2, v3 FROM public.water_daily_consumption WHERE account_number = 'C43659' AND month = 'Sep-26';
    IF v2 IS NOT NULL OR v3 IS NOT NULL THEN
        RAISE EXCEPTION 'FAIL: day_2/day_3 must be NULL after the middle reading is removed, got % / %', v2, v3;
    END IF;
END $$;

-- ── shared (Grafana-reported) meter: Zone 3B ────────────────────────────
-- Pre-existing instrumented value in day_2 must survive a hand reading.
RESET ROLE;
INSERT INTO public.water_daily_consumption (meter_id, meter_name, account_number, label, zone, parent_meter, type, month, year, day_2)
VALUES ('MB-L2-003', 'ZONE 3B (BULK ZONE 3B)', '4300344', 'L2', 'Zone_03_(B)', 'Main Bulk (NAMA)', 'Zone_Bulk', 'Sep-26', 2026, 999);
SET ROLE authenticated;
SET test.uid = '00000000-0000-0000-0000-0000000000b3';

INSERT INTO public.water_manual_readings (account_number, reading_date, reading) VALUES
    ('4300344', '2026-09-01', 5000),
    ('4300344', '2026-09-02', 5040),   -- would be 40, but Grafana already holds 999
    ('4300344', '2026-09-03', 5070);   -- 30 → fills the empty day_3

DO $$
DECLARE v2 numeric; v3 numeric; a2 numeric; a3 numeric;
BEGIN
    SELECT day_2, day_3 INTO v2, v3 FROM public.water_daily_consumption WHERE account_number = '4300344' AND month = 'Sep-26';
    IF v2 IS DISTINCT FROM 999 THEN RAISE EXCEPTION 'FAIL: Grafana value 999 was overwritten with %', v2; END IF;
    IF v3 IS DISTINCT FROM 30 THEN RAISE EXCEPTION 'FAIL: empty day_3 should be filled with 30, got %', v3; END IF;
    SELECT applied_consumption INTO a2 FROM public.water_manual_readings WHERE account_number = '4300344' AND reading_date = '2026-09-02';
    SELECT applied_consumption INTO a3 FROM public.water_manual_readings WHERE account_number = '4300344' AND reading_date = '2026-09-03';
    IF a2 IS NOT NULL THEN RAISE EXCEPTION 'FAIL: applied_consumption must be NULL when the cell was not ours, got %', a2; END IF;
    IF a3 IS DISTINCT FROM 30 THEN RAISE EXCEPTION 'FAIL: applied_consumption for day 3 should be 30, got %', a3; END IF;
END $$;

-- A correction on a shared meter DOES update a cell we filled ourselves.
UPDATE public.water_manual_readings SET reading = 5080 WHERE account_number = '4300344' AND reading_date = '2026-09-03';

DO $$
DECLARE v3 numeric;
BEGIN
    SELECT day_3 INTO v3 FROM public.water_daily_consumption WHERE account_number = '4300344' AND month = 'Sep-26';
    IF v3 IS DISTINCT FROM 40 THEN RAISE EXCEPTION 'FAIL: our own fill should follow the correction (40), got %', v3; END IF;
END $$;

-- ── irrigation: plain storage, no side effects on the potable table ─────
INSERT INTO public.irrigation_daily_readings (meter_key, reading_date, reading) VALUES
    ('IRR-MAIN-BW', '2026-09-01', 120.5),
    ('IRR-MAIN-BW', '2026-09-02', 133);

DO $$
BEGIN
    IF (SELECT count(*) FROM public.irrigation_daily_readings) <> 2 THEN
        RAISE EXCEPTION 'FAIL: irrigation readings were not stored';
    END IF;
    IF (SELECT count(*) FROM public.water_daily_consumption WHERE account_number LIKE 'IRR-%') <> 0 THEN
        RAISE EXCEPTION 'FAIL: irrigation readings must never reach the potable daily table';
    END IF;
END $$;

-- The operator may clear a mistyped reading.
DELETE FROM public.irrigation_daily_readings WHERE meter_key = 'IRR-MAIN-BW' AND reading_date = '2026-09-02';
DO $$
BEGIN
    IF (SELECT count(*) FROM public.irrigation_daily_readings) <> 1 THEN
        RAISE EXCEPTION 'FAIL: operator delete on irrigation readings did not apply';
    END IF;
END $$;

-- ── viewer: reads, cannot write ─────────────────────────────────────────
SET test.uid = '00000000-0000-0000-0000-0000000000b4';

DO $$
BEGIN
    IF (SELECT count(*) FROM public.irrigation_meters) <> 12 THEN
        RAISE EXCEPTION 'FAIL: viewer should read the irrigation registry';
    END IF;
    BEGIN
        INSERT INTO public.irrigation_daily_readings (meter_key, reading_date, reading) VALUES ('IRR-MAIN-TSE', '2026-09-01', 1);
        RAISE EXCEPTION 'FAIL: viewer inserted an irrigation reading';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL; -- expected: new row violates row-level security policy
    END;
    BEGIN
        INSERT INTO public.water_manual_readings (account_number, reading_date, reading) VALUES ('4300343', '2026-09-01', 1);
        RAISE EXCEPTION 'FAIL: viewer inserted a potable hand reading';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END $$;

-- Registry writes are admin-only, even for the operator.
SET test.uid = '00000000-0000-0000-0000-0000000000b3';
DO $$
BEGIN
    BEGIN
        INSERT INTO public.irrigation_meters (meter_key, display_name, role, sort_order) VALUES ('X', 'x', 'source', 1);
        RAISE EXCEPTION 'FAIL: operator added a registry row';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END $$;

RESET ROLE;
SELECT 'manual-readings.test.sql: all assertions passed' AS result;
