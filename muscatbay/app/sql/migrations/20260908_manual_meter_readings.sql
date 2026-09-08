-- =============================================================================
-- Manual meter readings — 2026-09-08
-- =============================================================================
-- Two small, separate systems for the readings Kalhat staff record by hand:
--
--   1. POTABLE bulk meters (Main Bulk C43659, the six zone bulks, Central Park).
--      Grafana never reports the Main Bulk, Zone 8 bulk or Central Park
--      (the month initializer already reserves them as "email-owned"), and it
--      occasionally misses Zone 3B. The hand figure is stored as recorded
--      (`water_manual_readings`, the DAY'S CONSUMPTION in m³ — the Kalhat
--      sheets are day-by-day consumption, confirmed from the owner's file on
--      2026-09-08) and a trigger copies it into the existing
--      `water_daily_consumption.day_N` cell, so every Water view — Daily,
--      Monthly month-to-date, Satellite, Dashboard — picks it up with no
--      read-path change.
--
--   2. IRRIGATION network (main tank sources, outlet, zone tanks, controllers).
--      Entirely new data, not related to the potable tables: its own registry
--      (`irrigation_meters`) and long-format readings table
--      (`irrigation_daily_readings`), one row per meter per day.
--
-- Overwrite rules for the potable fill (the part that could corrupt a balance):
--   * `water_manual_meters.manual_owned = true` (C43659, 4300342, 4300320):
--     the hand figure is the ONLY source, so it always replaces the day cell —
--     corrections propagate, a cleared reading empties the cell again.
--   * every other account: the hand figure lands only in a cell that is
--     empty, or that still holds the value this table wrote earlier
--     (`applied_consumption`). An instrumented Grafana reading is never
--     overwritten by hand-entered data.
--
-- Access (mirrors the 20260901 operational pattern):
--   viewer / contractor  — read
--   operator / manager / admin — insert, update, and DELETE of readings
--     (clearing a mistyped reading is an ordinary correction, not an admin
--     act; registries stay admin-only)
--
-- NOTE for anyone re-running 20260901_invitation_only_security_and_rls.sql:
-- its fail-closed sweep strips policies from any public table outside its
-- inventory. Add the four tables below to that inventory before re-running it.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Potable — registry of the bulk meters Kalhat reads by hand
-- ---------------------------------------------------------------------------
create table if not exists public.water_manual_meters (
    account_number text primary key
        references public.water_meters (account_number) on update cascade,
    display_name   text    not null,
    sort_order     integer not null,
    -- true = Grafana never reports this meter; the hand reading is the sole
    -- source and always rewrites the day cell (see header).
    manual_owned   boolean not null default false,
    is_active      boolean not null default true,
    created_at     timestamptz not null default now()
);

comment on table public.water_manual_meters is
    'Potable bulk meters whose daily readings Kalhat records by hand. manual_owned = Grafana never reports it.';

insert into public.water_manual_meters (account_number, display_name, sort_order, manual_owned) values
    ('C43659',  'Main Meter (NAMA bulk)',            10, true),
    ('4300343', 'Zone 3A bulk',                      20, false),
    ('4300344', 'Zone 3B bulk',                      30, false),
    ('4300345', 'Zone 5 bulk',                       40, false),
    ('4300342', 'Zone 8 bulk',                       50, true),
    ('4300335', 'Zone VS bulk',                      60, false),
    ('4300346', 'Zone FM bulk',                      70, false),
    -- "Central park" on the Kalhat sheet is the existing Irrigation Tank 02
    -- meter (owner confirmation, 2026-09-08).
    ('4300320', 'Central Park (Irrigation Tank 02)', 80, true)
on conflict (account_number) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Potable — the hand readings themselves
-- ---------------------------------------------------------------------------
create table if not exists public.water_manual_readings (
    id             bigint generated always as identity primary key,
    account_number text not null
        references public.water_manual_meters (account_number) on update cascade,
    reading_date   date not null,
    -- The day's consumption as Kalhat recorded it, m³. Negative values are
    -- kept and flagged in the app (meter swap, misread) — never clamped.
    consumption    numeric(12,3) not null,
    note           text check (note is null or char_length(note) <= 500),
    -- What the trigger last wrote into water_daily_consumption for this date
    -- (NULL = nothing written). Used to tell "our" value apart from a Grafana
    -- value on shared accounts.
    applied_consumption numeric(12,3),
    recorded_by    uuid default auth.uid(),
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    unique (account_number, reading_date)
);

