-- 0009: scan processing metadata.
--
-- The mock scan rows the frontend consumes carry processing_mode, team_id, and
-- completed_at. The real scans table needs them so the API boundary can emit
-- the same row dialect for queue/ledger/report surfaces.

alter table public.scans
  add column if not exists processing_mode text not null default 'standard',
  add column if not exists team_id uuid,
  add column if not exists completed_at timestamptz;

-- The queue snapshot and admin analytics aggregate on status; keep the common
-- filters indexed.
create index if not exists scans_status_idx on public.scans (status);
create index if not exists scans_user_status_idx on public.scans (user_id, status);
