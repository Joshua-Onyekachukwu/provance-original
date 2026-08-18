-- 0023: per-scan VU meter columns on the scans table.
--
-- The VU ledger (0022) is the billing record of record, but the scan row
-- itself now carries the units it was charged at completion — processing_mode
-- (the depth) plus the metered units and the applied-rate snapshot — so a
-- scan's cost is auditable without a ledger join and survives even if ledger
-- rows were ever pruned. Mirrors the ledger-row shape
-- (scan_id, depth, units, cycle, user, source): depth = processing_mode
-- (already present), units = vu_units, rate snapshot = vu_applied_rate.
--
-- Both columns are NULL until the scan completes under the metering build
-- (legacy rows keep NULL rather than fabricating a charge). Failed scans
-- never reach the completion write, so they remain NULL — 0 charge.

alter table public.scans
  add column if not exists vu_units integer,
  add column if not exists vu_applied_rate integer;

comment on column public.scans.vu_units is
  'VU units charged when the scan completed (quick 1 / standard 10 / deep 100); NULL until completion under the metering build, NULL for failed scans (0 charge).';
comment on column public.scans.vu_applied_rate is
  'Snapshot of the depth VU cost applied at completion — history stays auditable if VU_COST_BY_DEPTH later changes (the tighten-the-dial lever).';