comment on table public.water_manual_readings is
    'Hand-recorded daily consumption (m³) for potable bulk meters. A trigger copies each day into water_daily_consumption.';

create index if not exists water_manual_readings_date_idx
    on public.water_manual_readings (reading_date);

-- ---------------------------------------------------------------------------
-- 3. Irrigation — registry (new, separate system)
-- ---------------------------------------------------------------------------
create table if not exists public.irrigation_meters (
    meter_key    text primary key,
    display_name text not null,
    location     text,
    -- source = feeds the main irrigation tank; outlet = leaves the main tank;
    -- distribution = a downstream zone tank or controller.
    role         text not null check (role in ('source', 'outlet', 'distribution')),
    sort_order   integer not null,
    is_active    boolean not null default true,
    created_at   timestamptz not null default now()
);

comment on table public.irrigation_meters is
    'Irrigation-network meters read by hand. Separate from the potable water_* tables by design.';

-- Names follow the Kalhat "Irrigation" sheet (the source of the data); the
-- owner's meter list in brackets where it differs. Meters on the owner's list
-- with no sheet row yet (PO line, Tank 05 FM, Controller 08) are kept so they
-- can be recorded from now on. "SA TSE" is on the sheet but not on the list —
-- kept under its sheet name until the owner says which tank it is.
insert into public.irrigation_meters (meter_key, display_name, location, role, sort_order) values
    ('IRR-MAIN-BW',  'Main Tank / Bore Well',            'Main irrigation tank', 'source',       10),
    ('IRR-MAIN-TSE', 'Main Irrigation from STP (TSE)',   'Main irrigation tank', 'source',       20),
    ('IRR-MAIN-PO',  'Main IRR Tank / PO Line',          'Main irrigation tank', 'source',       30),
    ('IRR-MAIN-OUT', 'Main Irrigation IR Outlet',        'Main irrigation tank', 'outlet',       40),
    ('IRR-TANK-02',  'Central Park TSE (IR Tank 02)',    'Central Park',         'distribution', 50),
    ('IRR-TANK-03',  'Z5 TSE Water (IR Tank 03)',        'Zone 5',               'distribution', 60),
    ('IRR-TANK-04',  'Z8 TSE Water (IR Tank 04)',        'Zone 8',               'distribution', 70),
    ('IRR-TANK-05',  'IR Tank 05 (FM)',                  'Zone FM',              'distribution', 80),
    ('IRR-TANK-06',  'Village Square TSE (IR Tank 06)',  'Village Square',       'distribution', 90),
    ('IRR-SA-TSE',   'SA TSE',                           null,                   'distribution', 95),
    ('IRR-CTRL-08',  'IR Controller 08',                 null,                   'distribution', 100),
    ('IRR-CTRL-09',  'IR Controller 09',                 null,                   'distribution', 110),
    ('IRR-TANK-JMB', 'Jumarieh Feeding Tank (JMB)',      'Jumarieh',             'distribution', 120)
on conflict (meter_key) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Irrigation — readings
-- ---------------------------------------------------------------------------
create table if not exists public.irrigation_daily_readings (
    id           bigint generated always as identity primary key,
    meter_key    text not null
        references public.irrigation_meters (meter_key) on update cascade,
    reading_date date not null,
    -- The day's consumption as recorded, m³ (negatives kept and flagged).
    consumption  numeric(12,3) not null,
    note         text check (note is null or char_length(note) <= 500),
    recorded_by  uuid default auth.uid(),
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),
    unique (meter_key, reading_date)
);

comment on table public.irrigation_daily_readings is
    'Hand-recorded daily consumption (m³) for irrigation meters, one row per meter per day.';

create index if not exists irrigation_daily_readings_date_idx
    on public.irrigation_daily_readings (reading_date);

-- ---------------------------------------------------------------------------
-- 5. updated_at maintenance (both readings tables)
-- ---------------------------------------------------------------------------
create or replace function public.mb_set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists water_manual_readings_set_updated_at on public.water_manual_readings;
create trigger water_manual_readings_set_updated_at
    before update on public.water_manual_readings
    for each row execute function public.mb_set_updated_at();

