# Organization API Contract

The workspace Organization Management page (`/app/organization`) is served by six
endpoints. The frontend already routes all six to the backend behind the
`USE_MOCK` gate (`src/lib/api.js`); this document is the contract the backend
implements (`backend/src/organization/`) and the schema it reads
(`supabase/migrations/0005_organization.sql`).

## Endpoints

Base path: `/v1` (global NestJS prefix). All routes require a valid Supabase
bearer session (`SupabaseAuthGuard`) and are throttled at 30 req/min.

| Method | Path                          | Frontend function      | Purpose                     |
| ------ | ----------------------------- | ---------------------- | --------------------------- |
| GET    | `/organization`               | `getOrganization`      | Workspace profile + teams + members + pending invites |
| POST   | `/organization/invites`       | `inviteMember`         | Create a pending invite     |
| PATCH  | `/organization/members/:id/role` | `updateMemberRole`   | Change a member's role      |
| PATCH  | `/organization/members/:id/team` | `updateMemberTeam`   | Reassign a member's team    |
| DELETE | `/organization/members/:id`   | `removeMember`         | Remove a member             |
| DELETE | `/organization/invites/:id`   | `cancelInvite`         | Cancel a pending invite     |

`:id` is the member's **user id** (`organization_members.user_id`), which is what
the frontend passes (`member.id`).

## Request bodies

`POST /organization/invites` (validated strictly — `forbidNonWhitelisted`):

```jsonc
{ "email": "sarah.kim@provance.io", "role": "member", "team": "uuid-or-omitted" }
```

- `role`: `admin | member` (default `member`), `team`: optional team uuid
  (falls back to the organization's first team when omitted or invalid).

`PATCH /organization/members/:id/role`:

```jsonc
{ "role": "admin" }
```

`PATCH /organization/members/:id/team`:

```jsonc
{ "teamId": "uuid" }
```

## Response shapes (frontend contract)

`GET /organization` returns exactly what `mockGetOrganization` returns:

```jsonc
{
  "profile": { "id", "name", "plan", "seats", "seatsUsed", "storageUsedGb", "storageLimitGb", "scanCount", "created_at" },
  "teams": [{ "id", "name", "description" }],
  "members": [{ "id", "displayName", "email", "role", "team", "status", "last_active_at" }],
  "pendingInvites": [{ "id", "email", "role", "team", "invitedAt", "expiresAt" }]
}
```

- `members[].id` is the user id; `team` is the team id (or `null`); `status` is
  `active | invited`.
- `pendingInvites` contains only `status = 'pending'` invites, newest first.

`POST /organization/invites` → `{ "invite": { "id", "email", "role", "team", "invitedAt", "expiresAt" } }`
(the page prepends it to the local invite list).

Mutations return `{ "ok": true, ... }` — `memberId`/`role`/`teamId`/`inviteId`
echoed, matching the mock responses.

## Business rules (mirrors the mock layer)

- **All five mutations are owner/admin-only** (`403` for plain members) — this
  enforces the UI's `canManage` gating server-side, so direct API calls cannot
  escalate a member to admin or remove other members.
- Email is normalized (trim + lowercase) before duplicate checks.
- Duplicate member email, duplicate pending invite, and seat exhaustion
  (active members ≥ `organizations.seats`) are `400` rejections.
- The `owner` member cannot be removed or have role/team changed (`400`).
- Unknown member/invite/org → `404`; an unknown team on the reassignment path
  is a `400` (strict — no fallback, unlike invites).
- Supabase unavailable → `503`.

## Assumptions

- **Single organization per user.** The `organization_members` PK is
  `(organization_id, user_id)` (multi-org is schema-valid), but the service
  resolves the caller via `.maybeSingle()` on `user_id`. Multi-org support is a
  future extension, not handled today.
- **Owner designation is seeded out-of-band.** There is no create-organization
  endpoint in this slice; the `owner` member (and the org/teams rows) must be
  seeded directly. The service enforces owner protection but never designates
  one.
- **Invite acceptance lives in the auth module** (`POST /auth/invites/accept`,
  which the frontend `acceptInvite` already targets); the `organization_invites.token`
  created here is the credential that flow validates.

## Schema (supabase/migrations/0005_organization.sql)

| Table | Notes |
| ----- | ----- |
| `organizations` | `plan`, `seats`, `storage_limit_gb`, `storage_used_gb`, `scan_count` (counter maintained by the worker), `slug` (unique) |
| `teams` | scoped to an organization, `on delete cascade` |
| `organization_members` | join table, PK `(organization_id, user_id)`, `role` in `owner/admin/member`, `team_id` set null on team delete, `status` in `active/invited` |
| `organization_invites` | `email`, `role` in `admin/member`, `token` (unique, `gen_random_uuid()`), `status` in `pending/accepted/cancelled/expired`, `expires_at` defaults to +7 days |

RLS is enabled on all four tables. Read policies let any member view their own
org/teams/members/invites (for direct Supabase access); **writes are
backend-only** (the service uses the service-role admin client, which bypasses
RLS) — no direct insert/update/delete policies exist.

### Why migration 0005 and not 0002

`0002_scans.sql` is scans-only and is already applied to the remote Supabase
project, so editing it would create migration drift. The org schema ships as a
new, append-only migration (`0005_organization.sql`).

## Mock-to-real mapping

| Mock (`src/lib/mockApi.js` / `mockData.js`) | Real |
| ------------------------------------------- | ---- |
| `mockOrgWorkspace.profile` (readable ids `org_001`, `usr_001`, `team_legal`) | `organizations` + `organization_members`/`profiles` (uuid ids) |
| `mockOrgWorkspace.members[].last_active_at` | `organization_members.updated_at` |
| `mockOrgWorkspace.pendingInvites` | `organization_invites` where `status = 'pending'` |
| `mockInviteMember` fallback-to-first-team | `resolveTeam` fallback-to-first-team |
| `mockOrgTeams` | `teams` rows |

## Deployment

1. Apply the migration: `supabase db push` (or apply `0005_organization.sql`).
2. No new environment variables are required (table names are configurable via
   `SUPABASE_*_TABLE` with defaults, following the reports module pattern).
3. Frontend keeps `USE_MOCK = true` until the backend is reachable; flipping it
   activates these routes with zero frontend changes.
