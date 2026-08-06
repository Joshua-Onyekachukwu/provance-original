/**
 * telemetry.js — pre-Sentry crash telemetry stub.
 *
 * Crash reports currently have nowhere to go: the ErrorBoundary's fallback
 * surfaces the error to the user, but the details vanish with the tab. Until
 * the approved Sentry integration lands, this module keeps a lightweight
 * record of every captured render error:
 *
 *   1. a structured console.error in dev builds (visibility while developing)
 *   2. a capped localStorage buffer (survives the tab closing, can be flushed
 *      by a future backend endpoint or read for support triage)
 *
 * User identity is attached from the same persisted session AuthContext uses
 * (provance.auth.session.v1), so the boundary — a class component that can't
 * call useAuth — still gets user_id/email on every record.
 *
 * All browser access goes through `globalThis` inside guards so the module is
 * safe to import in node unit tests and never throws on quota/unavailable
 * storage. Sentry replaces this seam wholesale: keep calling `captureError`
 * from the boundary and swap the implementation.
 */

// Same key AuthContext persists the session under (src/context/AuthContext.jsx,
// AUTH_STORAGE_KEY). Kept literal here so this leaf module never imports the
// React context layer — telemetry must stay importable from anywhere (and
// node-testable) without dragging React or the API layer along.
const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

const CRASH_BUFFER_KEY = 'provance.crashReports.v1'

/** Keep the newest N records so the buffer can't grow without bound. */
const MAX_BUFFERED = 25

/** Cap a single stack trace so one giant payload can't blow the buffer. */
const MAX_STACK_CHARS = 6000

function safeRead(key) {
  try {
    const value = globalThis.localStorage?.getItem(key)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

function safeWrite(key, value) {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded, storage disabled, or private mode — the record is lost
    // rather than letting telemetry itself crash the app.
  }
}

function safeRemove(key) {
  try {
    globalThis.localStorage?.removeItem(key)
  } catch {
    // Ignore — same rationale as safeWrite.
  }
}

function getRoute() {
  return globalThis.location?.pathname ?? null
}

function getUserAgent() {
  return globalThis.navigator?.userAgent ?? null
}

/**
 * Attach identity from the persisted auth session. Deliberately defensive:
 * telemetry must never depend on the session being present or well-formed.
 */
function getIdentity() {
  const session = safeRead(AUTH_STORAGE_KEY)
  if (!session?.user) return { user_id: null, email: null }
  return {
    user_id: session.user.id ?? null,
    email: session.user.email ?? null,
  }
}

function truncateStack(stack) {
  if (typeof stack !== 'string') return null
  if (stack.length <= MAX_STACK_CHARS) return stack
  return `${stack.slice(0, MAX_STACK_CHARS)}\n… (truncated)`
}

/**
 * Build a structured crash record. `context` may carry `componentStack`
 * (from ErrorBoundary's errorInfo) and any extra `meta`.
 */
export function buildCrashRecord(error, context = {}) {
  const isError = error instanceof Error
  return {
    id: `cr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'render_error',
    timestamp: new Date().toISOString(),
    message: isError ? error.message || String(error) || 'Unknown error' : String(error),
    stack: truncateStack(isError ? error.stack : null),
    component_stack: context.componentStack || null,
    route: context.route || getRoute(),
    user_agent: getUserAgent(),
    ...getIdentity(),
    meta: context.meta || {},
  }
}

/**
 * Capture a crash: log to the dev console and append to the localStorage
 * buffer (capped, oldest dropped). Never throws. Returns the record.
 */
export function captureError(error, context = {}) {
  const record = buildCrashRecord(error, context)

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error('[telemetry] crash captured', record)
  }

  const buffered = safeRead(CRASH_BUFFER_KEY)
  const records = Array.isArray(buffered) ? buffered : []
  safeWrite(CRASH_BUFFER_KEY, [...records, record].slice(-MAX_BUFFERED))

  return record
}

/** Read the buffered crash records (newest last). */
export function getBufferedErrors() {
  const buffered = safeRead(CRASH_BUFFER_KEY)
  return Array.isArray(buffered) ? buffered : []
}

/** Clear the buffer (e.g. after a successful flush or manual triage). */
export function clearBufferedErrors() {
  safeRemove(CRASH_BUFFER_KEY)
}

/**
 * Seam for the future backend flush: resolves with the buffered records so a
 * later endpoint can POST them (or Sentry replaces the whole module). Stays a
 * no-network stub for now.
 */
export function flushErrors() {
  return Promise.resolve(getBufferedErrors())
}
