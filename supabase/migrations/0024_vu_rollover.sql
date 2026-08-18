-- 0024: VU rollover (≤1× monthly).
--
-- Unused VUs from the prior cycle carry into the current cycle's limit,
-- bounded at 1× the monthly allowance so the balance can never accumulate
-- forever: `carried = min(max(0, allowance − priorCycleUsed), 1 × allowance)`.
-- Because unused can never exceed one allowance, the cap is enforced by
-- construction — a heavy user's banked balance can never compound across
-- months. `unitsLimit = allowance + carried` is what the Billing page and the
-- 402 gate read.
--
-- The carried amount is recorded as a `source = 'rollover'` ledger row in the
-- current cycle — a limit-side credit, NOT a deduction. The usage meter
-- (`countCycleUnits`) excludes rollover rows so the carry never inflates
-- unitsUsed; the row exists for auditability (one per user per cycle, via the
-- partial unique index) and its `rollover_basis` snapshots the allowance the
-- carry was computed against, mirroring `applied_rate`'s never-rewrite-history
-- philosophy: a future allowance change never obscures how a carry was derived.
--
-- Requires 0022 (vu_ledger) — rollover rows live in the same ledger.

-- Rollover rows have no scan/depth — the row is a credit, not a deduction.
-- (The depth IN (...) CHECK passes for NULL in Postgres, so only the NOT NULL
-- needs relaxing.)
alter table public.vu_ledger alter column depth drop not null;

-- The monthly allowance the carry was computed against (audit parity with
-- applied_rate). NULL for deduction rows; set on rollover rows.
alter table public.vu_ledger add column if not exists rollover_basis integer;

-- One rollover row per user per cycle — the lazy writer (resolveUsage) is
-- check-then-insert, and this index is the hard backstop against duplicates.
create unique index if not exists vu_ledger_rollover_cycle_idx
  on public.vu_ledger (user_id, cycle_month)
  where source = 'rollover';
