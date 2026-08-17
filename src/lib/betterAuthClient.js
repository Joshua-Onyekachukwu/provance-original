/**
 * betterAuthClient.js — Better Auth frontend client + adapters.
 *
 * Thin wrappers over createAuthClient() (mounted as a NestJS controller at
 * /v1/better-auth on the backend, behind the USE_BETTER_AUTH flag) that
 * normalize better-auth's `{ data, error }` responses into the exact shapes
 * the mock / GoTrue paths in api.js already produce, so AuthContext and the
 * sign-in/security pages can switch providers behind the USE_BETTER_AUTH flag
 * without changing a single call site.
 *
 * Server: backend/src/auth/better-auth.config.ts (twoFactor, organization,
 * apiKey plugins enabled behind the DATABASE_URL gate). Evaluation:
 * docs/engineering/BETTER_AUTH_PLUGINS.md.
 */

import { createAuthClient } from 'better-auth/client'

export const BETTER_AUTH_URL =
  import.meta.env.VITE_BETTER_AUTH_URL || 'http://localhost:4000'

export const authClient = createAuthClient({
  baseURL: BETTER_AUTH_URL,
  // The backend mounts the provider as a controller under the v1 prefix
  // (BetterAuthController catch-all), not the default /api/auth basePath.
  basePath: '/v1/better-auth',
  fetchOptions: {
    // Frontend (:3000/:5173) → backend (:4000) is cross-origin, and the
    // session cookie is httpOnly on the backend origin — every request must
    // carry it explicitly.
    credentials: 'include',
  },
})

/**
 * Emails that resolve to admin access in better-auth mode. Mirrors the
 * ADMIN_EMAILS list the backend uses for the GoTrue path; better-auth itself
 * has no role concept without the admin plugin, so this is the honest parallel
 * for gating /app/admin/* until roles move to the org plugin.
 */
const ADMIN_EMAILS = ['provance-admin@provance.test', 'founder.admin@provance.local']

/** LocalStorage key for the mock-only security toggles in better-auth mode. */
const BA_SECURITY_SETTINGS_KEY = 'provance.ba.security.settings.v1'

/**
 * unwrap — better-auth client methods resolve `{ data, error }` instead of
 * throwing. Throw on error (the api.js contract), return data on success.
 */
async function unwrap(promise) {
  const { data, error } = await promise
  if (error) {
    const message = error.message || error.statusText || 'Better Auth request failed.'
    throw new Error(message)
  }
  return data
}

function displayNameForEmail(email) {
  const localPart = (email || '').split('@')[0]
  return (
    localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Provance User'
  )
}

function readTwoFactorEnabled(user) {
  return Boolean(user && user.twoFactorEnabled)
}

/**
 * buildViewer — normalizes a better-auth user+session into the
 * `buildAuthResponse`-shaped payload normalizeAuthState (AuthContext) expects:
 * { status, user: {id, email}, profile, permissions, session: {accessToken,
 * refreshToken, tokenType, expiresAt} }. Exported for unit tests.
 */
export function buildViewer(user, session) {
  const email = user.email
  const expiresAt = session?.expiresAt
    ? new Date(session.expiresAt).getTime()
    : Date.now() + 60 * 60 * 1000

  return {
    status: 'authenticated',
    user: { id: user.id, email },
    profile: {
      displayName: user.name || displayNameForEmail(email),
      organization: 'Provance Internal',
      roleTitle: 'member',
      defaultWorkspace: 'individual',
      emailNotifications: true,
      accountRole: 'member',
      teamAccess: false,
    },
    permissions: {
      individual: true,
      team: false,
      admin: ADMIN_EMAILS.includes(email),
    },
    session: {
      accessToken: session?.token || `ba_${session?.id || 'anon'}`,
      refreshToken: null,
      tokenType: 'bearer',
      expiresAt,
    },
  }
}

// ---------------------------------------------------------------------------
// Auth primitives (api.js branches)
// ---------------------------------------------------------------------------

export async function betterSignIn({ email, password } = {}) {
  if (!email || !password) {
    throw new Error('Email and password are required.')
  }
  const data = await unwrap(
    authClient.signIn.email({ email: email.trim(), password }),
  )
  return buildViewer(data.user, data.session)
}

export async function betterGetCurrentViewer() {
  const data = await unwrap(authClient.getSession())
  if (!data?.user) {
    throw new Error('No active session.')
  }
  return buildViewer(data.user, data.session)
}

export async function betterSignOut() {
  await unwrap(authClient.signOut())
  return { status: 'signed_out' }
}

export async function betterRequestPasswordReset({ email } = {}) {
  // Anti-enumeration contract (same as the mock and GoTrue paths): always
  // resolve. Until the backend configures sendResetPassword this is a
  // best-effort fire — the user never learns whether the account exists.
  try {
    await unwrap(authClient.forgetPassword({ email, redirectTo: '/reset-password' }))
  } catch {
    // swallow — see above
  }
  return { ok: true, email }
}

