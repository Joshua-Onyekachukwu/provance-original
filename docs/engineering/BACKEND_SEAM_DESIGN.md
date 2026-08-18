# Backend Seam Design — api.js dispatch ladder collapse

**Status:** Proposed
**Date:** 2026-08-17
**Author:** Buffy (architecture review candidate 01)
**Related:** `src/lib/api.js` (988 lines, 79 branches), `src/lib/mockApi.js` (1905 lines), `src/lib/betterAuthClient.js`, `src/lib/importParity.js`, `docs/engineering/API_DESIGN_STANDARDS.md`

---

## 1. Problem

`api.js` is a 988-line dispatch ladder: 79 exported functions, each containing
`if (USE_MOCK) return mockX(...)` and sometimes `if (USE_BETTER_AUTH) return betterX(...)`.
This means:

- **70 USE_MOCK branches + 9 USE_BETTER_AUTH branches** in a single file.
- Every new backend (video/image processing, better-auth in production, a second
  mock mode for demos) requires editing 79 function bodies.
- The session plumbing (`refreshMockSession` / `refreshRealSession` /
  `refreshStoredSessionIfNeeded`, `memorySession`, `localStorage`) is entangled
  with the dispatch, making it impossible to test one backend's session flow
  without the other's present.
- Three separate backend implementations exist today (`request()` + session store
  for real; `mockApi` for mock; `betterAuthClient` for better-auth), but they
  aren't named as adapters and can't be swapped, composed, or tested independently.

## 2. Goal

Replace the per-function dispatch with **one boot-time adapter selection**:

```
const base = USE_MOCK ? new MockBackend() : new HttpBackend()
export const backend = USE_BETTER_AUTH ? new BetterAuthBackend(base) : base
```

Every exported function becomes a one-line delegation:

```js
export function listScans(params) { return backend.listScans(params) }
```

The 79 function signatures stay exactly as they are (zero importer churn); the
USE_MOCK / USE_BETTER_AUTH branches move from 79 places to one.

## 3. The Backend Interface

The interface is the union of every operation `api.js` exposes to consumers,
grouped by domain. The interface IS the api.js public surface minus the mode
constants (`USE_MOCK`, `USE_BETTER_AUTH`) and the session helper constants,
which are owned by the adapters.

### Interface manifest (all methods must be implemented or explicitly delegated)

#### Session seam

| Method | Returns | Notes |
|---|---|---|
| `ensureSession(force)` | `Promise<string \| null>` | Access token or null. Mock: localStorage refresh. Real: httpOnly cookie rotation. |
| `setMemorySession(session)` | `void` | Store session (mock: localStorage, real: module-level memory). |
| `getMemorySession()` | `object \| null` | Clone of stored session. |
| `clearMemorySession()` | `void` | Wipe stored session. |

#### Auth

| Method | MockBackend | HttpBackend | BetterAuthBackend |
|---|---|---|---|
| `signInWithPassword(creds)` | `mockSignInWithPassword` | `request('/auth/sign-in')` | `betterSignIn` |
| `signOut()` | inline localStorage clear | `request('/auth/sign-out')` | `betterSignOut` |
| `getCurrentViewer()` | `mockGetCurrentViewer` | `request('/auth/me')` | `betterGetCurrentViewer` |
| `requestPasswordReset(payload)` | `mockRequestPasswordReset` | `request('/auth/password-reset/request')` | `betterRequestPasswordReset` |
| `confirmPasswordReset(payload)` | `mockConfirmPasswordReset` | `request('/auth/password-reset/confirm')` | `betterConfirmPasswordReset` |
| `acceptInvite(payload)` | `mockAcceptInvite` | `request('/auth/invites/accept')` | delegates to base |

#### Waitlist / public

| Method | MockBackend | HttpBackend |
|---|---|---|
| `submitWaitlistApplication(form)` | **GAP — no mock twin** | `request('/waitlist/applications')` |
| `reviewWaitlistApplication(id, payload)` | `mockReviewWaitlistApplication` | `request('/admin/waitlist/:id', PATCH)` |
| `createAccessInvite(id, payload)` | `mockCreateAccessInvite` | `request('/admin/waitlist/:id/invite')` |

