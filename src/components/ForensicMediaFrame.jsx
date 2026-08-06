import { useId } from 'react'

/**
 * ForensicMediaFrame — self-hosted "media under verification" visual.
 *
 * Replaces remote AI-generated image dependencies with a crisp, brand-consistent
 * SVG/CSS composition: a broadcast-style scene, forensic grid, animated scan band,
 * corner brackets, annotation chips, and metadata readouts. Renders at any DPI,
 * works in print, and never depends on an external host.
 */
export default function ForensicMediaFrame({
  label = 'Source media',
  badge = 'Analysis active',
  className = '',
}) {
  const uid = useId().replace(/[:]/g, '')
  const spotId = `ff-spot-${uid}`
  const floorId = `ff-floor-${uid}`
  const beamId = `ff-beam-${uid}`

  return (
    <div
      role="img"
      aria-label={`${label} — ${badge}`}
      className={`relative aspect-[16/9] w-full select-none overflow-hidden rounded-[1.4rem] border border-stone-light/70 bg-charcoal text-parchment ${className}`}
    >
      {/* ── Scene ───────────────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={spotId} cx="50%" cy="28%" r="75%">
            <stop offset="0%" stopColor="#37435f" />
            <stop offset="55%" stopColor="#1c2230" />
            <stop offset="100%" stopColor="#0e1118" />
          </radialGradient>
          <linearGradient id={floorId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#232b3c" />
            <stop offset="100%" stopColor="#0c0f16" />
          </linearGradient>
          <linearGradient id={beamId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b7791f" stopOpacity="0.26" />
            <stop offset="100%" stopColor="#b7791f" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="640" height="360" fill={`url(#${spotId})`} />
        <rect y="252" width="640" height="108" fill={`url(#${floorId})`} />
        <polygon points="320,118 150,360 490,360" fill={`url(#${beamId})`} />

        {/* Speaker silhouette */}
        <g opacity="0.9">
          <ellipse cx="320" cy="152" rx="36" ry="42" fill="#0b0e15" />
          <rect x="283" y="188" width="74" height="84" rx="20" fill="#0b0e15" />
        </g>
        {/* Podium */}
        <rect x="270" y="282" width="100" height="18" rx="5" fill="#161b27" />
        <path d="M272 300 h96 v22 h-96 z" fill="#0b0e15" />
        {/* Stage glow */}
        <ellipse cx="320" cy="252" rx="150" ry="14" fill="#b7791f" opacity="0.12" />
      </svg>

      {/* ── Forensic grid ───────────────────────────────────────────────── */}
      <div className="absolute inset-0 forensic-grid opacity-[0.15]" aria-hidden="true" />

      {/* ── Corner brackets ─────────────────────────────────────────────── */}
      <span className="pointer-events-none absolute left-3 top-3 h-5 w-5 rounded-tl-md border-l-2 border-t-2 border-amber/60" aria-hidden="true" />
      <span className="pointer-events-none absolute right-3 top-3 h-5 w-5 rounded-tr-md border-r-2 border-t-2 border-amber/60" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-amber/60" aria-hidden="true" />
      <span className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-amber/60" aria-hidden="true" />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <span className="truncate font-mono text-[10px] uppercase tracking-[0.2em] text-parchment/75">
          {label}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber/30 bg-amber/15 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-amber-light">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
          {badge}
        </span>
      </div>

      {/* ── Scan band ───────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="forensic-scan-band relative">
          <div className="h-[2px] bg-gradient-to-r from-transparent via-amber to-transparent shadow-[0_0_16px_rgba(183,121,31,0.55)]" />
          <div className="absolute -top-1 left-0 right-0 h-20 bg-gradient-to-b from-amber/10 to-transparent" />
        </div>
      </div>

      {/* ── Annotation chips ────────────────────────────────────────────── */}
      <div className="absolute right-3 top-1/2 hidden -translate-y-1/2 flex-col items-end gap-2 sm:flex" aria-hidden="true">
        <span className="rounded-full border border-white/10 bg-charcoal/75 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-rose-200 backdrop-blur-sm">
          ● Freq. artifacts
        </span>
        <span className="rounded-full border border-white/10 bg-charcoal/75 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-amber-100 backdrop-blur-sm">
          ● Continuity break
        </span>
        <span className="rounded-full border border-white/10 bg-charcoal/75 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] text-emerald-200 backdrop-blur-sm">
          ● Metadata check
        </span>
      </div>

      {/* ── Bottom metadata ─────────────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.16em] text-parchment/55 sm:px-5">
        <span className="truncate">SHA-256 2b7f…91c0 · 1920×1080</span>
        <span className="shrink-0">Frame 042</span>
      </div>
    </div>
  )
}
