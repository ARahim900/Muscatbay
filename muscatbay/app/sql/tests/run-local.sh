#!/usr/bin/env bash
# Applies the security + manual-readings migrations to a THROWAWAY local
# PostgreSQL 16 cluster and runs the assertion scripts in this folder.
# No Supabase project, no network, cannot touch live data.
#
#   PG_BIN=/usr/lib/postgresql/16/bin sql/tests/run-local.sh
#
# Requires the PostgreSQL 16 server binaries (Debian/Ubuntu: postgresql-16).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS="$HERE/../migrations"
PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
WORK="$(mktemp -d)"
PORT="${PG_PORT:-54329}"
DB=mb_test

cleanup() {
    "$PG_BIN/pg_ctl" -D "$WORK/data" stop -m immediate >/dev/null 2>&1 || true
    rm -rf "$WORK"
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$WORK/data" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/pg.log" start >/dev/null
"$PG_BIN/createdb" -h "$WORK" -p "$PORT" -U postgres "$DB"

PSQL=("$PG_BIN/psql" -h "$WORK" -p "$PORT" -U postgres -d "$DB" -v ON_ERROR_STOP=1 -q)

"${PSQL[@]}" -f "$HERE/00-supabase-stubs.sql"

# The stubs' water tables are illustrative; the manual-readings migration
# needs the real registry shape (UNIQUE account_number, meter metadata) and
# the wide daily table it writes into.
"${PSQL[@]}" <<'SQL'
DROP TABLE IF EXISTS public.water_meters CASCADE;
CREATE TABLE public.water_meters (
    meter_id text PRIMARY KEY,
    account_number text NOT NULL UNIQUE,
    meter_name text NOT NULL,
    label text NOT NULL,
    zone text NOT NULL,
    parent_meter text,
    type text NOT NULL,
    sort_order integer
);
INSERT INTO public.water_meters (meter_id, account_number, meter_name, label, zone, parent_meter, type, sort_order) VALUES
    ('MB-L1-001', 'C43659',  'Main Bulk (NAMA)',            'L1', 'Main_Bulk',   NULL,               'Main_BULK', 1),
    ('MB-L2-001', '4300343', 'ZONE 3A (BULK ZONE 3A)',      'L2', 'Zone_03_(A)', 'Main Bulk (NAMA)', 'Zone_Bulk', 2),
    ('MB-L2-003', '4300344', 'ZONE 3B (BULK ZONE 3B)',      'L2', 'Zone_03_(B)', 'Main Bulk (NAMA)', 'Zone_Bulk', 3),
    ('MB-L2-004', '4300345', 'ZONE 5 (Bulk Zone 5)',        'L2', 'Zone_05',     'Main Bulk (NAMA)', 'Zone_Bulk', 4),
    ('MB-L2-005', '4300342', 'ZONE 8 (Bulk Zone 8)',        'L2', 'Zone_08',     'Main Bulk (NAMA)', 'Zone_Bulk', 5),
    ('MB-L2-006', '4300335', 'Village Square (Zone Bulk)',  'L2', 'Zone_VS',     'Main Bulk (NAMA)', 'Zone_Bulk', 6),
    ('MB-L2-002', '4300346', 'ZONE FM ( BULK ZONE FM )',    'L2', 'Zone_01_(FM)','Main Bulk (NAMA)', 'Zone_Bulk', 7),
    ('MB-L3-099', '4300320', 'Irrigation Tank 02 (Z03)',    'L3', 'Zone_03_(B)', 'ZONE 3B',          'IRR_Servies', 8);

CREATE TABLE public.water_daily_consumption (
    id serial PRIMARY KEY,
    meter_id text,
    meter_name text NOT NULL,
    account_number text NOT NULL,
    label text, zone text, parent_meter text, type text,
    month text NOT NULL,
    year integer NOT NULL,
    day_1 numeric(10,3), day_2 numeric(10,3), day_3 numeric(10,3), day_4 numeric(10,3), day_5 numeric(10,3),
    day_6 numeric(10,3), day_7 numeric(10,3), day_8 numeric(10,3), day_9 numeric(10,3), day_10 numeric(10,3),
    day_11 numeric(10,3), day_12 numeric(10,3), day_13 numeric(10,3), day_14 numeric(10,3), day_15 numeric(10,3),
    day_16 numeric(10,3), day_17 numeric(10,3), day_18 numeric(10,3), day_19 numeric(10,3), day_20 numeric(10,3),
    day_21 numeric(10,3), day_22 numeric(10,3), day_23 numeric(10,3), day_24 numeric(10,3), day_25 numeric(10,3),
    day_26 numeric(10,3), day_27 numeric(10,3), day_28 numeric(10,3), day_29 numeric(10,3), day_30 numeric(10,3),
    day_31 numeric(10,3),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE (account_number, month, year)
);
SQL

"${PSQL[@]}" -f "$MIGRATIONS/20260901_invitation_only_security_and_rls.sql"
"${PSQL[@]}" -f "$MIGRATIONS/20260908_manual_meter_readings.sql"
"${PSQL[@]}" -f "$HERE/manual-readings.test.sql"

echo "SQL tests passed."
