-- Per-user monthly API-call metering for the Billing page's apiCalls meter.
--
-- The billing service reads this table (service-role only) to report
-- apiCallsUsed/apiCallsLimit on GET /v1/billing; the per-plan call limit comes
-- from the plan catalog in backend/src/billing/billing.service.ts (not the
-- table) so limits stay code-configurable per plan.
--
-- One row per (user_id, period_month) — the calendar month in UTC, stored as
-- 'YYYY-MM'. A row is created lazily on first write; reads treat a missing row
-- as zero usage, so a fresh DB never breaks the billing payload.
--
-- RLS is enabled with no public policies: the service role bypasses RLS, so
-- only the backend can read/write. The anon/authenticated keys cannot touch
-- it — consistent with user_sessions and the other backend-owned tables.

create table if not exists public.api_usage (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 'YYYY-MM' (UTC) — the billing cycle the usage belongs to.
  period_month text not null,
  calls integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_month)
);

alter table public.api_usage enable row level security;

create index if not exists api_usage_user_period_idx
  on public.api_usage (user_id, period_month);
