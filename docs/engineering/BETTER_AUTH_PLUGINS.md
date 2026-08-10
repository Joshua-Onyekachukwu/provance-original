# Better Auth Plugins — Evaluation & Replacement Map

> Provider decision (GoTrue vs Better Auth, migration cost, founder gate):
> see [`AUTH_PROVIDER_DECISION.md`](./AUTH_PROVIDER_DECISION.md).

**Status:** Enabled (behind the `USE_BETTER_AUTH` + `DATABASE_URL` gate) · **Versions:** `better-auth@1.6.26`, `@better-auth/api-key@1.6.26`
**Config:** `backend/src/auth/better-auth.config.ts` · **Schema:** `supabase/migrations/0018_better_auth.sql`

Better Auth runs as a **parallel auth provider** mounted as a NestJS controller
at `/v1/better-auth/*` (catch-all → `toNodeHandler`; health at
`/v1/better-auth/ok`) alongside the live Supabase GoTrue flow at `/v1/auth/*`.
The whole surface is behind the `USE_BETTER_AUTH` flag (default **OFF**) — with
the flag off, `/v1/better-auth/ok` reports exactly which gate is missing and
every other route 404s, leaving the GoTrue flow untouched. The three plugins
below map directly onto Provance surfaces. Like `emailAndPassword`, they are
**not registered at all until `USE_BETTER_AUTH` is truthy AND `DATABASE_URL` is
set** — each adds tables, and none should serve routes while the provider is
stateless. Once the env vars land (see `USE_BETTER_AUTH=` and `DATABASE_URL=`
in `backend/.env.local`), apply `0018_better_auth.sql`, restart, and the plugin
endpoints light up.

## The mapping at a glance

| Plugin | Provance surface | Replaces (custom code) |
| --- | --- | --- |
| `twoFactor()` | Security Settings 2FA panel (`/app/security`) | Mock-only toggle — no backend 2FA exists today |
| `organization()` | Organization page (`/app/organization`), team scoping, invite flow | `src/organization/*` module, migration `0005`, the six org mock/API functions |
| `apiKey()` (`@better-auth/api-key`) | API Keys page (`/app/api-keys`) | Mock layer only — **no backend module exists today** |

---

## 1. twoFactor — Security Settings

**Surface:** `AppSecurityPage` renders a single 2FA toggle today. It calls
`mockUpdateSecuritySettings` → sets `mockSecuritySettings.signInControls.twoFactorAuth.enabled`,
and the UI labels it *"Preview action — not wired to a real 2FA provider yet."*
The backend security module covers **sessions only** — there is no 2FA backend
to migrate. The plugin is therefore the *first real 2FA provider* for this
surface.

**What the plugin provides** (all under `/v1/better-auth/two-factor/*`):
- `enable` / `disable` (password re-auth required) → the page's toggle
- TOTP via authenticator apps (`get-totp-uri`, `verify-totp`) with 30s codes
  and ±1-window tolerance; QR flow via `totpURI`
- `generate-backup-codes` / `verify-backup-code` (one-time use, auto-removed)
- Trusted devices (30-day trust window, refreshed on sign-in)
- Account lockout after repeated failed verifications (`429 ACCOUNT_TEMPORARILY_LOCKED`)

**Schema delta:** `user.twoFactorEnabled` (boolean) + `twoFactor` table
(`secret`, `backupCodes`, `verified`, `failedVerificationCount`, `lockedUntil`).

**Config:** `twoFactor({ issuer: 'Provance' })` — issuer shown in authenticator
apps. Defaults kept: verification required on enable, lockout enabled.

**What stays custom:** nothing server-side. The Security page needs the
better-auth **client** (`twoFactorClient`) to drive the flow, plus an OTP
`sendOTP` hook if email OTP is wanted (TOTP needs no delivery). The OTP variant
is deliberately left off until the email integration lands.

---

## 2. organization — Organization page & team scoping

**Surface:** `AppOrganizationPage` (roster, roles, invite flow, workspace
profile) plus team-scoped filters across the workspace ledger/queue/reports.

**What it replaces:**
- Backend: the entire `src/organization/*` module (`getOrganization`,
  `inviteMember`, `updateMemberRole`, `updateMemberTeam`, `removeMember`,
  `cancelInvite`), migration `0005` tables, and the `POST /auth/invites/accept`
  flow. Member roles are `owner | admin | member` — **identical to the plugin's
  default roles**, so no role remap is needed.
