# Session Lifecycle — Live Validation

The session lifecycle (sign-in → ledger → revoke → token death) is validated
end-to-end against a **running backend + real Supabase project** by
`backend/scripts/validate-session-lifecycle.mjs` — a zero-dependency Node
script (no ts-node, no dotenv; it parses `backend/.env.local` itself).

## What it walks

1. Creates a throwaway GoTrue user via the admin API (`email_confirm: true`).
2. Signs in **twice** with different User-Agents ("two devices") through the
   real `POST /v1/auth/sign-in`.
3. `GET /v1/security/sessions` → asserts **2 ledger rows**, the device labels
   derived from the User-Agent, and `isCurrent` marked on the requester's own
   session.
4. `DELETE /v1/security/sessions/:id` for device B.
5. Asserts the ledger drops to 1 row, **device B's access token now 401s** on
   `GET /v1/auth/me`, and device A's token still works.
6. Always deletes the throwaway user (FK cascade clears its ledger rows), so
   re-runs are safe and idempotent (leftover `sessions.e2e.*` users are purged
   first).

Contract observations (refresh-token transport mode, whether revocation kills
the access token) are printed as notes so mismatches are explicit.

## How to run

```bash
# backend must be running on PORT (default 4000):
cd backend
PORT=4000 npm run start        # or start:dev

# then, in another shell:
cd backend
node scripts/validate-session-lifecycle.mjs
```

Exits `0` only when every check passes; prints a JSON summary either way.

> **Ambient-PORT gotcha** — this workspace's shell exports `PORT=62392`
> (Freebuff's own port), which shadows `backend/.env.local`'s `PORT=4000`
> because `ConfigModule.forRoot` gives process env priority over dotenv files.
> Always pin `PORT=4000` (or `PORT=<free-port>`) explicitly when starting the
> backend here, or it will bind an arbitrary port.

## Live run — 2026-08-09

**5/11 checks passed.** Everything that does not depend on the ledger table
works against the live project:

- ✅ Throwaway user creation (GoTrue admin API)
- ✅ Sign-in ×2 with distinct devices → HTTP 200 + access tokens
- ✅ `GET /v1/security/sessions` → HTTP 200 (degraded: returns `[]`)
- ✅ Device A token valid on `GET /v1/auth/me`

The 6 failing checks are **all the same root cause**: the live Supabase
project has **not applied migration `0010_user_sessions.sql`** — the readiness
probe flags it:

```json
"userSessions": { "ready": false,
  "detail": "user_sessions table missing — apply supabase/migrations/0010_user_sessions.sql" }
```

With the table missing, the security service degrades exactly as designed:
`recordSession` skips silently (sign-in unaffected), `listSessions` returns
`[]`, and revocation is impossible (`404 Session not found.`). The "revoked
token" step was therefore **not exercised** — no mismatch was observed either
way; the access-token-after-revocation behavior is still unverified.

Observed contract behavior so far:

- Refresh token travels **via Set-Cookie only** (`AUTH_COOKIE_ENABLED` defaults
  to true) — the body `refreshToken` is stripped; the sign-in response exposes
  `session.accessToken` / `expiresAt` / `tokenType` only.
- No backend errors during the run (only the benign `REDIS_URL` inline-
  processing warning); audit events and ledger writes are best-effort.

## Unblocking the full validation

Apply the pending ledger migrations in the Supabase dashboard
(**Database → SQL editor**, run in order):

1. `supabase/migrations/0010_user_sessions.sql` — `user_sessions` +
   `user_security_settings` tables.
2. `supabase/migrations/0017_user_sessions_seed.sql` — guarded demo rows for
   the dev test account (optional; the script creates its own user).

Then re-run the script — it should reach 11/11, and the output will confirm
empirically whether revoking a GoTrue session kills the access token (the
Security page's promise) or only the refresh token (a contract mismatch to
fix).