drop trigger if exists irrigation_daily_readings_set_updated_at on public.irrigation_daily_readings;
create trigger irrigation_daily_readings_set_updated_at
    before update on public.irrigation_daily_readings
    for each row execute function public.mb_set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Potable fill — derived consumption → water_daily_consumption.day_N
-- ---------------------------------------------------------------------------

-- The recorded consumption for one account/date; NULL when nothing was
-- recorded. A negative value is returned as-is (meter swap, misread): the app
-- flags negatives, it never hides them.
create or replace function public.water_manual_daily_consumption(p_account text, p_date date)
returns numeric
language sql
stable
set search_path = public, pg_temp
as $$
    select r.consumption
    from public.water_manual_readings as r
    where r.account_number = p_account
      and r.reading_date = p_date;
$$;

-- Applies the recorded value for ONE account/date into the wide daily table,
-- honouring the overwrite rules in the header, and records what was written.
--
-- SECURITY DEFINER: the caller is an operator whose RLS already allows this
-- write, but creating a month row also needs USAGE on the daily table's id
-- sequence, which the `authenticated` role is not guaranteed to hold. Running
-- as the owner keeps the fill working regardless; search_path is pinned and
-- EXECUTE is revoked from anon below, per the 2026-07-29 hardening rules.
create or replace function public.water_manual_apply_day(p_account text, p_date date)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_month     text    := to_char(p_date, 'Mon-YY');
    v_year      integer := extract(year from p_date)::integer;
    v_col       text    := 'day_' || extract(day from p_date)::integer;
    v_value     numeric := public.water_manual_daily_consumption(p_account, p_date);
    v_owned     boolean;
    v_previous  numeric;   -- what we wrote for this date last time
    v_cell      numeric;   -- what the day cell holds right now
begin
    select manual_owned into v_owned
    from public.water_manual_meters
    where account_number = p_account;

    if v_owned is null then
        -- Not a hand-read meter: nothing to apply.
        return;
    end if;

    select applied_consumption into v_previous
    from public.water_manual_readings
    where account_number = p_account and reading_date = p_date;

    -- Make sure the month row exists (metadata copied from the registry, all
    -- day cells NULL — a missing day must stay NULL, never 0).
    insert into public.water_daily_consumption
        (meter_id, meter_name, account_number, label, zone, parent_meter, type, month, year)
    select m.meter_id, m.meter_name, btrim(m.account_number), m.label, m.zone, m.parent_meter, m.type, v_month, v_year
    from public.water_meters as m
    where btrim(m.account_number) = p_account
    on conflict (account_number, month, year) do nothing;

    execute format(
        'select %I from public.water_daily_consumption where account_number = $1 and month = $2 and year = $3',
        v_col
    ) into v_cell using p_account, v_month, v_year;

    if v_owned
       or v_cell is null
       or (v_previous is not null and v_cell is not distinct from v_previous) then
        execute format(
            'update public.water_daily_consumption set %I = $1, updated_at = now() where account_number = $2 and month = $3 and year = $4',
            v_col
        ) using v_value, p_account, v_month, v_year;

        update public.water_manual_readings
           set applied_consumption = v_value
         where account_number = p_account and reading_date = p_date;
    else
        -- Cell holds an instrumented value we did not write: leave it, and
        -- record that nothing of ours is in there.
        update public.water_manual_readings
           set applied_consumption = null
         where account_number = p_account and reading_date = p_date;
    end if;
end;
$$;

-- A row for date D fills cell D. An UPDATE that moves the date also clears
-- the old date's cell (subject to the same overwrite rules).
create or replace function public.water_manual_readings_apply()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
    if tg_op in ('DELETE', 'UPDATE') then
        perform public.water_manual_apply_day(old.account_number, old.reading_date);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
        perform public.water_manual_apply_day(new.account_number, new.reading_date);
    end if;
    return null;
end;
$$;

