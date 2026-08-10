-- User session ledger and per-user security settings.
--
-- Written by the backend security service (service-role only): every
-- sign-in / session refresh upserts a row keyed by (user_id, auth_session_id)
-- where auth_session_id is the `sid` claim of the Supabase access-token JWT
-- (the same id GoTrue uses in auth.sessions). Only a SHA-256 hash of the
-- refresh token is stored — never the raw token — so a DB leak cannot replay
-- a session credential; revocation goes through the GoTrue admin API by
-- session id instead.
--
-- RLS is enabled with no public policies: the service role bypasses RLS, so
-- only the backend can read/write the ledger. The anon/authenticated keys
-- cannot touch it.
--
-- The security endpoints degrade gracefully when this migration is not yet
-- applied (settings default, sessions render empty) so a fresh DB never
-- blocks sign-in — consistent with the billing plan fallback.

create table if not exists public.user_sessions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- The `sid` claim of the Supabase access token — the durable key that
  -- survives refresh-token rotation (a refresh keeps the same auth session).
  auth_session_id text not null,
  -- SHA-256 hex of the current refresh token. Used to clean the ledger row
  -- on sign-out, where only the cookie refresh token is available.
  refresh_token_hash text,
  device text not null default 'Unknown device',
  ip_address text,
  location text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  unique (user_id, auth_session_id)
);

alter table public.user_sessions enable row level security;

create index if not exists user_sessions_user_last_active_idx
  on public.user_sessions (user_id, last_active_at desc);

-- Per-user sign-in controls (2FA flag, session timeout, notify preferences).
-- Mirrors the frontend mockSecuritySettings.signInControls contract.
create table if not exists public.user_security_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  two_factor_enabled boolean not null default false,
  session_timeout_minutes integer not null default 60,
  notify_on_new_device boolean not null default false,
  notify_on_password_change boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_security_settings enable row level security;