- Mock: `mockGetOrganization`, `mockInviteMember`, `mockUpdateMemberRole`,
  `mockUpdateMemberTeam`, `mockRemoveMember`, `mockCancelInvite`
  (`src/lib/mockApi.js`) and their `api.js` real-path branches.

**What the plugin provides** (under `/v1/better-auth/organization/*`,
`/v1/better-auth/invitation/*`, `/v1/better-auth/team/*`):
- Organizations with `name`/`slug`/`logo`/`metadata`; creator becomes **owner**
- Members with roles; member CRUD + role/team reassignment
- Invitations (status lifecycle `pending → accepted/rejected/canceled`,
  `expiresAt`, `inviterId`, per-invite `teamId`)
- **Teams ship in this version** — `team` + `teamMember` tables and endpoints,
  which is the natural home for Provance's `team_legal`/`team_product`/… scoping
- Custom roles + permission maps via the `role` table (permissions are
  JSON maps like `{ "scan": ["create", "read"] }` — the same shape as
  `API_KEY_SCOPES`)

**Schema delta:** `organization`, `member`, `invitation`, `team`, `teamMember`,
`role`.

**Config:** `organization()` — defaults used; the default `creatorRole: owner`
and `owner/admin/member` role set match Provance exactly.

**What stays custom (for now):**
- Org **seat limits** and invite **token hashing** (migration `0015`): the
  plugin stores plaintext invitations and has no seat concept. Keep the org
  module's seat/duplicate guards until the accept flow is migrated, or layer
  them as hooks/checks on the plugin endpoints.
- The admin-side org surfaces (`/app/admin/organizations`) and the frontend
  team-filter plumbing (mock-backed) — they swap when the client wiring lands.

---

## 3. apiKey — API Keys page

**Finding:** the API Key plugin was **extracted to its own package in
Better Auth 1.5** — it is *not* shipped inside `better-auth@1.6.26`
(only OpenAPI-generator references remain in the core package). It is enabled
from `@better-auth/api-key` (installed at `1.6.26`, version-matched).

**Surface:** `AppApiKeysPage` — token list with usage/status, create with
reveal-once preview, revoke, regenerate, scopes, and per-workspace limits.

**What it replaces:** the entire mock layer — `mockGetApiKeys`,
`mockCreateApiKey`, `mockRevokeApiKey`, `mockRegenerateApiKey` plus
`mockApiKeys`, `mockApiKeyLimits`, `API_KEY_SCOPES` (`src/lib/mockData.js`) and
the `api.js` `/api-keys` branches. **There is no backend api-keys module
today** — this plugin *is* the first real backend for that page.

**What the plugin provides** (under `/v1/better-auth/api-key/*`):
- `create` returns the **full key exactly once** (hashed in `key`, `start`
  holds the prefix preview) → maps 1:1 to the page's reveal-once preview
- `list` / `update` (enable/disable, rename, expire) / `delete`
- Per-key **scopes** (`permissions: { "scan": ["create", "read"] }`) — the
  `API_KEY_SCOPES` vocabulary carries over
- Per-key **limits**: `remaining` with `refillInterval`/`refillAmount`
  (rate-style quota) and `rateLimitEnabled`/`rateLimitTimeWindow`/`rateLimitMax`
  (fixed-window throttling) — both mock `mockApiKeyLimits` concepts
- Expiry (`expiresIn`), prefix, and `metadata`

**Schema delta:** single `apiKey` table (id, configId, name, start, prefix,
key, referenceId, refill/rate-limit columns, enabled, requestCount, remaining,
lastRequest, expiresAt, metadata, permissions). `referenceId` is the owning
`userId` under `references: 'user'` (polymorphic — the plugin also supports
`references: 'organization'` for org-scoped keys, matching the org plugin).

**Config:** `apiKey({ references: 'user' })`.

**What stays custom:** the `keysPerWorkspace` cap is a page-level limit in the
mock; the plugin has no workspace-seat concept, so that check stays frontend
(or moves to a wrapper) — same category as the org seat limit.

---

## Cross-cutting notes

