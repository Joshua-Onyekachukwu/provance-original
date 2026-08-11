# Auth Hardening — httpOnly Cookie Session Migration

Status: **In progress — migration shipped, regression coverage complete** (backend cookie flow shipped 2026-08-04; frontend migration shipped 2026-08-06; controller-layer gate + HTTP-layer e2e landed 2026-08-11)

## Purpose

Move the Provance session flow from **localStorage-persisted tokens** to the industry-standard
**httpOnly cookie refresh + in-memory access token** model, so the refresh credential can never
be exfiltrated by XSS, and every refresh rotates the session server-side.

## Current state (pre-migration)

- `src/context/AuthContext.jsx` persists the **entire session** — `accessToken`, `refreshToken`,
  `expiresAt` — to `localStorage` under `provance.auth.session.v1`.
- The backend returns both tokens in the response body of `POST /auth/sign-in` and `POST /auth/refresh`.
- Any XSS in the app can read `localStorage` and steal a long-lived refresh token (valid for the
  `AUTH_COOKIE_MAX_AGE_DAYS` window), which enables account takeover with no re-auth.

## Target state (post-migration)

| Credential | Storage | Notes |
|---|---|---|
| Refresh token | **httpOnly cookie only** (`provance_refresh`, or `__Host-provance_refresh` on secure deployments) | Never in JS or localStorage; sent automatically with `credentials: 'include'` |
| Access token | **JS memory only** (module store + AuthContext state) | Survives nothing — rebuilt on boot via a silent cookie refresh |

### Session lifecycle

- **Sign-in** — `POST /auth/sign-in` validates against Supabase, returns `{ user, permissions, profile, session: { accessToken, expiresAt, tokenType } }` (refresh token stripped from the body when cookies are enabled) and sets the httpOnly refresh cookie.
- **Refresh / rotation** — every `POST /auth/refresh` mints a **fresh** refresh token (Supabase invalidates the previous one), updates the cookie, and returns a new access token. The old token cannot be replayed.
- **Boot (real mode)** — nothing is persisted, so on page load `ensureSession()` posts an empty-body refresh; the cookie carries the rotation, the new access token is cached in memory, then `GET /auth/me` rebuilds viewer state.
- **401 handling** — `request()` retries once after a forced cookie refresh; if the cookie is gone/expired the session is dropped and protected routes redirect to `/signin`.
- **Sign-out** — `POST /auth/sign-out` burns the refresh token server-side (rotation consumes it) and clears the cookie; the frontend drops the in-memory token immediately.
- **Mock mode** (`USE_MOCK = true`) — intentionally unchanged: the whole session stays in `localStorage` so dev demos survive reloads. The two paths are cleanly split in `api.js` (`refreshMockSession` vs `refreshRealSession`) and `AuthContext.jsx`.

## What shipped when

### 2026-08-04 — Backend cookie flow (kickoff slice, already live)

- `backend/src/auth/cookie-session.util.ts` — `buildCookieSessionOptions`, `readRefreshCookie`,
  `setRefreshCookie`, `clearRefreshCookie` with `HttpOnly`, `SameSite`, `Secure`, `Path=/`, `Max-Age`.
- `backend/src/auth/auth.controller.ts` — sets the refresh cookie on sign-in, rotates it on refresh,
  burns + clears on sign-out, and strips the refresh token from response bodies (`stripRefreshTokenFromBody`).
- `backend/src/config/env.validation.ts` — `AUTH_COOKIE_ENABLED`, `AUTH_COOKIE_SAME_SITE`,
  `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_MAX_AGE_DAYS` validated.
- `backend/src/main.ts` — CORS `credentials: true` (required for cookie transmission).

### 2026-08-06 — Frontend migration + __Host- hardening (this slice)

- `src/lib/api.js` — new in-memory access-token store (`setMemorySession` / `getMemorySession` /
  `clearMemorySession`), `refreshRealSession` (empty-body refresh; cookie carries the token), and an
  exported `ensureSession()` boot seam. The mock localStorage path is unchanged.
- `src/context/AuthContext.jsx` — real mode boots via silent cookie refresh (`ensureSession` →
  `getCurrentViewer` with the memory session as fallback), persists nothing to `localStorage`,
  and clears memory on sign-out/expiry. Mock mode keeps the localStorage session.
- `backend/src/auth/cookie-session.util.ts` — **`__Host-` cookie prefix**: secure deployments
  (`AUTH_COOKIE_SECURE=true`, or `SameSite=None`) now set `__Host-provance_refresh` (browser-enforced
  origin binding: Secure + `Path=/` + no Domain). Local HTTP dev keeps the plain name because
  browsers reject `__Host-` cookies on insecure origins.

### 2026-08-11 — Regression coverage (three layers; the controller spec is the gate)

- `backend/src/auth/auth.controller.spec.ts` — **11 controller-layer tests — THE GATE.** Direct
  `AuthController` instantiation with a mocked `AuthService` locks the controller's cookie contract
  in isolation: sign-in sets the httpOnly cookie and strips the body refresh token; refresh reads
  the cookie and rotates it (forwarding `'cookie'` as the token source); body-token fallback when no
  cookie is present (`'body'` source); sign-out expires **both** cookie names (plain + `__Host-`); and
  failed sign-in/refresh never set or rotate a cookie. This is the fast, focused net every change to
  `auth.controller.ts` / `cookie-session.util.ts` must keep green.
