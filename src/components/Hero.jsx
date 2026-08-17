import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'

const LUXE = [0.32, 0.72, 0, 1]

// Same case as the Sample Report section below the fold — the hero examines
// the exact media whose printed case file the visitor scrolls to next.
// (Deliberately mirrors src/components/SampleReport.jsx reportPreview.)
const reportPreview =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=close-up%20documentary%20frame%20of%20a%20speaker%20at%20a%20lectern%2C%20professional%20broadcast%20still%2C%20subtle%20newsroom%20lighting%2C%20realistic%20face%2C%20high%20detail%2C%20editorial%20photography&image_size=landscape_16_9'

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.85, delay: 0.12 * i, ease: LUXE },
  }),
}

const signalRows = [
  { label: 'Authenticity', value: '31 / 100', lit: 2 },
  { label: 'AI confidence', value: '94.7%', lit: 5 },
]

const checkpoints = [
  { t: '00:00', label: 'Upload · fingerprint recorded', flag: false },
  { t: '00:08', label: 'Frequency & noise analysis', flag: false },
  { t: '00:17', label: 'Metadata mismatch flagged', flag: true },
  { t: '00:24', label: 'Report assembled', flag: true },
]

function SignalBar({ lit }) {
  return (
    <span className="flex items-end gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm ${i < lit ? 'bg-phosphor/85' : 'bg-phosphor/15'}`}
          style={{ height: `${5 + (i % 3) * 3}px` }}
        />
      ))}
    </span>
  )
}

// Corner crop marks — the "frame the evidence" brackets lab techs use.
function CropMarks() {
  const base = 'absolute h-4 w-4 border-phosphor/45'
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-2">
      <span className={`${base} left-0 top-0 border-l-2 border-t-2`} />
      <span className={`${base} right-0 top-0 border-r-2 border-t-2`} />
      <span className={`${base} bottom-0 left-0 border-b-2 border-l-2`} />
      <span className={`${base} bottom-0 right-0 border-b-2 border-r-2`} />
    </div>
  )
}

