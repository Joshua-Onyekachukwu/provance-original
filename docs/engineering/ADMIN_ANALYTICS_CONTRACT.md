# Admin Analytics API Contract — `GET /admin/analytics`

Real-path counterpart of the frontend's `getAnalytics()` (src/lib/api.js), consumed
by the **Admin Analytics page** (src/pages/admin/AnalyticsPage.jsx). Behind
`SupabaseAuthGuard + AdminGuard`, throttled at 30 req/min.

## Response shape

Mirrors `mockAnalytics` exactly (src/lib/mockData.js). All rates are 0..1 decimals.

```jsonc
{
  "scans_today": 47,              // scans created in the last 24h
  "scans_7d": 312,                // scans created in the last 7 days
  "completion_rate": 0.94,        // complete / total over the 14-day trend window
  "failure_rate": 0.03,           // failed / total over the trend window
  "suspicious_rate": 0.22,        // suspicious verdicts / total over the trend window
  "media_type_distribution": { "video/mp4": 142 },  // mime → count, 7-day window
  "volume_trend": [               // 14 daily buckets, oldest → newest
    { "date": "2026-07-24T12:00:00.000Z", "scans": 26, "completed": 25, "failed": 1, "suspicious": 5 }
  ],
  "verdict_trend": [              // 14 daily buckets, oldest → newest
    { "date": "2026-07-24T12:00:00.000Z", "authentic": 14, "suspicious": 6, "inconclusive": 5 }
  ],
  "queue_throughput": {
    "processed_last_hour": 31,
    "processed_24h": 442,
    "avg_processing_time_ms": 1240,   // completed_at − created_at proxy, or null
    "queue_depth": 8,                 // whole-table head count of status='queued'
    "in_flight": 3,                   // whole-table head count of status='processing'
    "failure_rate": 0.03,
    "hourly_series": [                // 12 hourly buckets, oldest → newest
      { "hour": "2026-07-24T05:00:00.000Z", "processed": 14 }
    ]
  },
  "top_organizations": [              // ≤6, sorted by real scan_count desc
    { "id": "…", "name": "…", "member_count": 4, "scan_count": 342,
      "storage_used_gb": 18.4, "completion_rate": 0.9 }
  ]
}
```

## Aggregation semantics (real path)

All derived from the `scans` table via the service-role admin client (RLS bypassed),
covering the last **30 days** of rows (`created_at >= now - 30d`) so every window
below is satisfiable in one fetch.

| Field | Derivation |
| --- | --- |
| `scans_today` / `scans_7d` | `created_at` within 24h / 7 days (any status) |
| `volume_trend` | 14 daily buckets keyed by `created_at::date`; `suspicious` = completed scans whose verdict class is `suspicious` |
| `verdict_trend` | 14 daily buckets; verdict read from `result_payload.verdict.class`: `likely_authentic` → `authentic`, `suspicious` → `suspicious`, `inconclusive` → `inconclusive` |
| `completion_rate` / `failure_rate` / `suspicious_rate` | summed over the 14-day trend window (matches the chart horizon) |
| `media_type_distribution` | 7-day window keyed by `mime_type` (mock parity: media totals equal `scans_7d`) |
| `processed_last_hour` / `processed_24h` | completed scans within 1h / 24h |
| `avg_processing_time_ms` | mean of `updated_at − created_at` for completed scans in window (no dedicated processing-time column exists); `null` when no samples |
| `queue_depth` / `in_flight` | whole-table exact head counts of `status = queued` / `processing` |
| `hourly_series` | completed scans bucketed by hour over the last 12h |
| `top_organizations` | orgs with real member counts (from `organization_members`), real scan counts (user → org via first membership), storage from `organizations.storage_used_gb`, per-org completion = completed/total; **scan counts share the same 14-day trend window** so they reconcile with the KPI/trend numbers; sorted desc by scan count, capped at 6 |

### Verdict mapping

The real `scans` table stores verdicts inside `result_payload.verdict.class` (see
backend/src/scans/scans.service.ts `buildVerdict`): `likely_authentic`,
`suspicious`, `inconclusive`. Missing/malformed payloads count toward
`volume_trend.scans` and completion but never toward a verdict bucket.

## Mock → real parity notes

- Rates and trend shapes match `mockAnalytics` field-for-field; the page renders
  both interchangeably behind `USE_MOCK`.
- `mockAnalytics.volume_trend[].suspicious` is the same "suspicious verdicts per
  day" semantic the real path computes.
- `top_organizations` differs in source only: the mock uses lifetime registry
  counters, the real path computes live counts from the tables over the same
  14-day window as the trends (mock-parity of shape, real data of values).

## Scalability note

The MVP slice aggregates the last 30 days of scan rows in-process (reading
`result_payload.verdict.class` per row). At production volume, replace with a
Postgres-side aggregate (RPC/view using `date_trunc` + `count(*) filter`, or a
generated `verdict` column) so full jsonb payloads are never shipped to the API
layer just to count verdicts.

## Errors

| Condition | Response |
| --- | --- |
| Supabase not configured / any query error | `503` `ServiceUnavailableException` |
| Not authenticated | `401` (guard) |
| Not an admin | `403` (guard) |
| Rate limit | `429` (30 req/min) |
