-- 0013: scan deduplication.
--
-- Hash-based dedup: when a user submits a scan whose SHA-256 matches a prior
-- completed scan of theirs, the backend skips reprocessing and reuses the
-- prior result payload (see scans.service.ts submitScan). The hash is written
-- at submit time so the lookup is an indexed equality, not a payload scan.

alter table public.scans
  add column if not exists file_hash_sha256 text;

-- The dedup lookup filters by user + hash on completed rows only.
create index if not exists scans_user_hash_complete_idx
  on public.scans (user_id, file_hash_sha256)
  where status = 'complete';