export async function betterConfirmPasswordReset({ token, password } = {}) {
  if (!token) throw new Error('A reset token is required.')
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters.')
  }
  await unwrap(authClient.resetPassword({ token, newPassword: password }))
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Security settings (AppSecurityPage)
// ---------------------------------------------------------------------------

/**
 * betterChangePassword — better-auth leg of the change-password contract.
 *
 * Parity contract — all three auth backends must behave identically on a
 * password change (pinned by betterChangePasswordContract.test.js and
 * changePasswordContract.test.js):
 *   1. Format-validate BEFORE touching the backend — 8+ chars and different
 *      from the current password, with the same messages as
 *      mockChangePassword.
 *   2. Revoke EVERY OTHER session while the current device stays signed in.
 *      The mock filters activeSessions down to the current row;
 *      SecurityService.changePassword (GoTrue) revokes every non-current
 *      session via the Supabase admin API; better-auth's native
 *      `revokeOtherSessions: true` deletes all of the user's sessions and
 *      immediately mints a fresh one for the current device (cookie
 *      rotated) — same net state: exactly one active session, the current
 *      device.
 *   3. Resolve `{ ok: true }`. The page re-syncs the ledger afterwards via
 *      settings.reload(), which works for all three paths.
 */
export async function betterChangePassword({ currentPassword, newPassword } = {}) {
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    throw new Error('New password must be at least 8 characters.')
  }
  if (currentPassword === newPassword) {
    throw new Error('New password must be different from the current password.')
  }
  // Matches the page copy: "Rotating your password signs out other active
  // sessions for safety." revokeOtherSessions: true is better-auth's native
  // revoke-everything-else — the equivalent of the mock's activeSessions
  // filter and the GoTrue path's per-session admin revoke.
  await unwrap(
    authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    }),
  )
  return { ok: true }
}

// Maps better-auth session token → the id exposed to the page, so revoke can
// address sessions by the id the UI already holds.
const sessionTokenById = new Map()

export async function betterGetSecuritySettings() {
  const sessionData = await unwrap(authClient.getSession())
  if (!sessionData?.user) {
    throw new Error('No active session.')
  }
  const current = sessionData.session
  const sessions = (await unwrap(authClient.listSessions())) || []

  sessionTokenById.clear()
  const activeSessions = sessions.map((s) => {
    const token = s.token || s.id
    const id = token
    sessionTokenById.set(id, token)
    return {
      id,
      device: s.userAgent || 'Unknown device',
      location: '—',
      ipAddress: s.ipAddress || '—',
      lastActiveAt: (s.updatedAt || s.createdAt)
        ? new Date(s.updatedAt || s.createdAt).toISOString()
        : null,
      isCurrent: Boolean(current && (token === current.token || s.id === current.id)),
    }
  })

  const twoFactorEnabled = readTwoFactorEnabled(sessionData.user)
  return {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumber: true,
      requireSymbol: true,
    },
    activeSessions,
    signInControls: {
      twoFactorAuth: {
        enabled: twoFactorEnabled,
        method: twoFactorEnabled ? 'totp' : null,
        updatedAt: null,
      },
      // Mock-only toggles — no real backend surface exists; values persist
      // locally so the page behaves the same as the mock store.
      sessionTimeoutMinutes: readLocalSetting('sessionTimeoutMinutes', 60),
      notifyOnNewDevice: readLocalSetting('notifyOnNewDevice', true),
      notifyOnPasswordChange: readLocalSetting('notifyOnPasswordChange', true),
    },
  }
}

function readLocalSetting(key, fallback) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(BA_SECURITY_SETTINGS_KEY) || '{}')
    return key in stored ? stored[key] : fallback
  } catch {
    return fallback
  }
}

function writeLocalSetting(key, value) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(BA_SECURITY_SETTINGS_KEY) || '{}')
    stored[key] = value
    window.localStorage.setItem(BA_SECURITY_SETTINGS_KEY, JSON.stringify(stored))
  } catch {
    // non-browser env / quota — best effort
  }
}

export async function betterRevokeSession(sessionId) {
  const token = sessionTokenById.get(sessionId) || sessionId
  await unwrap(authClient.revokeSession({ token }))
  sessionTokenById.delete(sessionId)
  return { ok: true, sessionId }
}

export async function betterUpdateSecuritySetting(key, value) {
  if (key === 'twoFactorAuth') {
    // The plugin requires the password + TOTP enrollment flow (twoFactorClient:
    // enable → totpURI/QR → verify). The page's toggle passes no password, so
    // fail loudly rather than fake an enable.
    throw new Error(
      'Two-factor authentication needs the enrollment flow (password + TOTP setup) — wiring pending.',
    )
  }
  if (key === 'sessionTimeoutMinutes' || key === 'notifyOnNewDevice' || key === 'notifyOnPasswordChange') {
    writeLocalSetting(key, value)
    return { ok: true, key, value }
  }
  return { ok: true, key, value }
}
