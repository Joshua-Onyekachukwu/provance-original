# Schema Migration Runbook: 0003–0010 (Dashboard SQL Editor)

How to apply `supabase/migrations/0003_admin_ops.sql` through
`0010_user_sessions.sql` to the live Supabase project using the **dashboard
SQL Editor** (pg-meta), in dependency order, with a verification checklist
per migration.

## Why this runbook exists

- The project's migrations have historically been applied **manually via the
  dashboard SQL Editor** (pg-meta locks the migration runner), so there is no
  CLI `supabase db push` path to rely on.
- The configured backend project is
  `https://dmhrwdcuwtgscwlaagsa.supabase.co` (see `backend/.env.local`).
  As of **2026-08-10** (verified by the new `MigrationHealthService` startup
  diff — see below) that project has **0001, 0002, 0003, 0004, 0006 applied**
  (`scans` with 4 rows, `profiles` with 3, waitlist tables + 0003 admin_ops
  columns + 0006 feature_flags) and is **missing 0005, 0007, 0008, 0009,
  0010, 0011, 0012, 0013, 0014, 0015, 0016, 0018, 0019, 0020** (all
  `PGRST205`/`42703`). That state 503s `POST /v1/scans`, keeps
  `/v1/health/readiness` degraded, and fails the live
  `invite-accept.e2e-spec.ts` seed.
- **Probe caveat:** verify live schema state with **non-head** selects (or
  `select('*')`) using the backend's supabase-js v2 — `head: true` / HEAD
  requests mask PostgREST error bodies (`PGRST205`/`42703`), so a v1-style
  client or `head: true` probe can report tables as present when they are
  not. The canonical check is `backend/scripts/probe-monitoring-tables.mjs`
  (which uses `select('*')` for incidents).
- **Automated guard:** `MigrationHealthService` (in `backend/src/health/`)
  diffs `supabase/migrations/` against the live schema with one non-head
  probe per migration — it logs every missing migration at startup and adds
  a `checks.migrations` entry to `GET /v1/health/readiness` (gating `ready`),
  so a half-migrated deployment is surfaced at boot and with one request.
  Keep `MIGRATION_PROBES` in sync when new migrations land; a file without a
  probe is warned about at boot (self-enforcing).
- Every file is **idempotent** (`if not exists`, `on conflict do nothing`,
  `create or replace`, `add column if not exists`), so re-running an already
  applied migration is safe. Applying the full 0003–0010 set in order is the
  intended way to converge a fresh or half-migrated project.
- The backend probes the schema live (no restart needed after applying), but
  PostgREST re-reads the schema on DDL — if a probe still reports a missing
  table seconds after a run, wait a few seconds and re-run the probe before
  assuming failure.

## Dependency order

Numeric order **is** the correct order. The only real dependencies:

| Migration | Depends on | Why |
| --------- | ---------- | --- |
| 0003 | 0001 | alters `waitlist_applications` + `access_invites` |
| 0004 | 0001 | trigger uses `public.set_updated_at()` (defined in 0001) |
| 0005 | 0001 | triggers use `set_updated_at()`; FKs to `auth.users` |
| 0009 | 0002 | alters `public.scans` (created in 0002) |
| 0010 | — | FK to `auth.users` only |

0006, 0007, 0008 are standalone (no project-schema deps).

## Applying a migration (general steps)

1. Open the Supabase dashboard → your project → **SQL Editor**.
2. Open the migration file in the repo (`supabase/migrations/<NN>_*.sql`) and
   copy its **entire contents**.
3. Paste into the editor, click **Run**.
4. Expect a green "Success" banner. If the editor reports an error, read the
   first error line (usually a missing dependency — apply the prerequisite
   migration first) and re-run.
5. Run that migration's verification check below, then move to the next file.

---

## 0003 — `admin_ops.sql`

**Creates/alters:** adds `waitlist_applications.notes` and
`access_invites.invited_by`.
**Unlocks:** admin waitlist notes + invite attribution (`/v1/admin/waitlist`).