#### Scans

| Method | MockBackend | HttpBackend |
|---|---|---|
| `initiateScan(payload, key)` | `mockInitiateScan` | `request('/scans', POST)` |
| `submitScan(scanId)` | `mockSubmitScan` | `request('/scans/:id/submit')` |
| `listScans(params)` | `mockListScans` | `request('/scans')` |
| `getScan(scanId)` | `mockGetScan` | `request('/scans/:id')` |

#### Reports

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getReports(params)` | `mockGetReports` | `request('/reports')` |
| `getReport(reportId)` | `mockGetScan(reportId)` | `request('/reports/:id')` |
| `exportReportPdf(reportId)` | inline `{mock: true, printPath}` | fetch blob download |

#### Admin — dashboard + waitlist + flags

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getAdminDashboard()` | `mockGetAdminDashboard` | `request('/admin/dashboard')` |
| `getAdminUsers(params)` | `mockGetAdminUsers` | `request('/admin/users')` |
| `getOrganizations()` | `mockGetOrganizations` | `request('/admin/organizations')` |
| `getFeatureFlags()` | `mockGetFeatureFlags` | `request('/admin/feature-flags')` |
| `updateFeatureFlag(key, enabled)` | `mockUpdateFeatureFlag` | `request('/admin/feature-flags/:key', PATCH)` |

#### Admin — analytics / monitoring / queue

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getAnalytics(params)` | `mockGetAnalytics` | `request('/admin/analytics')` |
| `getSystemHealth()` | `mockGetSystemHealth` | `request('/admin/system-health')` |
| `getMonitoring()` | `mockGetMonitoring` | `request('/admin/monitoring')` |
| `getQueueSnapshot()` | `mockGetQueueSnapshot` | `request('/admin/queue/snapshot')` |

#### Notifications

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getNotifications(params)` | `mockGetNotifications` | `request('/notifications')` |
| `getUnreadNotificationCount()` | `mockGetUnreadNotificationCount` | `request('/notifications/unread-count')` |
| `markNotificationRead(id)` | `mockMarkNotificationRead` | `request('/notifications/:id/read', POST)` |
| `markAllNotificationsRead()` | `mockMarkAllNotificationsRead` | `request('/notifications/read-all', POST)` |

#### Audit / activity

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getAuditLogs(params)` | `mockGetAuditLogs` | `request('/audit-logs')` |
| `getActivityLogs(params)` | `mockGetActivityLogs` | `request('/activity-logs')` |
| `getAdminAuditLogs(params)` | `mockGetAdminAuditLogs` | `request('/admin/audit-logs')` |

#### Billing / invoices

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getBilling()` | `mockGetBilling` | `request('/billing')` |
| `getInvoices(params)` | `mockGetInvoices` | `request('/billing/invoices')` |

#### Security

| Method | MockBackend | HttpBackend | BetterAuthBackend |
|---|---|---|---|
| `getSecuritySettings()` | `mockGetSecuritySettings` | `request('/v1/security/settings')` | `betterGetSecuritySettings` |
| `changePassword(payload)` | `mockChangePassword` | `request('/v1/security/change-password', POST)` | `betterChangePassword` |
| `revokeSession(sessionId)` | `mockRevokeSession` | `request('/v1/security/sessions/:id', DELETE)` | `betterRevokeSession` |
| `updateSecuritySetting(key, value)` | `mockUpdateSecuritySetting` | `request('/v1/security/settings/:key', PATCH)` | `betterUpdateSecuritySetting` |

#### Account / profile

| Method | MockBackend | HttpBackend |
|---|---|---|
| `updateAccountProfile(payload)` | **GAP — no mock twin** | `request('/account/profile', PATCH)` |
| `getUserProfile(userId)` | `mockGetUserProfile` | `request('/admin/users/:id')` |
| `updateUserRole(userId, role)` | `mockUpdateUserRole` | `request('/admin/users/:id/role', PATCH)` |
| `toggleTeamAccess(userId, enabled)` | `mockToggleTeamAccess` | `request('/admin/users/:id/team-access', PATCH)` |

