-- 0019: scan initiate idempotency.
--
-- POST /scans accepts an Idempotency-Key header so a client retry (network
-- blip, double-submit) cannot create duplicate scan records. The key is
-- stored per user, and the partial unique index scopes the guarantee to the
-- awaiting_upload window — once a scan leaves that state (submitted,
-- completed, failed), the same key starts a fresh record instead of silently
-- reusing a submitted one.

alter table public.scans
  add column if not exists idempotency_key text;

create unique index if not exists scans_user_idempotency_awaiting_idx
  on public.scans (user_id, idempotency_key)
  where status = 'awaiting_upload';