**Verify** (paste into SQL Editor — expect **2 rows**):

```sql
select column_name, table_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'waitlist_applications' and column_name = 'notes')
    or (table_name = 'access_invites' and column_name = 'invited_by')
  );
```

---

## 0004 — `profiles.sql`

**Creates:** `public.profiles` (PK `user_id` → `auth.users`), RLS owner
policies, `set_updated_at` trigger. Also ensures `pgcrypto`.
**Unlocks:** account API (`/v1/account/me`, profile update), admin users.

**Verify** (expect **1 row**):

```sql
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'profiles';
```

---

## 0005 — `organization.sql`

**Creates:** `organizations`, `teams`, `organization_members`,
`organization_invites` + RLS policies + triggers.
**Unlocks:** org API (`GET /v1/organization`, invites, member role/team,
DELETE), team scoping on scans, admin org views.

**Verify** (expect **4 rows**):

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('organizations', 'teams', 'organization_members', 'organization_invites');
```

---

## 0006 — `feature_flags.sql`

**Creates:** `public.feature_flags` + 10 seed rows.
**Unlocks:** feature-flag API + admin page.

**Verify** (expect **10**):

```sql
select count(*) from public.feature_flags;
```

---

## 0007 — `incidents.sql`

**Creates:** `public.admin_incidents` + 5 seed rows (relative timestamps).
**Unlocks:** admin monitoring incidents section (`GET /v1/admin/monitoring`
degrades gracefully when missing, but the section stays empty).

**Verify** (expect **5**):

```sql
select count(*) from public.admin_incidents;
```

---

## 0008 — `audit_logs.sql`

**Creates:** `public.audit_logs` + 15 seed rows + indexes.
**Unlocks:** admin audit logs (`GET /v1/admin/audit-logs`).

**Verify** (expect **15**):

```sql
select count(*) from public.audit_logs;
```

---

## 0009 — `scan_processing.sql`

**Alters:** adds `scans.processing_mode`, `scans.team_id`,
`scans.completed_at` + status indexes.
**Unlocks:** **the scan round-trip** — without it `POST /v1/scans` returns
`503 "migration 0009 not applied"`. This is the hard gate for
initiate → upload → submit → worker → complete → report.

**Verify** (expect **3 rows**):

```sql
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'scans'
  and column_name in ('processing_mode', 'team_id', 'completed_at');
```

---

## 0010 — `user_sessions.sql`

**Creates:** `public.user_sessions` (session ledger, refresh-token hash only,
RLS with no public policies) + `public.user_security_settings`.
**Unlocks:** active-sessions surface (`GET/DELETE /v1/security/sessions`),
sign-in controls; second hard gate for the readiness endpoint.

**Verify** (expect **2 rows**):

```sql
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('user_sessions', 'user_security_settings');
```

---

## Post-apply verification

### 1. One-shot object check (paste once, expect the noted counts)

```sql
select '0003' m, 'notes + invited_by cols' obj, count(*) found
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'waitlist_applications' and column_name = 'notes')
    or (table_name = 'access_invites' and column_name = 'invited_by'))
union all
select '0004', 'profiles', count(*) from information_schema.tables
  where table_schema = 'public' and table_name = 'profiles'
union all
select '0005', 'org tables', count(*) from information_schema.tables
  where table_schema = 'public'
  and table_name in ('organizations', 'teams', 'organization_members', 'organization_invites')
union all
select '0006', 'feature_flags rows', count(*) from public.feature_flags
union all
select '0007', 'incidents rows', count(*) from public.admin_incidents
union all
select '0008', 'audit_logs rows', count(*) from public.audit_logs
union all
select '0009', 'scan processing cols', count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'scans'
  and column_name in ('processing_mode', 'team_id', 'completed_at')
union all
select '0010', 'sessions tables', count(*) from information_schema.tables
  where table_schema = 'public'
  and table_name in ('user_sessions', 'user_security_settings')
union all
select '0011', 'notifications table', count(*) from information_schema.tables
  where table_schema = 'public' and table_name = 'notifications'
