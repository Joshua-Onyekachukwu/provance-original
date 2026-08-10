/**
 * telemetry.js — pre-Sentry crash telemetry.
 *
 * Crash reports need somewhere to go before the approved Sentry integration
 * lands: the ErrorBoundary's fallback surfaces the error to the user, but the
 * details would otherwise vanish with the tab. This module keeps a lightweight
 * record of every captured error:
 *
 *   1. a structured console.error in dev builds (visibility while developing)
 *   2. a capped localStorage buffer (survives the tab closing)
 *   3. a flush seam that ships the buffer to POST /v1/telemetry/errors and
 *      clears it only on success — a failed flush keeps the buffer for retry
 *
 * Two capture paths feed the same buffer:
 *   - the React ErrorBoundary forwards render/lifecycle crashes via
 *     `captureError` (type 'render_error')
 *   - `initGlobalErrorListeners` attaches window 'error' + 'unhandledrejection'
 *     listeners so non-React runtime errors — async code, timers, event
 *     handlers, resource loads, unhandled promise rejections — are captured
 *     too (type 'unhandled_error')
 *
 * User identity is attached from the same persisted session AuthContext uses
 * (provance.auth.session.v1), so the boundary — a class component that can't
 * call useAuth — still gets user_id/email on every record.
 *
 * All browser access goes through `globalThis` inside guards so the module is
 * safe to import in node unit tests and never throws on quota/unavailable
 * storage. The only non-leaf import is the single submitCrashReports API
 * function (still no React), keeping telemetry node-testable. Sentry replaces
 * this seam wholesale: keep calling `captureError` from the boundary, keep
 * `initGlobalErrorListeners` in the app entry, and swap the implementation.
 */

import { submitCrashReports } from './api.js'

// Same key AuthContext persists the session under (src/context/AuthContext.jsx,
// AUTH_STORAGE_KEY). Kept literal here so this module never imports the React
// context layer.
const AUTH_STORAGE_KEY = 'provance.auth.session.v1'

const CRASH_BUFFER_KEY = 'provance.crashReports.v1'

/**
 * Windows that already have global listeners attached (WeakSet so a fresh
 * window in tests re-attaches naturally). Guards React StrictMode double
 * effects and HMR from ever double-wiring the listeners.
 */
const attachedWindows = new WeakSet()

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
    // 'render_error' (boundary) vs 'unhandled_error' (window/rejection listeners).
    type: context.type || 'render_error',
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
 * Flush the buffered crash records to the API (POST /telemetry/errors).
 *
 * Resolves with the records that were successfully shipped (the buffer is
 * cleared on success). On any failure the buffer is kept intact for a later
 * retry and the promise resolves with [] — telemetry never throws, so the
 * caller can fire-and-forget. An empty buffer skips the network call.
 */
export async function flushErrors() {
  const records = getBufferedErrors()
  if (records.length === 0) return []

  try {
    await submitCrashReports(records)
    clearBufferedErrors()
    return records
  } catch {
    // Network or backend failure — keep the buffer; a later flush retries.
    return []
  }
}

/**
 * Handle a window 'error' event. Two flavors arrive here:
 *   - uncaught runtime errors: `event.error` carries the thrown Error
 *   - resource-load failures (img/script/link): no error object, but
 *     `event.target` is the failing element — extract its URL for triage.
 *     Cross-origin scripts arrive as `message === 'Script error.'` with no
 *     details; capture them as-is rather than losing the signal entirely.
 *
 * Purely observational — never calls preventDefault, so the browser's own
 * console reporting is untouched.
 */
function handleWindowError(event) {
  if (event?.error instanceof Error) {
    captureError(event.error, {
      type: 'unhandled_error',
      meta: { source: 'window.onerror' },
    })
    return
  }

  const target = event?.target
  const isResource = target && typeof target === 'object' && typeof target.tagName === 'string'

  captureError(event?.message || (isResource ? 'Resource failed to load' : 'Unknown window error'), {
    type: 'unhandled_error',
    meta: {
      source: 'window.onerror',
      ...(isResource
        ? {
            kind: 'resource',
            resource_tag: String(target.tagName).toLowerCase(),
            resource_url: target.src || target.href || null,
          }
        : {
            filename: event?.filename || null,
            line: event?.lineno ?? null,
            column: event?.colno ?? null,
          }),
    },
  })
}

/** Handle a window 'unhandledrejection' event (reason may be any thrown value). */
function handleUnhandledRejection(event) {
  captureError(event?.reason ?? 'Unhandled promise rejection', {
    type: 'unhandled_error',
    meta: { source: 'unhandledrejection' },
  })
}

/**
 * Attach global capture for non-React runtime errors: uncaught exceptions /
 * script errors (window 'error') and unhandled promise rejections
 * ('unhandledrejection'). The ErrorBoundary already covers render/lifecycle
 * crashes — these listeners cover everything that happens outside the render
 * tree (async code, timers, event handlers, resource loads).
 *
 * Idempotent per window (WeakSet), so React StrictMode double effects and HMR
 * can never double-attach. Never throws — if the window or addEventListener
 * is unavailable the app simply runs without global capture.
 */
export function initGlobalErrorListeners() {
  const target = globalThis.window
  if (!target?.addEventListener || attachedWindows.has(target)) return
  target.addEventListener('error', handleWindowError)
  target.addEventListener('unhandledrejection', handleUnhandledRejection)
  attachedWindows.add(target)
}