export default function Hero() {
  // The scan band + LED pulses are decorative loops — under prefers-reduced-motion
  // they render static (the animation lives in the no-preference block), while
  // the one-shot stagger entrance still runs (short opacity/translate).
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-ink pt-24 text-phosphor md:pt-28 lg:pt-32">
      <div className="absolute inset-0 instrument-grid opacity-60" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 78% 16%, rgba(47,91,234,0.16), transparent 44%), radial-gradient(circle at 8% 88%, rgba(245,158,11,0.07), transparent 42%)',
        }}
      />

      <div className="content-container relative z-10 grid grid-cols-1 items-center gap-14 px-6 pb-20 pt-10 md:px-8 md:pb-24 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:pb-28">
        {/* ── Claim ─────────────────────────────────────────────────────── */}
        <div className="max-w-2xl">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-phosphor/10 bg-phosphor/[0.05] px-3.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.22em] text-phosphor-dim">
              <span
                aria-hidden="true"
                className="demo-signal-pulse h-1.5 w-1.5 rounded-full bg-(--color-verdict-authentic)"
              />
              System ready · Image + video analysis
            </div>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={1}
            className="mt-8 font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.03em] text-balance text-phosphor sm:text-5xl lg:text-6xl xl:text-[4.4rem] xl:leading-[0.98]"
          >
            Every image leaves a trace. We find it — and show you why.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
            className="mt-7 max-w-xl text-lg leading-relaxed text-pretty text-phosphor-dim"
          >
            Provance examines images and video for signs of AI generation and manipulation —
            then hands you a case file you can defend: verdict, findings, metadata, and the
            reasoning behind them.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={3}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link to="/waitlist" className="btn-primary group min-w-[11rem]">
              Join Early Access
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-luxe group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
            <Link
              to="/sample-report"
              className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-phosphor/15 bg-phosphor/[0.04] px-6 py-3 text-[0.92rem] font-bold text-phosphor transition-all duration-500 ease-luxe hover:border-phosphor/35 hover:bg-phosphor/[0.09] active:scale-[0.97]"
            >
              See a sample report
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-phosphor/10 transition-transform duration-500 ease-luxe group-hover:translate-x-0.5"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={4}
            className="mt-12 flex flex-wrap gap-2.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-phosphor-faint"
          >
            {['Explainable evidence', 'Professional reports', 'Enterprise workflows'].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-phosphor/10 bg-phosphor/[0.03] px-3.5 py-2"
              >
                {chip}
              </span>
            ))}
          </motion.div>

          <motion.a
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={5}
            href="#why"
            className="mt-10 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-phosphor-faint transition-colors duration-500 ease-luxe hover:text-phosphor"
          >
            See why teams choose Provance
            <span aria-hidden="true" className="text-phosphor-dim transition-transform duration-500 ease-luxe group-hover:translate-y-0.5">
              ↓
            </span>
          </motion.a>
        </div>

        {/* ── The examination instrument (signature) ────────────────────── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mx-auto w-full max-w-xl lg:max-w-none"
        >
          <div className="bezel-shell-dark">
            <div className="bezel-core-dark p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3 px-1.5 pb-3 pt-1 font-mono text-[0.6rem] uppercase tracking-[0.2em]">
                <span className="inline-flex items-center gap-2 text-phosphor-dim">
                  <span
                    aria-hidden="true"
                    className="demo-signal-pulse h-1.5 w-1.5 rounded-full bg-(--color-verdict-suspicious)"
                  />
                  Case PV-A3F8C2-D4
                </span>
                <span className="text-phosphor-faint">Examination complete</span>
              </div>

              <div className="relative overflow-hidden rounded-[1.35rem] border border-phosphor/10 bg-ink-panel">
                <img
                  src={reportPreview}
                  alt="Broadcast still under forensic examination"
                  className="aspect-[16/10] w-full object-cover"
                  loading="eager"
                  decoding="async"
                />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 instrument-grid opacity-60" />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-ink/25"
                />
                <div aria-hidden="true" className="forensic-scan-band pointer-events-none absolute inset-x-0 top-0">
                  <div className="h-full border-y border-phosphor/30 bg-gradient-to-b from-phosphor/[0.08] via-phosphor/[0.02] to-phosphor/[0.08]" />
                </div>
                <CropMarks />
                <div
                  aria-hidden="true"
                  className="absolute left-[54%] top-[13%] h-[34%] w-[21%] border border-[var(--color-verdict-suspicious)]/70 shadow-[0_0_20px_rgba(245,158,11,0.16)]"
                >
                  <span className="absolute -top-2.5 left-0 rounded-sm bg-(--color-verdict-suspicious) px-1.5 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-ink">
                    Zone B2
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-phosphor-faint">
                <span className="min-w-0 truncate">Source briefing-room-source-clip.mp4</span>
                <span className="shrink-0">Video + audio</span>
              </div>

              <div className="mt-4 space-y-2.5">
                {signalRows.map((row, i) => (
                  <motion.div
                    key={row.label}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.55 + i * 0.14, ease: LUXE }}
                    className="flex items-center justify-between gap-4 rounded-xl border border-phosphor/8 bg-ink-raise/70 px-3.5 py-2.5"
                  >
                    <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-phosphor-faint">
                      {row.label}
                    </span>
                    <span className="flex items-center gap-3">
                      <SignalBar lit={row.lit} />
                      <span className="font-mono text-xs text-phosphor">{row.value}</span>
                    </span>
                  </motion.div>
                ))}

                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.83, ease: LUXE }}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-verdict-suspicious)]/35 bg-[var(--color-verdict-suspicious)]/[0.07] px-3.5 py-2.5"
                >
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-phosphor-faint">
                    Verdict
                  </span>
                  <span className="flex items-center gap-2 font-mono text-xs" style={{ color: 'var(--color-verdict-suspicious)' }}>
                    <span aria-hidden="true" className="demo-signal-pulse h-1.5 w-1.5 rounded-full bg-(--color-verdict-suspicious)" />
                    Suspicious — requires review
                  </span>
                </motion.div>
              </div>

              <div className="px-1 pt-2.5 font-mono text-[0.58rem] leading-relaxed tracking-[0.08em] text-phosphor-faint">
                SHA-256 2b7f91c0b6cc…0e114d91 · report ready for review
              </div>

              <div className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-phosphor/8 pt-3.5">
                {checkpoints.map((c) => (
                  <div key={c.t} className="flex min-w-0 items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.14em]">
                    <span
                      aria-hidden="true"
                      className={`h-1 w-1 shrink-0 rounded-full ${
                        c.flag ? 'bg-(--color-verdict-suspicious)' : 'bg-(--color-verdict-authentic)'
                      }`}
                    />
                    <span className="shrink-0 text-phosphor-dim">{c.t}</span>
                    <span className="truncate text-phosphor-faint">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
