# Local SQL tests

```bash
PG_BIN=/usr/lib/postgresql/16/bin sql/tests/run-local.sh
```

`run-local.sh` applies the stubs, a realistic `water_meters` /
`water_daily_consumption` pair, the 2026-09-01 security migration and the
2026-09-08 manual-readings migration to a **throwaway local PostgreSQL 16
cluster**, then runs `manual-readings.test.sql`. No Supabase project, no
network, no cost, and it cannot touch live data. `initdb` refuses to run as
root — run the script as an unprivileged user (e.g. `runuser -u postgres --
env PG_BIN=… bash sql/tests/run-local.sh`).

`manual-readings.test.sql` asserts the hand-readings trigger: a lone reading
derives nothing (cell stays NULL), consecutive readings derive today − yesterday
into `water_daily_consumption.day_N`, corrections and deletions propagate for
`manual_owned` meters, a Grafana value on a shared meter is never overwritten
while an empty cell is filled, negatives are kept, irrigation readings never
reach the potable table, viewers cannot write, and registries are admin-only.

The two older assertion files below (`rls-roles`, `alert-incidents`) predate
the runner and are not wired into it yet.

Requires the PostgreSQL 16 server binaries — on Debian/Ubuntu
`apt-get install -y postgresql-16`. Set `PG_BIN` if they live elsewhere.

## Why this exists

These migrations decide two things that are invisible to TypeScript tests and
expensive to get wrong:

- **who can read and write what** (`20260901_invitation_only_security_and_rls.sql`)
- **when an open operational incident may be closed** (`20260901_operational_alert_incidents.sql`)

A Supabase preview branch would exercise them, but it is billed hourly and was
declined. A local cluster runs the same PL/pgSQL and the same policy engine.

## What is stubbed, and what is not

`00-supabase-stubs.sql` supplies **identity and structure only**: `auth.users`,
a session-settable `auth.uid()`, the `storage` schema, the four Supabase roles,
and the core tables the migration's preflight requires.

Every **rule** under test — the `mb_*` role helpers, the RLS policies, the
grants, the invitation trigger — comes from the real migration files. Stubbing
those would make the tests agree with themselves rather than with production.

## Coverage

`rls-roles.test.sql` (31 assertions) runs as the `authenticated` and `anon`
database roles PostgREST actually uses:

| area | asserted |
|---|---|
| Invitation gate | an uninvited identity cannot be created; the Before-User-Created hook returns 403 for uninvited, revoked and expired invitations, and admits an invited email case-insensitively; accepting consumes the invitation |
| Viewer | reads operational data; insert is rejected; update and delete change nothing |
| Contractor | reads only the modules in `module_scope`; everything else reads as empty |
| Operator | inserts and updates operational data; delete changes nothing |
| Admin | deletes |
| Uninvited session | a valid `auth.uid()` with no profile row sees nothing |
| `anon` | reads nothing; may submit a *pending* professional application only, and cannot read it back |
| Escalation | a user may edit their own profile but cannot change their own role or widen their own module scope |
| Unlisted tables | fail-closed |

`alert-incidents.test.sql` (21 assertions) covers the incident lifecycle:
escalation keeps its acknowledgement, a module read on incomplete evidence
cannot close anything, a `NULL` resolution grant resolves nothing, per-agreement
incidents resolve independently, a returning condition opens a separate episode,
and only `service_role` may execute the reconciler.

## What this does NOT replace

There is no PostgREST here, so nothing HTTP-level is verified — JWT parsing, the
REST error surface, `Prefer` headers. Run `npm run test:rls:staging` against a
real project before applying anything to production.

## Reading a failure

Two different denials look different on purpose:

- a missing **GRANT** raises `permission denied` — the statement is rejected;
- an **RLS policy** whose `USING` clause matches no row silently affects zero
  rows on `UPDATE`/`DELETE`, and returns an empty set on `SELECT`.

Tests assert the right one for each case. An assertion that expects an
exception where RLS actually returns zero rows would pass for the wrong reason.
