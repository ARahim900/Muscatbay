-- Trigger and access tests for 20260908_manual_meter_readings.sql.
--
-- Runs after 00-supabase-stubs.sql, a realistic water_meters /
-- water_daily_consumption pair (see run-local.sh), the 20260901 security
-- migration and the manual-readings migration. Everything asserted here is
-- the real migration's behaviour: the copy into the wide daily table, the
-- overwrite rules, the bookkeeping column and the role grants.

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
    IF (SELECT count(*) FROM public.irrigation_meters) <> 13 THEN
        RAISE EXCEPTION 'FAIL: expected 13 irrigation meters';
    END IF;
END $$;

-- ── act as the operator ─────────────────────────────────────────────────
SET ROLE authenticated;
SET test.uid = '00000000-0000-0000-0000-0000000000b3';

-- A hand figure for an owned meter lands in its day cell; the month row is created.
INSERT INTO public.water_manual_readings (account_number, reading_date, consumption)
VALUES ('C43659', '2026-09-02', 1338);

DO $$
DECLARE v numeric; applied numeric;
BEGIN
    SELECT day_2 INTO v FROM public.water_daily_consumption
     WHERE account_number = 'C43659' AND month = 'Sep-26' AND year = 2026;
    IF NOT FOUND THEN RAISE EXCEPTION 'FAIL: month row was not created for C43659 Sep-26'; END IF;
    IF v IS DISTINCT FROM 1338 THEN RAISE EXCEPTION 'FAIL: day_2 should be 1338, got %', v; END IF;
    SELECT applied_consumption INTO applied FROM public.water_manual_readings WHERE account_number = 'C43659' AND reading_date = '2026-09-02';
    IF applied IS DISTINCT FROM 1338 THEN RAISE EXCEPTION 'FAIL: applied_consumption should record 1338, got %', applied; END IF;
END $$;

-- A correction on an owned meter rewrites the cell.
UPDATE public.water_manual_readings SET consumption = 1400
 WHERE account_number = 'C43659' AND reading_date = '2026-09-02';

DO $$
DECLARE v numeric;
BEGIN
    SELECT day_2 INTO v FROM public.water_daily_consumption WHERE account_number = 'C43659' AND month = 'Sep-26';
    IF v IS DISTINCT FROM 1400 THEN RAISE EXCEPTION 'FAIL: corrected day_2 should be 1400, got %', v; END IF;
END $$;

-- A negative figure is written as-is, never clamped to 0.
INSERT INTO public.water_manual_readings (account_number, reading_date, consumption)
VALUES ('C43659', '2026-09-03', -50);

DO $$
DECLARE v numeric;
BEGIN
    SELECT day_3 INTO v FROM public.water_daily_consumption WHERE account_number = 'C43659' AND month = 'Sep-26';
    IF v IS DISTINCT FROM -50 THEN RAISE EXCEPTION 'FAIL: negative consumption must be kept, got %', v; END IF;
END $$;

-- Deleting a row empties its cell (owned meter).
DELETE FROM public.water_manual_readings WHERE account_number = 'C43659' AND reading_date = '2026-09-02';

DO $$
DECLARE v2 numeric; v3 numeric;
BEGIN
    SELECT day_2, day_3 INTO v2, v3 FROM public.water_daily_consumption WHERE account_number = 'C43659' AND month = 'Sep-26';
    IF v2 IS NOT NULL THEN RAISE EXCEPTION 'FAIL: day_2 must be NULL after its row is removed, got %', v2; END IF;
    IF v3 IS DISTINCT FROM -50 THEN RAISE EXCEPTION 'FAIL: day_3 must be untouched by the day-2 delete, got %', v3; END IF;
END $$;

-- Moving a row to another date clears the old cell and fills the new one.
UPDATE public.water_manual_readings SET reading_date = '2026-09-04'
 WHERE account_number = 'C43659' AND reading_date = '2026-09-03';

DO $$
DECLARE v3 numeric; v4 numeric;
BEGIN
    SELECT day_3, day_4 INTO v3, v4 FROM public.water_daily_consumption WHERE account_number = 'C43659' AND month = 'Sep-26';
    IF v3 IS NOT NULL THEN RAISE EXCEPTION 'FAIL: old day_3 should be cleared after the date move, got %', v3; END IF;
    IF v4 IS DISTINCT FROM -50 THEN RAISE EXCEPTION 'FAIL: new day_4 should hold -50, got %', v4; END IF;
END $$;

-- ── shared (Grafana-reported) meter: Zone 3B ────────────────────────────
-- Pre-existing instrumented value in day_2 must survive a hand figure.
RESET ROLE;
INSERT INTO public.water_daily_consumption (meter_id, meter_name, account_number, label, zone, parent_meter, type, month, year, day_2)
VALUES ('MB-L2-003', 'ZONE 3B (BULK ZONE 3B)', '4300344', 'L2', 'Zone_03_(B)', 'Main Bulk (NAMA)', 'Zone_Bulk', 'Sep-26', 2026, 999);
SET ROLE authenticated;
SET test.uid = '00000000-0000-0000-0000-0000000000b3';

INSERT INTO public.water_manual_readings (account_number, reading_date, consumption) VALUES
    ('4300344', '2026-09-02', 40),   -- Grafana already holds 999
    ('4300344', '2026-09-03', 30);   -- fills the empty day_3

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
UPDATE public.water_manual_readings SET consumption = 45 WHERE account_number = '4300344' AND reading_date = '2026-09-03';

DO $$
DECLARE v3 numeric;
BEGIN
    SELECT day_3 INTO v3 FROM public.water_daily_consumption WHERE account_number = '4300344' AND month = 'Sep-26';
    IF v3 IS DISTINCT FROM 45 THEN RAISE EXCEPTION 'FAIL: our own fill should follow the correction (45), got %', v3; END IF;
END $$;

-- ── irrigation: plain storage, no side effects on the potable table ─────
INSERT INTO public.irrigation_daily_readings (meter_key, reading_date, consumption) VALUES
    ('IRR-MAIN-TSE', '2026-09-01', 555),
    ('IRR-MAIN-TSE', '2026-09-02', 676);

DO $$
BEGIN
    IF (SELECT count(*) FROM public.irrigation_daily_readings) <> 2 THEN
        RAISE EXCEPTION 'FAIL: irrigation readings were not stored';
    END IF;
    IF (SELECT count(*) FROM public.water_daily_consumption WHERE account_number LIKE 'IRR-%') <> 0 THEN
        RAISE EXCEPTION 'FAIL: irrigation readings must never reach the potable daily table';
    END IF;
END $$;

-- The operator may clear a mistyped figure.
DELETE FROM public.irrigation_daily_readings WHERE meter_key = 'IRR-MAIN-TSE' AND reading_date = '2026-09-02';
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
    IF (SELECT count(*) FROM public.irrigation_meters) <> 13 THEN
        RAISE EXCEPTION 'FAIL: viewer should read the irrigation registry';
    END IF;
    BEGIN
        INSERT INTO public.irrigation_daily_readings (meter_key, reading_date, consumption) VALUES ('IRR-MAIN-BW', '2026-09-01', 1);
        RAISE EXCEPTION 'FAIL: viewer inserted an irrigation reading';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL; -- expected: new row violates row-level security policy
    END;
    BEGIN
        INSERT INTO public.water_manual_readings (account_number, reading_date, consumption) VALUES ('4300343', '2026-09-01', 1);
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
