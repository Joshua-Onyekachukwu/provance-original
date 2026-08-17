# Organization API Contract

The workspace Organization Management page (`/app/organization`) is served by
nine endpoints. The frontend already routes all nine to the backend behind the
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
| GET    | `/organization/members/:id/sessions` | `getMemberSessions` | List a member's active sessions (team-tagged) |
| DELETE | `/organization/members/:id/sessions` | `revokeMemberSessions` | Revoke all of a member's sessions except the actor's current one |
| DELETE | `/organization/members/:id/sessions/:sessionId` | `revokeMemberSession` | Revoke one of a member's sessions |

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

`POST /organization/invites` → `{ "invite": { "id", "email", "role", "team", "invitedAt", "expiresAt" }, "token": "<raw>", "inviteLink": "/accept-invite?token=<raw>" }`
(the page prepends the invite to the local list, then copies the absolute
invite link — built from `token` — to the clipboard for the invitee).

**Token hardening (migration 0015):** only the SHA-256 hex of `token` is
persisted (`organization_invites.token_hash`); the raw token exists solely in
this one-time response and the share/email link built from it, so a leaked
invites table never exposes usable acceptance tokens. `POST /auth/invites/accept`
hashes the submitted token and matches `token_hash`.

Mutations return `{ "ok": true, ... }` — `memberId`/`role`/`teamId`/`inviteId`
echoed, matching the mock responses.

`GET /organization/members/:id/sessions` →

```jsonc
{
  "memberId": "<user id>",
  "teamId": "<team id or null>",
  "sessions": [{
    "id", "device", "location", "ipAddress", "lastActiveAt",
    "isCurrent": false,   // true only for the actor's own session (sid match)
    "teamId": "<team id or null>"
  }]
}
```

`DELETE /organization/members/:id/sessions` → `{ "ok": true, "memberId", "revoked": <count> }`;
`DELETE /organization/members/:id/sessions/:sessionId` → `{ "ok": true, "memberId", "sessionId" }`.

## Business rules (mirrors the mock layer)

- **All mutations are owner/admin-only** (`403` for plain members) — this
  enforces the UI's `canManage` gating server-side, so direct API calls cannot
  escalate a member to admin or remove other members.
- **Member sessions are owner/admin-only too.** The three session endpoints
  reuse the same `assertCanManage` gate. The `owner` seat is protected like
  every other owner mutation (`400` — the owner manages their own sessions via
  `/v1/security/sessions`). An admin revoking their own session still cannot
  kill the current one (`400`). Revoke-all runs sequentially and reports the
  count of GoTrue revocations that actually succeeded; a single failure never
  strands the rest of the batch.
- **Session ledger lives in the security module.** The rows come from
  `user_sessions` (migration 0010) via `SecurityService.listSessions`/
  `revokeSessionForUser` (the same GoTrue-admin revocation the Security page
  uses), and the team tag is the membership's `team_id` — no separate ledger
  exists in the org module.
- Email is normalized (trim + lowercase) before duplicate checks.
- Duplicate member email, duplicate pending invite, and seat exhaustion
  (active members ≥ `organizations.seats`) are `400` rejections.
- The `owner` member cannot be removed or have role/team changed (`400`).
- Unknown member/invite/org → `404`; an unknown team on the reassignment path
  is a `400` (strict — no fallback, unlike invites).
- Supabase unavailable → `503`.

## Live e2e coverage

`backend/test/invite-accept.e2e-spec.ts` exercises the real accept round trip
against a live Supabase project (seeded org + pending invite + seats →
`POST /v1/auth/invites/accept` → membership row + accepted invite):

- **Skipped when Supabase credentials are absent** (`SUPABASE_URL` /
  `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — loaded from
  `backend/.env.local` or `.env`), so CI and mock-only environments stay green.
- Requires the org tables (migration 0005) applied to the target project — the
  seed fails with an actionable hint if they're missing from the schema cache.
- Cleans up after itself (auth user + org, cascading members/invites).

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
  which the frontend `acceptInvite` already targets); the raw token issued by
  `inviteMember` is the credential that flow validates — matched by its
  `token_hash` (migration 0015), never stored in the clear.

## Schema (supabase/migrations/0005_organization.sql)

| Table | Notes |
| ----- | ----- |
| `organizations` | `plan`, `seats`, `storage_limit_gb`, `storage_used_gb`, `scan_count` (counter maintained by the worker), `slug` (unique) |
| `teams` | scoped to an organization, `on delete cascade` |
| `organization_members` | join table, PK `(organization_id, user_id)`, `role` in `owner/admin/member`, `team_id` set null on team delete, `status` in `active/invited` |
| `organization_invites` | `email`, `role` in `admin/member`, `token_hash` (sha256 hex of the raw token; `token` column deprecated + backfilled by migration 0015, dropped in a follow-up), `status` in `pending/accepted/cancelled/expired`, `expires_at` defaults to +7 days |

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
| `mockMemberSessionsByUserId` (per-member ledger, `teamId` on every row) | `user_sessions` rows for the member, tagged with `organization_members.team_id` |
| `mockGetMemberSessions` actor-derived `isCurrent` | `SecurityService.listSessions` `sid` match |
| `mockRevokeMemberSession` / `mockRevokeMemberSessions` (owner + current-session guards, module-store persistence) | `DELETE /v1/organization/members/:id/sessions(/:sessionId)` via GoTrue admin API |

## Deployment

1. Apply the migration: `supabase db push` (or apply `0005_organization.sql`).
2. No new environment variables are required (table names are configurable via
   `SUPABASE_*_TABLE` with defaults, following the reports module pattern).
3. Frontend keeps `USE_MOCK = true` until the backend is reachable; flipping it
   activates these routes with zero frontend changes.
