/**
 * sessionTrust.js — per-session 'New device' trust signal.
 *
 * Mirrors SecurityService.listSessions (backend/src/security/) so the mock
 * layer and the real API agree on the badge contract. A session is badged
 * 'New device' when its device's FIRST appearance in the user's session
 * ledger is recent (within NEW_DEVICE_WINDOW_DAYS) — i.e. the device is new
 * to the account. Devices without a meaningful label (empty or the DB
 * 'Unknown device' default) never badge.
 *
 * The Security page (activeSessions) and the org member-sessions drawer both
 * consume sessions with an isNewDevice flag; the mock recomputes the flags
 * on every call (rows are mutable), matching the backend's live computation.
 */

export const NEW_DEVICE_WINDOW_DAYS = 7

/** A device label meaningful enough to badge — never the 'Unknown device' default. */
export function isMeaningfulDevice(device) {
  const trimmed = String(device ?? '').trim()
  return trimmed !== '' && trimmed !== 'Unknown device'
}

/**
 * Returns a Map<sessionId, isNewDevice> for the given sessions. Each row's
 * timestamp uses createdAt ?? created_at ?? lastActiveAt (the mock rows carry
 * lastActiveAt; the backend view carries createdAt/lastActiveAt). Rows
 * without a parseable timestamp are left unflagged.
 *
 * `now` defaults to the wall clock (backend parity). The mock passes the
 * fixture clock (mockData NOW_TS) so the badge demo is deterministic — the
 * mock rows are baked relative to that clock, not today's date.
 */
export function computeNewDeviceFlags(sessions, now = Date.now()) {
  const flags = new Map()
  if (!Array.isArray(sessions)) return flags

  const deviceFirstSeen = new Map()
  const cutoff = now - NEW_DEVICE_WINDOW_DAYS * 86_400_000

  for (const session of sessions) {
    if (!isMeaningfulDevice(session.device)) continue
    const time = new Date(
      session.createdAt ?? session.created_at ?? session.lastActiveAt,
    ).getTime()
    if (Number.isNaN(time)) continue
    const known = deviceFirstSeen.get(session.device)
    if (known === undefined || time < known) deviceFirstSeen.set(session.device, time)
  }

  for (const session of sessions) {
    const firstSeen = deviceFirstSeen.get(session.device)
    flags.set(session.id, Boolean(firstSeen !== undefined && firstSeen >= cutoff))
  }

  return flags
}
