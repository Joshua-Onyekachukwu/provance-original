const TONES = {
  neutral: 'bg-parchment text-charcoal-mid border-stone-light',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
  info: 'bg-sky-50 text-sky-700 border-sky-200/70',
  warning: 'bg-amber-50 text-amber-700 border-amber-200/70',
  danger: 'bg-rose-50 text-rose-700 border-rose-200/70',
}

// The status dot is the tone's color accent, so the verdict-mapped tones
// reference the palette CSS vars (VERDICT_PALETTE / applyVerdictPalette in
// scanPresentation.js) — the dot matches the exact chart hex, not a
// re-declared Tailwind shade. The pastel chip bg/border/text stay on the
// Tailwind scale for readable contrast on tiny text.
const DOT_COLORS = {
  neutral: 'bg-charcoal-light',
  success: 'bg-(--color-tone-success)',
  info: 'bg-(--color-tone-info)',
  warning: 'bg-(--color-tone-warning)',
  danger: 'bg-rose-500',
}

const SIZES = {
  sm: 'px-2 py-0.5 text-[9px] gap-1',
  md: 'px-2.5 py-1 text-[10px] gap-1.5',
}

/**
 * Badge — semantic status chip per the UNIFIED design system.
 *
 * Props:
 *   tone    — 'neutral' | 'success' | 'info' | 'warning' | 'danger'
 *   dot     — show a leading status dot
 *   size    — 'sm' | 'md'
 */
export default function Badge({ tone = 'neutral', dot = false, size = 'md', className = '', title, children }) {
  return (
    <span
      title={title || undefined}
      className={`inline-flex items-center rounded-full border font-mono font-medium uppercase tracking-[0.16em] ${SIZES[size]} ${TONES[tone] || TONES.neutral} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[tone] || DOT_COLORS.neutral}`} aria-hidden="true" />}
      {children}
    </span>
  )
}