#### Admin roles

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getAdminRoles()` | `mockGetAdminRoles` | `request('/admin/roles')` |
| `updateRoleScopes(roleId, scopes)` | `mockUpdateRoleScopes` | `request('/admin/roles/:id/scopes', PATCH)` |
| `reassignMemberRole(memberId, roleId)` | `mockReassignMemberRole` | `request('/admin/members/:id/role', PATCH)` |
| `getAdminSettings()` | `mockGetAdminSettings` | `request('/admin/settings')` |

#### Org / members

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getOrganization()` | `mockGetOrganization` | `request('/v1/organization')` |
| `inviteMember(payload)` | `mockInviteMember` | `request('/v1/organization/invite', POST)` |
| `updateMemberRole(memberId, role)` | `mockUpdateMemberRole` | `request('/v1/organization/members/:id/role', PATCH)` |
| `updateMemberTeam(memberId, teamId)` | `mockUpdateMemberTeam` | `request('/v1/organization/members/:id/team', PATCH)` |
| `removeMember(memberId)` | `mockRemoveMember` | `request('/v1/organization/members/:id', DELETE)` |
| `cancelInvite(inviteId)` | `mockCancelInvite` | `request('/v1/organization/invites/:id', DELETE)` |
| `getMemberSessions(memberId)` | `mockGetMemberSessions` | `request('/v1/organization/members/:id/sessions')` |
| `revokeMemberSession(memberId, sessionId)` | `mockRevokeMemberSession` | `request('/v1/organization/members/:id/sessions/:sid', DELETE)` |
| `revokeMemberSessions(memberId)` | `mockRevokeMemberSessions` | `request('/v1/organization/members/:id/sessions', DELETE)` |

#### API keys

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getApiKeys()` | `mockGetApiKeys` | `request('/v1/api-keys')` |
| `createApiKey(payload)` | `mockCreateApiKey` | `request('/v1/api-keys', POST)` |
| `revokeApiKey(keyId)` | `mockRevokeApiKey` | `request('/v1/api-keys/:id', DELETE)` |
| `regenerateApiKey(keyId)` | `mockRegenerateApiKey` | `request('/v1/api-keys/:id/regenerate', POST)` |

#### Webhooks

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getWebhooks()` | `mockGetWebhooks` | `request('/v1/webhooks')` |
| `createWebhook(payload)` | `mockCreateWebhook` | `request('/v1/webhooks', POST)` |
| `updateWebhookStatus(id, status)` | `mockUpdateWebhookStatus` | `request('/v1/webhooks/:id/status', PATCH)` |
| `rotateWebhookSecret(id)` | `mockRotateWebhookSecret` | `request('/v1/webhooks/:id/rotate', POST)` |
| `deleteWebhook(id)` | `mockDeleteWebhook` | `request('/v1/webhooks/:id', DELETE)` |
| `testWebhook(id)` | `mockTestWebhook` | `request('/v1/webhooks/:id/test', POST)` |
| `getWebhookDeliveries(id)` | `mockGetWebhookDeliveries` | `request('/v1/webhooks/:id/deliveries')` |