- `backend/test/auth.e2e-spec.ts` — **7 HTTP-layer tests** through the real module graph (real
  `AuthService`, real guards/pipes/filters) with a mocked Supabase service (rotation-aware public
  client + stateful admin client): sign-in → `Set-Cookie` flags → refresh-with-cookie rotation →
  replay of the rotated-out cookie 401s with the `refresh_token_rejected` theft audit → body-token
  promotion → no-credential 401 → sign-out clearing both cookie names and burning the token.
- `backend/src/auth/cookie-session.util.spec.ts` — util-layer tests for serialization / reading /
  clearing, including the `__Host-` vs plain name selection.

**Reuse-detection is shipped and asserted:** a replayed rotated token is rejected with an audit row
(`refresh_token_rejected`, severity `high`, `reuse_suspected`, `token_source: 'cookie' | 'body'` —
see `auth.service.ts` `recordRejectedRefresh`), and the e2e replay test asserts it end to end.

## Deploy order

1. **Backend cookie flow** (already deployed) — nothing more to do for the API.
2. **Frontend migration** (this slice) — deploy after the backend is live. Existing users with a
   cookie already present transition seamlessly; users without one re-sign-in once (their stale
   localStorage session is ignored by the real path).
3. **Enable `AUTH_COOKIE_SECURE=true` in production** — activates the `__Host-` name. Cookie name
   change orphans the old plain-name cookie, so all users re-sign-in once (documented, acceptable).

## Environment matrix

| Var | Local dev | Production | Notes |
|---|---|---|---|
| `AUTH_COOKIE_ENABLED` | `true` | `true` | Set `false` only as a temporary body-token fallback |
| `AUTH_COOKIE_SAME_SITE` | `lax` | `none` | The Vercel → Fly deployment is **cross-site**, so `lax` would suppress the cookie on API fetches; `none` forces `Secure` (and the `__Host-` name). `lax` is correct only for a same-origin topology |
| `AUTH_COOKIE_SECURE` | `false` | `true` | Enables the `__Host-` cookie name in production |
| `AUTH_COOKIE_MAX_AGE_DAYS` | `30` | `30` | Refresh-token lifetime / rotation window |

## Rollback

- **Frontend**: revert the `AuthContext.jsx` + `api.js` commit. The app returns to the localStorage
  session flow and works with either cookie mode.
- **Backend**: set `AUTH_COOKIE_ENABLED=false` to stop setting cookies and return the refresh token
  in the body again (the pre-2026-08-04 behavior). The migrated frontend requires the cookie, so a
  backend-only rollback must be paired with the frontend revert.
- No data migration is required — sessions are stateless credentials, not stored rows.

## Security posture

- **Refresh token** — XSS-safe (httpOnly), rotated on every refresh, burned on sign-out. Supabase
  server-side rotation invalidates replayed tokens.
- **Access token** — short-lived (Supabase default ~1h), held in memory only, so it survives only
  until the page is closed/reloaded; the cookie refresh rebuilds it. While in memory it is still
  readable by XSS, which is the accepted standard trade-off (no credential that grants long-lived
  access is ever JS-accessible).
- **CSRF** — sign-in/refresh/sign-out are `POST`. In the cross-site production topology
  (`SameSite=None`), the **JSON `Content-Type` requirement acts as the CSRF guard**: an attacker's
  cross-site form/JS POST cannot set `application/json` or the `Authorization` header without
  tripping a CORS preflight, which the origin allowlist rejects. Keep the DTOs strict
  (`forbidNonWhitelisted`) and the CORS origin list tight; a dedicated CSRF token is only required
  if a non-JSON cross-site consumer is ever added.
- **`__Host-` prefix** — prevents cookie injection from subdomains and other origins on secure
  deployments.

## Related files

- Backend: `backend/src/auth/auth.service.ts`, `auth.controller.ts`, `cookie-session.util.ts`,
  `cookie-session.util.spec.ts`, `auth.controller.spec.ts` (**gate**), `backend/test/auth.e2e-spec.ts`,
  `backend/src/config/env.validation.ts`, `backend/src/main.ts`
- Frontend: `src/lib/api.js`, `src/context/AuthContext.jsx`
- Reference: `docs/engineering/DEPLOYMENT_AND_AUTH_STRATEGY.md`, `docs/engineering/ADMIN_ACCESS_AND_OPERATIONS.md`

## Open items

- ~~Refresh-token **reuse detection alerting**~~ — **shipped 2026-08-11**: a replayed rotated token is
  rejected and written to the admin trail as `refresh_token_rejected` (high severity,
  `reuse_suspected`, token source); asserted by `auth.e2e-spec.ts`. Remaining nicety: a real
  transactional alert (email/Slack) when `reuse_suspected` is true.
- CSRF token for any future cross-site (SameSite=None) deployment.
- Session-revocation UI already surfaces real sessions via `GET /security/sessions`; cookie rotation
  means the backend `signOut` path must also be called from that surface.
