import { useId } from 'react'

/**
 * VerifiedSeal — the circular "Verified with Provance" stamp, the brand mark
 * of every Provance report surface. Shared by the landing sample card, the
 * full report document cover, and mirrored in the pdfkit export
 * (backend/src/reports/report-pdf.ts renders the same geometry).
 *
 * SVG circular text around a charcoal check core; the center disc masks the
 * text seam. `useId` keeps the textPath id unique when several seals render
 * on one page.
 */
export default function VerifiedSeal({ className = '' }) {
  const circleId = useId()

  return (
    <div
      role="img"
      aria-label="Verified with Provance"
      className={`relative grid place-items-center rounded-full bg-parchment shadow-[0_14px_34px_rgba(19,22,29,0.28)] ring-2 ring-amber/70 ${className}`}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <path id={circleId} d="M50,50 m-33,0 a33,33 0 1,1 66,0 a33,33 0 1,1 -66,0" fill="none" />
        </defs>
        <text
          style={{ fill: '#13161d', fontSize: '6.6px', letterSpacing: '1.6px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}
        >
          <textPath href={`#${circleId}`} startOffset="2%">
            VERIFIED WITH PROVANCE • VERIFIED WITH PROVANCE •
          </textPath>
        </text>
      </svg>
      <div className="grid h-9 w-9 place-items-center rounded-full bg-charcoal shadow-inner">
        <svg className="h-5 w-5 text-amber-glow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
    </div>
  )
}
