-- Role scope grants. The RBAC role matrix (ADMIN_ROLES in the backend roles
-- module) declares the default scope grants as product config; this table
-- holds the *overrides* saved through PATCH /admin/roles/:roleId/scopes so
-- permission edits survive restarts. The list endpoint merges these rows over
-- the defaults (DB wins), which keeps new scope keys working the moment they
-- ship without a migration.
--
-- RLS is enabled with no public policies: the Supabase service role bypasses
-- RLS, so only the backend can read/write the grants (same as audit_logs).

create table if not exists public.role_scopes (
  role_id text not null,
  scope_key text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (role_id, scope_key)
);

alter table public.role_scopes enable row level security;

create index if not exists role_scopes_role_idx on public.role_scopes (role_id);
