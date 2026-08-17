# Account Activity — API Contract

`GET /v1/account/activity` — the authenticated user's workspace activity feed
(backing the Activity Log page at `/app/activity`).

## Endpoint

| | |
|---|---|
| **Route** | `GET /v1/account/activity` |
| **Auth** | `SupabaseAuthGuard` (Bearer access token) |
| **Throttle** | 30 req/min |
| **Query params** | `category`, `page`, `pageSize` (all optional) |

## Query params

| Param | Default | Values | Notes |
|---|---|---|---|
| `category` | `all` | `all` \| `scans` \| `exports` \| `account` \| `team` \| `system` | Mirrors the Activity page tabs (`src/pages/app/AppActivityPage.jsx` `CATEGORIES`). Unknown values fall back to `all`. |
| `page` | `1` | int ≥ 1 | Clamped to ≥ 1. |
| `pageSize` | `20` | int 1–200 | Clamped to 1–200. |

### Category semantics

| Category | Match |
|---|---|
| `all` | No action filter — audit events **+ resolved incidents** |
| `scans` | `action` `LIKE 'scan.%'` |
| `exports` | `action` `LIKE 'report.%'` |
| `account` | `user.invited`, `user.activated`, `settings.updated`, `api_key.created`, `api_key.revoked`, `invite.accepted`, `invite_created` |
| `team` | `team.member_added`, `team.member_removed`, `role.changed`, `org.created` |
| `system` | `waitlist.reviewed`, `waitlist_reviewed`, `waitlist.approved`, `waitlist.rejected`, `waitlist.deferred`, `feature_flag.toggled`, `incident.resolved` — **+ resolved incidents** |

These lists intentionally mirror the frontend's client-side tab filters so mock
and real modes behave identically. The backend services write the underscore
forms (`waitlist_reviewed`, `invite_created`) into `auth_audit_events` while the
mock uses the dotted forms; both are accepted here and on the Activity page so
events badge and count identically across modes.

### Incident events

Resolved rows from `admin_incidents` (`supabase/migrations/0007_incidents.sql`)
join the feed as `incident.resolved` system events for the `all` and `system`
categories only — incidents are system-wide (no owner), and those are the two
tabs where the mock surfaces them. Each maps to the exact mock shape
(`buildIncidentActivityEvents`), carrying the incident's own `severity`
(critical/major/minor → the Monitoring accordion tone dots) and the
`summary` post-mortem text. The incidents query is best-effort: if migration
0007 is not applied (`admin_incidents` missing), the feed degrades to the
audit trail alone instead of failing.

The combined feed is sorted newest-first by `created_at` and paginated in
memory (mirroring `mockGetActivityLogs`), so real and mock pages line up
exactly — including across the audit/incident boundary.

## Response shape

```jsonc
{
  "data": [
    {
      "id": "uuid",
      "actor_email": "founder@provance.ai",
      "action": "scan.completed",
      "severity": "low",            // derived via shared audit-severity map
      "resource_type": "scan",      // entity_type column
      "resource_id": "scan_abc",    // entity_id column
      "created_at": "2026-08-04T10:00:00Z"
    },
    // incident.resolved rows carry the incident's own severity + post-mortem
    {
      "id": "incident_inc_001",
      "actor_email": "system",
      "action": "incident.resolved",
      "severity": "major",          // from admin_incidents.severity
      "resource_type": "incident",
      "resource_id": "inc_001",
      "created_at": "2026-08-07T08:00:00Z",
      "summary": "A memory leak in the fingerprint model worker stalled processing."
    }
  ],
  "page": 1,
  "pageSize": 100,
  "total": 142,
  "totalPages": 2
}
```

This is the exact envelope of `mockGetActivityLogs` in `src/lib/mockApi.js`
(`{ data, page, pageSize, total, totalPages }`), so the frontend swaps mock ↔
real without changes.

## Source table & scoping

- **Table**: `auth_audit_events` (configurable via `SUPABASE_AUDIT_EVENTS_TABLE`,
  default `auth_audit_events`).
- **Scoping**: the table has **no `user_id` column** — only `actor_email`. Events
  are matched with `actor_email = user.email` (trimmed, lowercased). A user with
  no email on their JWT gets `400 Bad Request` (`An account email is required to
  load activity.`).
- **Query**: service-role admin client (RLS bypassed) via `SupabaseService.getAdminClient()`.
- **Ordering**: `created_at DESC`.
- The same `applyCategory` filter is applied to **both** the data query and the
  exact-count query so `total`/`totalPages` always match the filtered set.

## Severity mapping

`severity` is derived from `action` via the shared
`backend/src/common/audit-severity.ts` map — the same map the admin Audit Logs
endpoint uses, so both surfaces badge events identically. Unknown actions default
to `low`.

## Frontend callers

- `src/lib/api.js` — `getActivityLogs(params)` serializes `category`/`page`/`pageSize`
  into the query string on the real path; mock path unchanged.
- `src/pages/app/AppActivityPage.jsx` — fetches `{ pageSize: 100 }` and filters
  client-side (tabs/search); the pagination envelope is available for future
  server-side paging.
- `src/pages/app/AppDashboardPage.jsx` — `getActivityLogs({ pageSize: 50 })` for
  the dashboard activity feed.

## Notes

- The frontend currently passes only `pageSize` and filters by category locally,
  so real-mode behavior is identical to mock today. Passing `category` is
  supported for future server-side filtering.
- `auth_audit_events` is written by backend services (auth, admin, scans) as they
  act; the frontend never writes to it.
