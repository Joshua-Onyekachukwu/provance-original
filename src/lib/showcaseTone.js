/**
 * showcaseTone.js — per-signal tone derivation for the landing ProductShowcase
 * (and anywhere the demo verdict story renders). A finding's phrasing decides
 * whether its signal reads ok / warn / neutral, driving the tone dot, the
 * progress-bar color, the "N flagged" count, and the signal-agreement metric —
 * so the matcher must be unambiguous:
 *
 *   - "Metadata chain incomplete" must NOT match the ok token "complete"
 *     (word-boundary guards: \bno , \bmatch\b, \bcomplete\b).
 *   - "No anomaly detected" must still win as ok ("no X detected" phrasing),
 *     so ok is checked before warn.
 */
export const TONE_BAR = { ok: 'bg-emerald-500', warn: 'bg-amber', neutral: 'bg-amber-light' }
export const TONE_LABEL = { ok: 'No anomaly flagged', warn: 'Anomaly flagged', neutral: 'Under review' }

export function signalTone(finding) {
  const text = finding || ''
  // ok only when phrased as a clean bill of health: "no anomaly/issue/sign…"
  // (never a bare "no …" — "No trusted credential located" is an anomaly),
  // or an explicit verified/consistent/present/normal/match/complete.
  if (
    /(\bno (anomal\w*|issue\w*|problem\w*|sign\w*|artifact\w*|discrepan\w*)|verified|consistent|present|normal|\bmatch\b|\bcomplete\b)/i.test(
      text,
    )
  ) {
    return 'ok'
  }
  if (/(detected|incomplete|anomal|break|signature|located)/i.test(text)) return 'warn'
  return 'neutral'
}
