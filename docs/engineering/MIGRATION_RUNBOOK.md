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
order by m;
```

Expected `found` per migration: 0003 → 2 · 0004 → 1 · 0005 → 4 · 0006 → 10 ·
0007 → 5 · 0008 → 15 · 0009 → 3 · 0010 → 2.

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

### 3. Service-role REST probes (optional, from a shell)

Equivalent check without the SQL editor — expects HTTP 200 for each
`table?select=<column>` (columns chosen to match each table's real PK):

```bash
cd backend && node -e '
const { readFileSync } = require("fs");
const env = readFileSync(".env.local", "utf8");
const get = (k) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim();
const url = get("SUPABASE_URL"), key = get("SUPABASE_SERVICE_ROLE_KEY");
const probes = [
  ["0005", "organizations", "id"], ["0005", "teams", "id"],
  ["0005", "organization_members", "user_id"], ["0005", "organization_invites", "token"],
  ["0007", "admin_incidents", "id"], ["0008", "audit_logs", "id"],
  ["0009", "scans", "processing_mode"], ["0010", "user_sessions", "user_id"],
];
(async () => {
  for (const [m, t, c] of probes) {
    const r = await fetch(`${url}/rest/v1/${t}?select=${c}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    console.log(m, t, r.ok ? "OK" : `${r.status} ${(await r.json()).code}`);
  }
})();
'
```

A `42703` (column missing) or `PGRST205` (table missing) pinpoints exactly
which migration is still outstanding.

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

Notes:

- All probes above use the **service role key** (RLS bypassed). The dashboard
  SQL editor runs as `postgres`, which also bypasses RLS — the two views agree.
- The backend reads the schema live; no backend restart is required after
  applying. If the running backend predates the schema change and a probe
  disagrees with the SQL check, trust the SQL check.
- Do **not** hand-edit already-applied migrations (0001/0002) — that creates
  drift with the remote project. New schema changes go in new numbered files.