#### Admin jobs

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getAdminJobs(params)` | `mockGetAdminJobs` | `request('/admin/jobs')` |
| `retryJob(jobId)` | `mockRetryJob` | `request('/admin/jobs/:id/retry', POST)` |
| `failJob(jobId, reason)` | `mockFailJob` | `request('/admin/jobs/:id/fail', POST)` |
| `getAdminReports(params)` | `mockGetAdminReports` | `request('/admin/reports')` |

#### Support / help / docs / crash

| Method | MockBackend | HttpBackend |
|---|---|---|
| `getSupportTickets(params)` | `mockGetSupportTickets` | `request('/support/tickets')` |
| `getHelpContent(params)` | `mockGetHelpContent` | `request('/help')` |
| `submitCrashReports(records)` | `mockSubmitCrashReports` | `request('/crash-reports', POST)` |

---

## 4. The Three Adapters

### 4.1 HttpBackend — the real NestJS path

**File:** `src/lib/backend/HttpBackend.js` (~600 lines, extracted from api.js)

**Owns:**
- `request(path, options)` — the shared fetch helper with auth refresh, 401 retry,
  error envelope (`Error` with `.status`, `.retryAfterSeconds`), JSON/FormData
  handling, Bearer token injection.
- `refreshRealSession(force)` — httpOnly cookie rotation via `POST /auth/refresh`,
  single-flight dedup for concurrent 401s.
- `memorySession` — the in-memory access token store (never localStorage).
- `API_BASE_URL` — env-driven (`VITE_API_BASE_URL`).

**Transport seam (for testing):**
The constructor accepts an optional `fetch` override:

```js
class HttpBackend {
  constructor({ fetch = globalThis.fetch } = {}) {
    this.fetch = fetch
  }
}
```

All `request()` calls go through `this.fetch`, so the contract suite can run
against a stubbed transport without a live server. The mock's `delay` / `error`
injection stays in MockBackend — HttpBackend is clean.

**Session adapter:**
```js
ensureSession(force)        → refreshRealSession(force)
setMemorySession(session)   → this.memorySession = session
getMemorySession()          → structuredClone(this.memorySession)
clearMemorySession()        → this.memorySession = null
```

### 4.2 MockBackend — the frontend-only path

**File:** `src/lib/backend/MockBackend.js` (~150 lines of wrappers + session plumbing)

**Owns:**
- All 69 `mockApi` twins — each method delegates to the existing mockApi
  function: `listScans(p) { return mockListScans(p) }`.
- `refreshMockSession(force)` — localStorage read/refresh/write cycle.
- `readStoredSession()` / `writeStoredSession()` / `clearStoredSession()`.
- `localStorage` session store.

**Gap flags (surfaced by the seam, to close during implementation):**

| Function | Current mock-mode behavior | MockBackend resolution |
|---|---|---|
| `submitWaitlistApplication` | Always hits HTTP — form breaks in mock mode | New mock twin (store in localStorage, return success) |
| `updateAccountProfile` | Always hits HTTP — profile save breaks in mock mode | New mock twin (persist to mock user fixture, update localStorage session) |
| `exportReportPdf` | Inline `{mock: true, printPath}` in api.js | Move inline to MockBackend method |
| `getReport` | Alias `mockGetScan(reportId)` | Keep alias (one-liner delegation) |
| `signOut` | Inline localStorage clear in api.js | Move to MockBackend method |
| `ensureSession` | Calls `refreshStoredSessionIfNeeded` | Move `refreshMockSession` logic |

### 4.3 BetterAuthBackend — auth/security decorator

**File:** `src/lib/backend/BetterAuthBackend.js` (~80 lines)

A decorator that wraps whichever base backend (MockBackend or HttpBackend)
and overrides the 9 auth/security functions where better-auth takes
precedence:

```
signInWithPassword, signOut, getCurrentViewer,
requestPasswordReset, confirmPasswordReset,
changePassword, revokeSession, getSecuritySettings, updateSecuritySetting
```

Everything else passes through to the base adapter:

```js
class BetterAuthBackend {
  constructor(base) { this.base = base }

  // Override the auth/security subset
  signInWithPassword(creds)  { return betterSignIn(creds) }
  signOut()                  { return betterSignOut() }
  // ... 7 more overrides ...

  // Forward everything else
  listScans(params)  { return this.base.listScans(params) }
  // ... 60+ delegations ...
}
```

A short utility generates the forwarding methods, so BetterAuthBackend stays
compact: `Object.getOwnPropertyNames(BaseBackend.prototype).forEach(...)` minus
the override list.

**Why a decorator, not a full adapter:**
better-auth covers only the auth/security subset. It depends on a real
`/api/auth` server, so it always needs either the real NestJS backend or
the mock backend underneath. Making it a full adapter would duplicate
~60 methods for no benefit.

---

## 5. Boot-time selection

The seam lives in `src/lib/backend/index.js` — one file, three lines:

```js
import { HttpBackend } from './HttpBackend.js'
import { MockBackend } from './MockBackend.js'
import { BetterAuthBackend } from './BetterAuthBackend.js'