-- pg_trigger_depth() = 0 keeps the `applied_consumption` bookkeeping update
-- inside water_manual_apply_day from re-firing this trigger.
drop trigger if exists water_manual_readings_apply on public.water_manual_readings;
create trigger water_manual_readings_apply
    after insert or update or delete on public.water_manual_readings
    for each row
    when (pg_trigger_depth() = 0)
    execute function public.water_manual_readings_apply();

-- Belt and braces for the invoker paths (the trigger itself runs as the caller).
do $seq$
declare seq text := pg_get_serial_sequence('public.water_daily_consumption', 'id');
begin
    if seq is not null then
        execute format('grant usage, select on sequence %s to authenticated', seq);
    end if;
end
$seq$;

revoke all on function public.water_manual_daily_consumption(text, date) from public, anon;
revoke all on function public.water_manual_apply_day(text, date) from public, anon;
grant execute on function public.water_manual_daily_consumption(text, date) to authenticated, service_role;
grant execute on function public.water_manual_apply_day(text, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Row-level security — same helpers as 20260901 (mb_can_read_module,
--    mb_has_any_role). Registries: read all / write admin. Readings: read all /
--    insert-update-delete operator+.
-- ---------------------------------------------------------------------------
do $rls$
declare
    registry text;
    readings text;
    policy_row record;
begin
    foreach registry in array array['water_manual_meters', 'irrigation_meters'] loop
        execute format('alter table public.%I enable row level security', registry);
        execute format('revoke all on table public.%I from public, anon', registry);
        execute format('grant select, insert, update, delete on table public.%I to authenticated', registry);
        for policy_row in
            select policyname from pg_policies where schemaname = 'public' and tablename = registry
        loop
            execute format('drop policy %I on public.%I', policy_row.policyname, registry);
        end loop;
        execute format(
            'create policy mb_select on public.%I for select to authenticated using ((select public.mb_can_read_module(''water'')))',
            registry);
        execute format(
            'create policy mb_insert on public.%I for insert to authenticated with check ((select public.mb_has_any_role(array[''admin'']::text[])))',
            registry);
        execute format(
            'create policy mb_update on public.%I for update to authenticated using ((select public.mb_has_any_role(array[''admin'']::text[]))) with check ((select public.mb_has_any_role(array[''admin'']::text[])))',
            registry);
        execute format(
            'create policy mb_delete on public.%I for delete to authenticated using ((select public.mb_has_any_role(array[''admin'']::text[])))',
            registry);
    end loop;

    foreach readings in array array['water_manual_readings', 'irrigation_daily_readings'] loop
        execute format('alter table public.%I enable row level security', readings);
        execute format('revoke all on table public.%I from public, anon', readings);
        execute format('grant select, insert, update, delete on table public.%I to authenticated', readings);
        for policy_row in
            select policyname from pg_policies where schemaname = 'public' and tablename = readings
        loop
            execute format('drop policy %I on public.%I', policy_row.policyname, readings);
        end loop;
        execute format(
            'create policy mb_select on public.%I for select to authenticated using ((select public.mb_can_read_module(''water'')))',
            readings);
        execute format(
            'create policy mb_insert on public.%I for insert to authenticated with check ((select public.mb_has_any_role(array[''admin'',''manager'',''operator'']::text[])))',
            readings);
        execute format(
            'create policy mb_update on public.%I for update to authenticated using ((select public.mb_has_any_role(array[''admin'',''manager'',''operator'']::text[]))) with check ((select public.mb_has_any_role(array[''admin'',''manager'',''operator'']::text[])))',
            readings);
        execute format(
            'create policy mb_delete on public.%I for delete to authenticated using ((select public.mb_has_any_role(array[''admin'',''manager'',''operator'']::text[])))',
            readings);
    end loop;
end
$rls$;

-- ---------------------------------------------------------------------------
-- 8. Realtime — open Water pages refresh when a hand reading lands.
--    (water_daily_consumption is already published, so the potable fill is
--    covered; the two readings tables are added here.)
-- ---------------------------------------------------------------------------
do $realtime$
declare t text;
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
        foreach t in array array['water_manual_readings', 'irrigation_daily_readings'] loop
            if not exists (
                select 1 from pg_publication_tables
                where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
            ) then
                execute format('alter publication supabase_realtime add table public.%I', t);
            end if;
        end loop;
    end if;
end
$realtime$;

commit;
