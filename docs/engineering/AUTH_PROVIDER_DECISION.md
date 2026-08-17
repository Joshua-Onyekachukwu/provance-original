# Auth Provider Decision — GoTrue (Supabase) vs Better Auth

**Date:** 2026-08-09 · **Status:** Decision needed (founder gate below)
**Spike evidence:** `docs/engineering/BETTER_AUTH_PLUGINS.md`, `supabase/migrations/0018_better_auth.sql`, `backend/src/auth/better-auth.config.ts`, backend `USE_BETTER_AUTH` flag + `BetterAuthController` (`/v1/better-auth/*`), frontend `USE_BETTER_AUTH` flag (`src/lib/api.js` + `src/lib/betterAuthClient.js`)

---

## TL;DR

Both providers are **live in the codebase today** as a parallel spike: the
GoTrue flow (`/v1/auth/*`, SupabaseAuthGuard) is untouched and working, and a
Better Auth provider (`/api/auth`, email/password + twoFactor/organization/
apiKey plugins) is enabled behind the `DATABASE_URL` gate with a frontend flag
that already routes AuthContext + the sign-in/security pages.

The scored comparison below lands **GoTrue slightly ahead on the numbers** —
it is managed, has 30+ dashboard-configured OAuth providers, and needs zero
migration. **But the decisive, time-sensitive factor is the user base: it is
effectively zero today** (dev accounts, seeded profiles, waitlist). Every
roadmap feature we want (real 2FA, org teams, API keys, passkeys) is either
custom-built on GoTrue or still mock-only, while Better Auth ships all of them
as first-party plugins. **Recommendation: migrate to Better Auth now, behind
the existing flag, accepting a forced password reset while it costs ~nothing —
then retire the GoTrue path.** If the near-term roadmap instead needs 30+
managed social logins or phone/SMS auth, GoTrue is the defensible answer.

---

## 1. What exists today (what the spike proved)

