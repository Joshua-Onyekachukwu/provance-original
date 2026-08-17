-- 0021: scan retry telemetry.
--
-- The worker (BullMQ path) retries a failing scan up to `attempts: 3` with
-- exponential backoff before landing it in the terminal 'failed' state. This
-- migration records how many attempts the worker actually burned so the admin
-- Jobs page can show operators the real retry count instead of a neutral
-- default: scans.attempts_made = attempts burned, scans.max_attempts = the
-- configured retry budget at enqueue time (3 for BullMQ, 1 for the inline
-- no-retry path).
--
-- Both columns default to a sane fallback so rows written before this
-- migration (or by paths that do not report attempts) render 1/3 rather than
-- null: a failed scan with no telemetry means "failed on its first attempt".

alter table public.scans
  add column if not exists attempts_made integer not null default 1;

alter table public.scans
  add column if not exists max_attempts integer not null default 3;
