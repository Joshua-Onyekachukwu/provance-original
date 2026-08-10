-- 0014: client crash reports (pre-Sentry telemetry).
--
-- Backs POST /v1/telemetry/errors, where the frontend flushes its buffered
-- render-error records (src/lib/telemetry.js). client_id is the client's
-- `cr-…` record id and the primary key, so a retried flush upserts in place
-- instead of duplicating the same crash.

create table if not exists public.crash_reports (
  client_id text primary key,
  type text not null default 'render_error',
  message text not null default '',
  stack text,
  component_stack text,
  route text,
  user_agent text,
  user_id text,
  email text,
  meta jsonb not null default '{}',
  reported_at timestamptz,
  received_at timestamptz not null default now()
);

-- Triage ordering for a future admin crash surface (newest first).
create index if not exists crash_reports_reported_at_idx
  on public.crash_reports (reported_at desc);