const base = USE_MOCK ? new MockBackend() : new HttpBackend()
export const backend = USE_BETTER_AUTH ? new BetterAuthBackend(base) : base
```

`api.js` imports `backend` and replaces every dispatch branch:

```js
// Before (× 79):
export function listScans(params) {
  if (USE_MOCK) return mockListScans(params)
  const query = params ? new URLSearchParams(...).toString() : ''
  return request(`/scans${query ? `?${query}` : ''}`)
}

// After (× 79):
export function listScans(params) {
  return backend.listScans(params)
}
```

The api.js exports, function signatures, and named-import surface remain
**identical** — the apiParity guard and all 48+ importer files are untouched.

---

## 6. Parity suites → per-adapter contract tests

### What stays unchanged

| Suite | Role | Status |
|---|---|---|
| `apiParity.test.js` | Pins api.js facade surface + importer scan | **Unchanged** — facade signatures are stable |
| `mockApiParity.test.js` | Pins mockApi internal surface + importers | **Unchanged** — MockBackend wraps mockApi, importers don't change |
| `mockDataParity.test.js` | Pins mockData fixture surface | **Unchanged** |
| `pollParity.test.jsx` | Behavior contract between useResource/useMockData | **Unchanged** |

### What gets created

#### 6.1 `backendParity.test.js` — interface drift guard

Same `createImportParityGuard` pattern as the other parity tests:

```js
const INTERFACE = [
  'listScans', 'getScan', 'initiateScan', 'submitScan',
  'signInWithPassword', 'signOut', /* ... all 75+ methods ... */
]