union all
select '0012', 'profiles.team_id col', count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'team_id'
union all
select '0013', 'scans.file_hash_sha256 col', count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'scans' and column_name = 'file_hash_sha256'
union all
select '0014', 'crash_reports table', count(*) from information_schema.tables
  where table_schema = 'public' and table_name = 'crash_reports'
union all
select '0015', 'invites.token_hash col', count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'organization_invites'
  and column_name = 'token_hash'
union all
select '0016', 'role_scopes table', count(*) from information_schema.tables
  where table_schema = 'public' and table_name = 'role_scopes'
union all
select '0017', 'sessions seed rows (dev account)', count(*) from public.user_sessions
  where user_id = (select id from auth.users
                   where email = 'founder.admin@provance.local' limit 1)
union all
select '0018', 'better-auth tables', count(*) from information_schema.tables
  where table_schema = 'public'
  and table_name in ('user', 'session', 'account', 'verification', 'twoFactor',
    'organization', 'team', 'member', 'teamMember', 'invitation', 'role', 'apiKey')
union all
select '0019', 'scans.idempotency_key col', count(*) from information_schema.columns
  where table_schema = 'public' and table_name = 'scans' and column_name = 'idempotency_key'
union all
select '0020', 'api_usage table', count(*) from information_schema.tables
  where table_schema = 'public' and table_name = 'api_usage'
