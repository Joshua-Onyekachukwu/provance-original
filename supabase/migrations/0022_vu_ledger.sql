-- 0022: VU (Verification Unit) ledger.
--
-- The metered billing model charges verification work in VUs, not flat scan
-- counts: each scan consumes VUs at the depth it ran (quick 1 / standard 10 /
-- deep 100), deducted when the scan COMPLETES. Failed scans consume 0 — no
-- row is written. Every deduction is a ledger row so usage is as auditable as
-- scans: (scan_id, depth, units, source, cycle_month, applied_rate).
--
-- `applied_rate` snapshots the depth's VU cost at the time of the scan so a
-- future cost-table change (the "tighten the dial" lever) never rewrites
-- history — the meter stays auditable.
--
-- `source` is the deduction origin: package (workspace allowance), topup
-- (pre-paid packs, deferred), api (keyed API calls), rollover (carried-over
-- credits, deferred). `cycle_month` ('YYYY-MM') mirrors api_usage.period_month
-- so the API meter and the workspace meter read the same ledger.

create table if not exists public.vu_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  depth text not null check (depth in ('quick', 'standard', 'deep')),
  units integer not null check (units >= 0),
  source text not null default 'package' check (source in ('package', 'topup', 'api', 'rollover')),
  cycle_month text not null,
  applied_rate integer,
  created_at timestamptz not null default now()
);

-- The billing meter sums a user's units per cycle (created_at >= periodStart);
-- the API meter reads the same ledger per period month.
create index if not exists vu_ledger_user_created_idx
  on public.vu_ledger (user_id, created_at);

alter table public.vu_ledger enable row level security;

drop policy if exists "VU ledger is readable by owner" on public.vu_ledger;
create policy "VU ledger is readable by owner"
on public.vu_ledger
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "VU ledger is insertable by owner" on public.vu_ledger;
create policy "VU ledger is insertable by owner"
on public.vu_ledger
for insert
to authenticated
with check (auth.uid() = user_id);