describe('Backend interface surface', () => {
  it('MockBackend implements every interface method', () => {
    const mock = new MockBackend()
    for (const method of INTERFACE) {
      expect(typeof mock[method]).toBe('function')
    }
  })

  it('HttpBackend implements every interface method', () => {
    const http = new HttpBackend({ fetch: vi.fn() })
    for (const method of INTERFACE) {
      expect(typeof http[method]).toBe('function')
    }
  })

  it('BetterAuthBackend delegates methods it doesn't override', () => {
    const base = new MockBackend()
    const better = new BetterAuthBackend(base)
    // Every non-overridden method on BetterAuthBackend === base[method]
    const OVERRIDES = ['signInWithPassword', 'signOut', /* ...9 total... */]
    for (const method of INTERFACE) {
      if (OVERRIDES.includes(method)) continue
      expect(better[method]).toBe(base[method])
    }
  })
})
```

This replaces the name-list parity with a **runtime behavioral check**:
every adapter must have every method, and the decorator's forwarding is
verifiable at the function identity level.

#### 6.2 `backendContract.test.js` — shared behavioral contract

A shared test runner that asserts the API_DESIGN_STANDARDS dialect
against any backend instance:

```js
export function runBackendContractSuite(backend) {
  describe(`${backend.constructor.name} dialect contract`, () => {
    it('listScans returns the pagination envelope', async () => {
      const result = await backend.listScans()
      expect(result).toHaveProperty('data')
      expect(Array.isArray(result.data)).toBe(true)
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('page')
      expect(result).toHaveProperty('pageSize')
    })

    it('initiateScan returns the upload contract', async () => {
      const result = await backend.initiateScan({ filename: 'test.jpg' })
      expect(result).toHaveProperty('scan')
      expect(result).toHaveProperty('upload')
    })

    it('error shape has string message + numeric status', async () => {
      try {
        await backend.getScan('nonexistent-id')
        expect.unreachable('should throw')
      } catch (error) {
        expect(typeof error.message).toBe('string')
        expect(typeof error.status).toBe('number')
      }
    })

    // ... 20+ scenarios covering the full interface ...
  })
}
```

**MockBackend** runs the contract suite directly — pure functions, no fetch.

**HttpBackend** runs against a stubbed `fetch` (the constructor seam):

```js
describe('HttpBackend dialect contract', () => {
  const fakeFetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve({ data: [], total: 0, page: 1, pageSize: 20 }),
  })

  runBackendContractSuite(new HttpBackend({ fetch: fakeFetch }))
})
```

This is where `API_DESIGN_STANDARDS.md` becomes an executable contract:
the pagination envelope, error format, and camelCase DTO shape are asserted
per adapter, so drift is caught in the unit suite before a deploy.

#### 6.3 Migration path for existing mock contract tests

The existing per-function mock contract tests (`mockAdminJobsParams.test.js`,
`mockChangePasswordContract.test.js`, `mockBetterChangePasswordContract.test.js`,
etc.) become MockBackend-specific tests — they exercise one adapter's
implementation against its own fixture data. They stay in place and continue to
run alongside the shared contract suite.

---

## 7. Implementation phases (suggested order)

| Phase | What | Files | Risk |
|---|---|---|---|
| **1** | Backend interface manifest + backendParity guard (no behavior change) | `backend/interface.js`, `backend/index.js` (stub), `backendParity.test.js` | Very low: guard only, api.js unchanged |
| **2** | Extract HttpBackend from api.js (request + session + 60+ functions) | `backend/HttpBackend.js`, rewrite api.js dispatch to `backend.xxx()` | Medium: the biggest move; test after each domain group |
| **3** | Extract MockBackend (session + mockApi delegation + 5 gaps) | `backend/MockBackend.js`, new mock twins for submitWaitlistApplication, updateAccountProfile | Low: wraps existing mock code |
| **4** | Extract BetterAuthDecorator (9 overrides + forwarding) | `backend/BetterAuthBackend.js` | Low: thin decorator |
| **5** | Per-adapter contract suite | `backendContract.test.js` + `runBackendContractSuite` | Medium: needs stubbed fetch fixtures |
| **6** | Remove api.js dispatch ladder + session plumbing (dead code) | api.js shrinks from 988 → ~120 lines | Low: once phase 2-4 are verified |

Each phase is independently shippable. Phase 1 can land today as a zero-risk
guard. Phase 2 is the core refactor (the most impactful, but also the one that
touches the most code — test after each domain group: auth → scans → admin →
org → security → billing → webhooks → support).

---

## 8. Conventions and constraints

- **File location:** `src/lib/backend/` — keeps the seam close to where it lives
  today (`src/lib/api.js`, `src/lib/mockApi.js`).
- **Module format:** ES modules (consistent with the rest of `src/lib/`).
- **No consumer changes:** all 48+ importers continue importing from `api.js`.
  The facade stays; the dispatch moves.
- **The importParity guard for api.js** stays as the surface contract.
  Adding an adapter method is a deliberate API change — the guard detects
  facade↔interface mismatch.
- **API_DESIGN_STANDARDS.md** is the source of truth the contract suite asserts.
  If the standards change, the contract suite must update in the same turn.

---

## 9. Risk: session store coupling

The most delicate part of the extraction is the session store. Today,
`readStoredSession()`, `writeStoredSession()`, `clearStoredSession()`,
`memorySession`, `refreshMockSession`, and `refreshRealSession` are all
module-level state in api.js. Moving them into per-adapter methods means:

- MockBackend owns the localStorage session (survives dev-server reloads).
- HttpBackend owns the in-memory session (no XSS exposure).
- BetterAuthBackend delegates to the base adapter's session store.

The seam must ensure that `setMemorySession` / `getMemorySession` /
`clearMemorySession` — called from `AuthContext` — route to the correct
adapter's store. In the new design, these are interface methods on the
selected backend, so the routing is automatic.

**Critical invariant:** the httpOnly cookie refresh (`POST /auth/refresh`)
is only called by `refreshRealSession`. MockBackend never calls it (mock
session refresh uses `refreshMockSession`, which reads `localStorage`).
BetterAuthBackend overrides the auth methods that call refresh, so it
bypasses both session stores entirely — it uses the better-auth client's
own session mechanism.