- **Admin plugin** (`better-auth/plugins` → `admin`) exists but was **not**
  enabled — the admin surfaces (`/app/admin/*`, `AdminGuard`, admin roles
  module) are out of scope for this slice and can be evaluated separately.
- **Session surface:** better-auth owns its own `session` table; the existing
  `GET/DELETE /v1/security/sessions` module (`user_sessions`, migration `0010`)
  stays live for the GoTrue path and can later read better-auth sessions when
  the provider swap happens.
- **Reconciliation:** the `0011` SQL was written from the installed packages'
  field definitions (verified above). Once `DATABASE_URL` is set, run
  `npx @better-auth/cli generate --config src/auth/better-auth.config.ts` and
  diff against `0011` — the CLI is the source of truth.
- **Gate:** all three plugins sit in the `pool ? [...] : []` branch, so the
  stateless-dev contract (no misleading sessions/tables) is preserved until the
  connection string activates the provider.

## Rollout order

1. Set `USE_BETTER_AUTH=true` and paste `DATABASE_URL` in `backend/.env.local`
   (connection string from the Supabase dashboard).
2. Apply `supabase/migrations/0018_better_auth.sql` (dashboard SQL editor, or
   `npx @better-auth/cli migrate --config src/auth/better-auth.config.ts`).
3. Restart the backend — `/v1/better-auth/sign-up/email`, `/sign-in/email`,
   `/organization/*`, `/two-factor/*`, `/api-key/*` all register;
   `/v1/better-auth/ok` reports `ok: true`.
4. Verify with the live walk (sign-up → sign-in → org create → invite → api-key
   create).

## Backend mount (shipped — Option A)

The provider is a flag-gated NestJS controller (`BetterAuthController` in
`BetterAuthModule`), not a raw `app.use` in `main.ts`, so its routes flow
through the same pipeline as the rest of the API:

- `USE_BETTER_AUTH` (default OFF) + `DATABASE_URL` gate the provider in
  `better-auth.config.ts` — stateless (no routes) when either is missing, with
  a console warning naming the missing gate.
- `@Controller('better-auth')` + `@All('*')` catch-all delegates to
  `toNodeHandler(auth)`; Nest's body parser runs first, and better-call's node
  adapter explicitly falls back to the pre-parsed `req.body`, so JSON bodies
  arrive intact. `@Get('ok')` answers unconditionally with the gate state.
- The frontend client (`src/lib/betterAuthClient.js`) points its `basePath` at
  `/v1/better-auth` to match.
- `better-auth-status.ts` keeps the gate logic free of the ESM package so it is
  unit-testable under the backend jest (CJS) runner.

## Frontend wiring (shipped)

`USE_BETTER_AUTH` (in `src/lib/api.js`, driven by `VITE_USE_BETTER_AUTH=true`)
routes **AuthContext + the sign-in and security pages** through the better-auth
client (`src/lib/betterAuthClient.js`, `createAuthClient` at
`VITE_BETTER_AUTH_URL`, default `http://localhost:4000`) ahead of the mock and
GoTrue paths:

- **AuthContext** — hydration branch: `getSession()` is the session check (no
  GoTrue refresh dance); sign-in/sign-out flow through the same api.js
  functions, which branch internally.
- **Sign-in** — `signInWithPassword` → `client.signIn.email`; the adapter
  re-shapes `{ user, session }` into the `buildAuthResponse` contract
  `normalizeAuthState` consumes (synthesized `accessToken` from the session
  token, `expiresAt` ms, admin permission from the `ADMIN_EMAILS` mirror).
- **Security page** — `getSecuritySettings` synthesizes the mock shape from
  `listSessions()` + `user.twoFactorEnabled` (real device rows, `isCurrent`
  from the live session); `changePassword` → `client.changePassword` with
  `revokeOtherSessions`; `revokeSession` → `client.revokeSession`;
  `updateSecuritySetting` persists the mock-only toggles locally and **fails
  loudly for the 2FA toggle** — the plugin requires the password + TOTP
  enrollment flow, which needs `twoFactorClient` UI (next slice).
- Password-reset endpoints map to `forgetPassword`/`resetPassword`
  (best-effort until the backend configures `sendResetPassword`).

Still on mock/GoTrue: `acceptInvite` (better-auth invitations use an
`invitationId`, the page passes a token) and the organization/api-key surfaces
(`organizationClient` / api-key client are the next wiring slice).
