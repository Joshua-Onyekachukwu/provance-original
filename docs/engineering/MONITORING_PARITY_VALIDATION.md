# /admin/monitoring — Live Parity Walk

Validated **2026-08-09** against a running backend + real Supabase project:
the real `GET /v1/admin/monitoring` payload was compared field-by-field with
`mockMonitoring` (`src/lib/mockData.js`) and the Monitoring page was rendered
end-to-end with `USE_MOCK = false`.

## How to reproduce

```bash
# backend on PORT 4000 (pin it — the ambient shell may export PORT=62392):
cd backend
PORT=4000 npm run start

# sign in as the dev admin and capture the live payload:
curl -s -X POST http://localhost:4000/v1/auth/sign-in \
  -H 'Content-Type: application/json' \
  -d '{"email":"founder.admin@provance.local","password":"<seed password>"}' \
  -o .freebuff/parity-signin.json
TOKEN=$(node -e "console.log(require('./.freebuff/parity-signin.json').session.accessToken)")
curl -s http://localhost:4000/v1/admin/monitoring -H "Authorization: Bearer $TOKEN" \
  -o .freebuff/real-monitoring.json

# compare against the mock, field-by-field:
cd backend
npm run validate:monitoring-parity
```

The parity script exits `0` on **contract parity** (structural shape matches,
including row-by-row series checks) and `2` on hard drift (missing keys, wrong
element shapes, non-ISO dates, non-integer counts, non-monotonic series).
Value-level differences that the page already renders honestly (nulls → '—',
fewer live buckets, zero live counts) are reported as **soft drifts** and do
not fail the walk — they are data-driven, not contract breaks.
For the page-level check: flip `USE_MOCK` to `false` in `src/lib/api.js`, sign
in with the real dev account, open `/app/admin/monitoring`, then revert.

## Result: shape parity, 3 value-level drifts (all rendered as '—')

Top-level keys match exactly: `overall, services, queue_health,
storage_utilization, db_performance, incidents`. `queue_health.hourly_series`
(12 rows) and `daily_series` (14 rows) match the mock field-for-field: every
row carries the contract key set (`hour, processed` / `date, processed,
completed, failed`), ISO timestamps (top-of-hour / noon UTC), integer counts,
and monotonic oldest→newest ordering — verified on **all** rows, not just the
first (the script's `checkSeries`). The three remaining differences are
**soft value-level drifts**, not missing fields:

| Field | Mock | Real (live) | Why / handling |
|---|---|---|---|
| `queue_health.avg_processing_time_ms` | number | `null` | No completions in the live 24h window → no latency samples. Page renders `—` via `formatDurationMs`. |
| `storage_utilization.buckets` | 4 buckets (media/reports/evidence/backups + `growth_30d`) | 1 bucket (`uploads`, `growth_30d: null`) | Real endpoint derives usage honestly from the actual uploads bucket + scan bytes; field shape identical. Page renders `growth_30d ?? 0` and handles empty. |
| `db_performance.cache_hit_rate` | 0.982 | `null` | Postgres cache-hit can't be read via the Supabase REST API; `size_mb: 0` / `dead_tuples_pct: null` likewise. Page renders `—`. |

## Reconciliation shipped

1. **Incidents section now degrades instead of 503-ing the page** —
   `AdminService.getMonitoring` threw `ServiceUnavailableException` when ANY
   of its eight parallel queries failed. Live, that meant one missing table
   (`admin_incidents`, migration `0007_incidents.sql` never applied) blanked
   the entire monitoring surface. The incidents query is display-only: its
   failure now yields `incidents: []` and forces `overall.status` to
   `degraded` (so the gap stays visible), while every core query still fails
   hard. Locked by a new spec test (admin.service.spec.ts: "degrades the
   incidents section (not a 503)…").
2. **Live page walk confirmed** — with `USE_MOCK = false` the Monitoring page
   rendered the real payload: measured probe latencies (avg response 309ms,
   p95 327ms), real table stats (scans 4 rows, profiles 3), `Queue: Not
   configured` (no REDIS_URL), single 0.0 GB uploads bucket, 0 incidents, and
   every null field (`AVG TIME`, `CACHE HIT`, dead tuples, uptime) rendering
   `—`. The all-zero hourly series correctly hides the hourly chart.

## Remaining live-project gap

`supabase/migrations/0007_incidents.sql` (and earlier-discovered `0010`,
`0015`, `0017`) still need to be applied in the Supabase dashboard SQL editor.
Until then the incidents section stays empty and the status chip reads
"Partial degradation" — by design, so the gap is never silent.