order by m;
```

Expected `found` per migration: 0003 → 2 · 0004 → 1 · 0005 → 4 · 0006 → 10 ·
0007 → 5 · 0008 → 15 · 0009 → 3 · 0010 → 2 · 0011 → 1 · 0012 → 1 · 0013 → 1 ·
0014 → 1 · 0015 → 1 · 0016 → 1 · 0017 → 3 · 0018 → 12 · 0019 → 1 · 0020 → 1.

(`0017 → 3` is conditional: the seed only inserts when the dev test account
`founder.admin@provance.local` exists in `auth.users` — expect 0 in a
project without that account. `0018 → 12` counts the twelve Better Auth
core/plugin tables; this row is informational since the live auth flow
still runs on GoTrue behind `USE_BETTER_AUTH`.)

### 2. Readiness endpoint (backend must be running on :4000)

```bash
curl http://localhost:4000/v1/health/readiness
```

Acceptance: `"status": "ready"` requires ALL of:

- `checks.scansSchema.ready = true` — flips only when **0009** lands
  (`processing_mode`/`team_id`/`completed_at` on `scans`).
- `checks.userSessions.ready = true` — flips only when **0010** lands
  (`user_sessions` + `user_security_settings`).
- `checks.migrations.ready = true` — the `MigrationHealthService` diff gate:
  it lists every `supabase/migrations/*.sql` file whose probe still fails,
  and it also gates `ready`. **Applying 0005–0010 alone leaves `status`
  `degraded`** because 0011–0020 remain unapplied — to converge to `ready`
  in one paste, apply the full missing set
  (`.freebuff/combined-0005-0020.sql`, all idempotent, numeric order).

The `queue` check is informational (BullMQ configured vs inline fallback) and
does not gate `ready`.

### 3. One-command schema check (from a shell)

The canonical pre-walk gate — probes the SAME `MIGRATION_PROBES` list the
readiness `checks.migrations` check uses (imported from
`src/health/migration-health.service.ts`), so the script and the health
endpoint can never disagree:

```bash
cd backend && npm run build && npm run validate:migrations
```

Prints a **project banner** (the Supabase project ref this env probes, plus a
direct SQL-editor link), every migration's status (`OK`/`MISSING`/`SKIP`), an
applied/missing summary, and — on failure — the exact
`MISSING MIGRATIONS: <n> (<file>), …` list plus a **project/env mismatch
check**, exiting non-zero. A `42703` (column missing) or `PGRST205` (table
missing) pinpoints which migration is still outstanding. Equivalent to the
service-role REST probes below, minus the SQL editor.

**Using it to diagnose a project/env mismatch before any live walk:** the
banner names the project this env actually probes. When migrations were
applied in the dashboard but the check still reports them missing, compare
that ref with the project id in the SQL Editor's browser URL bar — they must
match. If they don't, the paste went to a different project than
`backend/.env.local` points at (the banner's dashboard link opens the SQL
editor for exactly the probed project). The applied set is the fingerprint:
this project shows `0001, 0002, 0003, 0004, 0006` applied, so a dashboard
project with a different applied set is not the one the env probes.

### 4. Admin surface walk (after 0008 + 0009 land)

Once `audit_logs` (0008) and `scans.processing_mode` (0009) are applied, the
admin jobs surface is verifiable end to end with one command (backend must be
running):

```bash
cd backend && npm run validate:admin-jobs
```

Seeds one synthetic `failed` scan, then walks the Admin Jobs contract live:
`GET /admin/jobs` envelope, `?status=` server-side filter, pagination
(disjoint pages + exact total), `POST /admin/jobs/:id/retry` (row flips to
`queued`), and `GET /admin/audit-logs?actor=…&action=scan.retried` showing
`severity: medium` with the admin actor. The synthetic scan is deleted on
cleanup; the audit rows are intentionally left. Uses the documented seed
account `founder.admin@provance.local` (override with `ADMIN_WALK_EMAIL` /
`ADMIN_WALK_PASSWORD`) and creates it via the GoTrue admin API if it does
not exist yet. The walk scripts resolve the running backend by probing
`/v1/health` for `service=provance-backend` (a foreign `PORT` env var from
the dev shell is ignored).

### 5. Org-admin session revocation walk (after 0005 + 0010 land)

Once `organizations` (0005) and `user_sessions` (0010) are applied, the org
member-sessions surface is verifiable end to end with one command:

```bash
cd backend && npm run validate:org-revoke
```

Signs in the allowlisted org admin, creates a throwaway member, signs it in
twice with different User-Agents (two real devices → two `user_sessions`
rows), seeds one org (admin = owner, member = member), then walks
`GET /organization/members/:id/sessions` (both rows, team + `isNewDevice`),
`DELETE /organization/members/:id/sessions/:sid` (ledger drops to one), and
the two-device proof (revoked token 401s on `/auth/me`, the survivor 200s).
Member user + seeded org are always deleted; the admin account stays.
Re-runs are safe — stale walk orgs and member users are purged first.

---

## Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `PGRST205` / "Could not find the table in the schema cache" | table not created | re-run that migration; if just applied, wait a few seconds (PostgREST schema reload) and re-probe |
| `42703` / "column X does not exist" | column not added (e.g. 0009) | re-run the ALTER migration |
| `503 "migration 0009 not applied"` on `POST /v1/scans` | 0009 missing | apply 0009 |
| SQL editor error on 0004/0005 | missing `set_updated_at()` (0001) or ran out of order | apply 0001 first, then re-run |
| SQL editor error on 0009 | `public.scans` missing (0002 not applied) | apply 0002 first |
| Migration applied but a *value* looks off (0 rows in a seeded table) | `on conflict do nothing` + an earlier partial run | re-run the file; seeds are upsert-style |
| Applied migrations in the dashboard SQL editor, but `npm run validate:migrations` still reports them missing | **project/env mismatch** — the paste went to a different Supabase project than the one `backend/.env.local` probes | run `cd backend && npm run build && npm run validate:migrations` and compare the printed project ref with the project id in your SQL Editor URL bar (`supabase.com/dashboard/project/<ref>/…`); re-paste the combined block into the ref the command names (the banner prints a direct editor link) |

Notes:

- All probes above use the **service role key** (RLS bypassed). The dashboard
  SQL editor runs as `postgres`, which also bypasses RLS — the two views agree.
- The backend reads the schema live; no backend restart is required after
  applying. If the running backend predates the schema change and a probe
  disagrees with the SQL check, trust the SQL check.
- Do **not** hand-edit already-applied migrations (0001/0002) — that creates
  drift with the remote project. New schema changes go in new numbered files.