**GoTrue path (production-adjacent, working):**
- NestJS auth module: `signInWithPassword`, refresh-token rotation, `signOut` via `supabase-js`; httpOnly-cookie refresh flow; `SupabaseAuthGuard` across the API.
- `user_sessions` table (migration `0010`) + security module (`GET/DELETE /v1/security/sessions`).
- RLS on tables keyed off `auth.uid()` JWT claims (scans, profiles, …); client-side `supabase` client used only for **Storage uploads** (signed URLs — auth-agnostic).
- **Custom-built on GoTrue that Better Auth now covers first-party:** the org module (migration `0005` + six endpoints), admin roles (`0016`), API keys (mock-only), 2FA (mock-only toggle — GoTrue's native TOTP MFA exists but is unused).

**Better Auth path (spike, gated, Option A shipped):**
- Mounted as a **NestJS controller** at `/v1/better-auth/*` (`BetterAuthController` catch-all → `toNodeHandler`; health at `/v1/better-auth/ok`), behind the **`USE_BETTER_AUTH` flag** (default OFF) — `emailAndPassword` + the three plugins register only when the flag is truthy **and** `DATABASE_URL` is set (stateless-safe otherwise; GoTrue at `/v1/auth/*` untouched).
- Migration `0018_better_auth.sql`: core (`user`, `session`, `account`, `verification`) + plugin tables (`twoFactor`, `organization`, `member`, `invitation`, `team`, `teamMember`, `role`, `apiKey`).
- Frontend `USE_BETTER_AUTH` flag + `createAuthClient` adapters — AuthContext, sign-in, and security pages already switch providers without call-site changes.

---

## 2. OAuth / passkey roadmap

| Capability | GoTrue (Supabase Auth) | Better Auth | Verdict |
| --- | --- | --- | --- |
| **Social OAuth** | 30+ providers, configured in the dashboard (no code), PKCE | `generic-oauth` + provider plugins (Google, GitHub, …), code-configured callbacks, self-hosted | GoTrue wins breadth + ops; Better Auth covers the common set |
| **Passkeys (WebAuthn/FIDO2)** | **Native passkeys in beta since May 2026** (dashboard toggle, 2 API calls) | First-party **passkey plugin** (mature; WebAuthn extension support landed in 1.6) | Parity; Better Auth's is stable, Supabase's is beta |
| **Phone / SMS OTP** | Native (provider via dashboard) | `phone-number` plugin (bring your own SMS gateway) | GoTrue simpler ops |
| **Email OTP / magic links** | Native | `email-otp` / `magic-link` plugins (we wire `sendOTP`/email) | Parity (both need email delivery configured) |
| **TOTP 2FA** | Native GoTrue MFA (unused today) | `twoFactor` plugin (TOTP + backup codes + trusted devices + lockout) | Parity; both first-party |
| **Enterprise SSO (SAML/OIDC)** | Native (paid tier) | `sso` plugin (self-hosted) | GoTrue cheaper ops |

Both providers cover the passkey roadmap — the differentiator is *managed vs
self-hosted*, not availability.

---

## 3. Plugin coverage vs the Provance roadmap

| Provance surface | On GoTrue today | Better Auth plugin (status) |
| --- | --- | --- |
| 2FA (Security page) | Mock-only toggle | `twoFactor` — **enabled** (gated) |
| Organization + **teams** | Custom org module (`0005`) | `organization` (org/member/invitation/team/teamMember/role) — **enabled** |
| API keys (scopes/limits/expiry) | Mock-only | `@better-auth/api-key` — **enabled** |
| Roles & permissions (admin) | Custom roles module (`0016`) | `access` (RBAC) + org `role` table — not enabled |
| Admin surfaces | Custom `AdminGuard` + modules | `admin` plugin — not enabled |
| Active sessions | Custom security module (`0010`) | Core `session` table + `multi-session` plugin — not enabled |
| Anonymous / bearer / JWT / one-time tokens | n/a | First-party plugins — not enabled |

The pattern is consistent: **on GoTrue every roadmap auth feature is custom
code we own forever; on Better Auth it is a plugin with a schema migration.**

---

## 4. Migration cost (the real work)

### 4a. Password hashes — forced reset (the biggest item)
GoTrue stores **bcrypt**; Better Auth defaults to **scrypt**. Hash formats are
not convertible, so existing passwords **cannot be imported** — users must set
a new password. Mitigations:
- **One-time forced reset** on first sign-in after cutover (standard, documented UX; the reset flow already exists on both paths).
- Pre-migration reset email, if real users exist.
- Keeping GoTrue as an identity bridge (dual maintenance — not recommended).
> **Timing matters:** with ~zero real users, this costs almost nothing today and everything after launch.

### 4b. IDs + FK repointing
- GoTrue user ids are **UUIDs** (`auth.users.id`); Better Auth defaults to `user_…` text strings.
- **7 `auth.users` references** across migrations `0004` (profiles), `0005` (organization members + invites ×2), `0010` (user_sessions ×2), `0011` (notifications), `0017` (seed). `scans.user_id` is a UUID with **no FK** (RLS-only) but still needs id compatibility for joins.
- **Strategy A (recommended):** seed `public."user".id` with the **legacy UUIDs** (the column is `text` — UUID strings fit) and repoint the FKs to `public."user"`. Zero id churn in profiles/scans/sessions/notifications; existing joins keep working.
- **Strategy B:** `advanced.database.generateId: false` + `uuid` PK defaults in `0018` — cleaner long-term, but requires a schema change and row migration.

### 4c. RLS + the client-side Supabase usage
Table RLS policies key off `auth.uid()` JWT claims from GoTrue tokens, which
don't exist on Better Auth cookie sessions. **Not load-bearing for the app** —
reads/writes go through the NestJS service role (RLS bypassed), and the only
direct client use is Storage uploads via signed URLs (auth-agnostic). Cutover
includes reworking/retiring the `auth.uid()` policies (one migration).

### 4d. Sessions + guards
`user_sessions` + the security module repoint to Better Auth's session table;
`SupabaseAuthGuard` stays until the flip, then a Better Auth session guard
replaces it. The frontend flag already switches AuthContext + sign-in/security
with zero page changes.

### 4e. Ops delta
- **GoTrue:** fully managed — dashboard OAuth/SMS config, no secret rotation beyond Supabase keys, platform rate limits.
- **Better Auth:** self-hosted — we own `BETTER_AUTH_SECRET` rotation, DB-backed sessions, rate limiting (NestJS Throttler already present), and email/OTP delivery.

---

## 5. Founder decision gate

### Scored comparison (1–5)

| Criterion | Weight | GoTrue | Better Auth | Rationale |
| --- | --- | --- | --- | --- |
| Roadmap fit (2FA, org/teams, API keys, passkeys) | 30% | 4 | 5 | GoTrue covers 2FA/passkeys natively, but org/teams/API keys are custom or mock-only; Better Auth ships all |
| Migration cost | 20% | 5 | 2 | Zero for GoTrue; forced reset + FK repoint for Better Auth — but cheapest it will ever be (≈0 users) |
| Operational burden | 20% | 5 | 3 | Managed vs self-hosted (secrets, email, rate limits) |
| OAuth/SMS breadth | 10% | 5 | 3 | 30+ dashboard providers vs common set, code-configured |
| Velocity / lock-in | 20% | 3 | 5 | GoTrue = keep building custom + Supabase lock-in; Better Auth = plugins + open, matches our NestJS stack |
| **Weighted** | | **4.30** | **3.80** | |

The gap narrows as users grow (migration cost worsens for Better Auth, stays
flat for GoTrue) — **the decision window is now, not later.**

### The three options

- **Option A — Stay on GoTrue.** No disruption; keep building custom: real 2FA via GoTrue MFA, API-keys backend slice, passkeys via the May-2026 beta. Slower velocity, permanent vendor lock, custom auth code to maintain.
- **Option B — Migrate to Better Auth now (recommended).** Accept the forced reset (~free today), FK repoint + RLS rework, flip `VITE_USE_BETTER_AUTH`, retire the GoTrue path. Fastest roadmap velocity; self-hosted ops burden.
- **Option C — Hybrid (today's spike state).** Run both; new surfaces on Better Auth. Only defensible as a **transition state** — two session systems, two guards, doubled surface — not a destination.

### Founder sign-off checklist

- [ ] **User reality:** are there any real users beyond dev test accounts? (>0 ⇒ budget a reset campaign into Option B)
- [ ] **Social login breadth:** does the near-term roadmap need 30+ dashboard-managed OAuth providers, or is Google/GitHub sufficient?
- [ ] **SMS/phone auth** in the near term?
- [ ] **Ops posture:** accept self-hosted auth ops (secret rotation, email delivery, Throttler-based rate limits)?
- [ ] **Forced reset:** accept a one-time password reset for existing accounts (today ≈ free)?
- [ ] **Decision:** A / B / C, with a re-evaluation date if C.

### If B is approved, the sequenced cutover

1. Set `USE_BETTER_AUTH=true` + `DATABASE_URL` in `backend/.env.local`, apply `0018_better_auth.sql` (+ reconcile with `npx @better-auth/cli generate`); verify `/v1/better-auth/ok` reports `ok: true`.
2. Seed `public."user"` with legacy UUIDs; repoint FKs (Strategy A); rework `auth.uid()` RLS (one migration).
3. Add a Better Auth session guard; keep `SupabaseAuthGuard` until the flip.
4. Build the forced-reset-first-sign-in UX.
5. Flip `VITE_USE_BETTER_AUTH`; verify sign-up/sign-in/sessions end-to-end.
6. Decommission the GoTrue path (env keys, guard, RLS cleanup) once the new path has shipped green.
