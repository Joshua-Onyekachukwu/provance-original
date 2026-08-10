-- User-scoped notifications for the in-app bell and notification center.
--
-- Written by the backend notifications service (service-role only): rows are
-- keyed by user_id so every query is scoped to the signed-in user — the same
-- identity pattern as auth_audit_events (actor_email) but with a proper FK so
-- the dashboard + bell surfaces can join and filter by user.
--
-- The column set mirrors the frontend mockNotifications contract:
--   { id, category, title, description, read, link, created_at }
-- `read` is stored as is_read (read is a SQL-reserved-ish keyword in some
-- tooling) and mapped back in the service response.
--
-- RLS is enabled with no public policies: the service role bypasses RLS, so
-- only the backend can read/write. The anon/authenticated keys cannot touch
-- it — consistent with user_sessions and the other backend-owned tables.
--
-- The notifications endpoints degrade gracefully when this migration is not
-- yet applied (list returns empty, mark-read is a no-op) so a fresh DB never
-- blocks the app shell.

create table if not exists public.notifications (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null default 'system',
  title text not null,
  description text,
  -- `read` is a keyword in a few SQL dialects; is_read is unambiguous.
  is_read boolean not null default false,
  -- Optional deep link (e.g. /app/reports/rpt_001) the bell/page navigate to.
  link text,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);
