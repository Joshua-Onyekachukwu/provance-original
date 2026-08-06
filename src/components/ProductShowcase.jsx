import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import InteractivePanel from './InteractivePanel'
import ForensicMediaFrame from './ForensicMediaFrame'
import { mockReports } from '../lib/mockData.js'

// ---------------------------------------------------------------------------
// Demo dataset — the interactive showcase is driven by a real entry from the
// shared mock dataset, so the "report ready" state renders genuine mock
// payloads (verdict, confidence, report id, per-signal findings) rather than
// hardcoded copy. All visuals remain self-hosted SVG/CSS.
// ---------------------------------------------------------------------------

const DEMO_REPORT =
  mockReports.find((report) => report.verdict === 'suspicious') || mockReports[0]
const DEMO_SIGNALS = DEMO_REPORT.signals.slice(0, 4)

const VERDICT_META = {
  authentic: {
    title: 'Likely authentic',
    chip: 'Authentic',
    chipCls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
    risk: 'Low',
  },
  suspicious: {
    title: 'Requires review',
    chip: 'Signals disagree',
    chipCls: 'border-amber/30 bg-amber/15 text-amber-light',
    risk: 'High',
  },
  inconclusive: {
    title: 'Inconclusive',
    chip: 'Inconclusive',
    chipCls: 'border-white/10 bg-white/5 text-stone',
    risk: 'Review',
  },
}

const PROGRESS_STEPS = [
  'Upload fingerprinted',
  'Signal analysis complete',
  'Confidence assembled',
  'Report packaging',
]

const SCHEDULE = {
  queued: 1100, // time spent in the "queued" state before analysis begins
  signalStep: 850, // gap between each signal resolving
  settle: 950, // gap between the last signal and the "complete" state
}

function signalTone(finding) {
  const text = finding || ''
  if (/(no |verified|consistent|present|normal|match|complete)/i.test(text)) return 'ok'
  if (/(detected|incomplete|anomal|break|signature|located)/i.test(text)) return 'warn'
  return 'neutral'
}

const TONE_BAR = { ok: 'bg-emerald-500', warn: 'bg-amber', neutral: 'bg-amber-light' }
const TONE_LABEL = { ok: 'No anomaly flagged', warn: 'Anomaly flagged', neutral: 'Under review' }

// ---------------------------------------------------------------------------
// In-view detection — fires once when the section enters the viewport.
// Uses a scroll/resize check (getBoundingClientRect) so it works everywhere,
// including embedded previews where IntersectionObserver may not fire.
// ---------------------------------------------------------------------------

function useInViewOnce(ref, offset = 120) {
  const [inView, setInView] = useState(false)
  const firedRef = useRef(false)

  useEffect(() => {
    function check() {
      if (firedRef.current || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight
      if (rect.top < viewportHeight - offset && rect.bottom > offset) {
        firedRef.current = true
        setInView(true)
      }
    }

    check()
    window.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)

    return () => {
      window.removeEventListener('scroll', check)
      window.removeEventListener('resize', check)
    }
  }, [ref, offset])

  return inView
}

// ---------------------------------------------------------------------------
// Scan state machine helpers
// ---------------------------------------------------------------------------

function getSignalState(phase, index, resolvedCount) {
  if (phase === 'complete' || index < resolvedCount) return 'done'
  if (phase === 'analyzing' && index === resolvedCount) return 'resolving'
  return 'pending'
}

function getStepState(phase, index, resolvedCount) {
  if (phase === 'complete') return 'done'
  if (phase === 'queued') return 'queued'
  if (index < resolvedCount) return 'done'
  if (index === resolvedCount) return 'running'
  return 'queued'
}

const PHASE_BADGE = {
  queued: { label: 'In queue', cls: 'border-stone-light bg-parchment text-charcoal-mid' },
  analyzing: { label: 'Analysis active', cls: 'border-amber/20 bg-amber/10 text-amber' },
  complete: { label: 'Report ready', cls: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700' },
}

const FRAME_BADGE = {
  queued: 'Queued',
  analyzing: 'Analyzing',
  complete: 'Report ready',
}

const ASSET_BADGE = {
  queued: 'In queue',
  analyzing: 'In review',
  complete: 'Verified',
}

// ---------------------------------------------------------------------------
// Signal row — clickable bar that expands per-signal evidence
// ---------------------------------------------------------------------------

function SignalRow({ signal, index, state, expanded, onToggle }) {
  const tone = signalTone(signal.finding)
  const isPending = state === 'pending'
  const isResolving = state === 'resolving'
  const isDone = state === 'done'
  const canOpen = isDone || isResolving

  return (
    <div className="rounded-2xl border border-stone-light/70 bg-white-warm/70 p-3 transition-colors hover:border-amber/25">
      <button
        type="button"
        onClick={() => canOpen && onToggle(index)}
        disabled={isPending}
        aria-expanded={expanded}
        aria-controls={`demo-signal-${index}`}
        className={`ui-focus-ring block w-full text-left focus:outline-none ${
          isPending ? 'cursor-default opacity-75' : 'cursor-pointer'
        }`}
      >
        <span className="flex items-center justify-between gap-3 text-sm">
          <span className="min-w-0">
            <span className="block truncate font-medium text-charcoal">{signal.label}</span>
            <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
              {signal.model}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {isPending && (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                Queued
              </span>
            )}
            {isResolving && (
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
                Resolving
              </span>
            )}
            {isDone && (
              <span className="font-mono text-xs tabular-nums text-charcoal-mid">
                {signal.confidence}%
              </span>
            )}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={`h-3.5 w-3.5 text-charcoal-light transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              } ${isPending ? 'opacity-40' : ''}`}
            >
              <path d="m6 8 4 4 4-4" />
            </svg>
          </span>
        </span>

        <span className="mt-2.5 block h-2 overflow-hidden rounded-full bg-stone-light/70">
          <motion.span
            initial={{ width: '0%' }}
            animate={{ width: isPending ? '0%' : `${signal.confidence}%` }}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
            className={`block h-2 rounded-full ${
              isDone ? TONE_BAR[tone] : isResolving ? 'bg-amber' : 'bg-stone-300'
            } ${isResolving ? 'demo-signal-pulse' : ''}`}
          />
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`demo-signal-${index}`}
            role="region"
            aria-label={`${signal.label} evidence`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-xl border border-stone-light/70 bg-parchment/80 px-3.5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${tone === 'warn' ? 'border-amber/25 bg-amber/10 text-amber' : 'border-stone-light bg-white-warm text-charcoal-mid'}`}>
                  ● {TONE_LABEL[tone]}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                  {signal.model}
                </span>
              </div>
              <p className="mt-2.5 text-sm leading-relaxed text-charcoal-mid">
                {signal.finding || 'Evidence resolving across this layer.'}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                  Layer confidence
                </span>
                <span className="font-mono text-xs tabular-nums text-charcoal">
                  {signal.confidence}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Progress log
// ---------------------------------------------------------------------------

function ProgressLog({ phase, resolvedCount }) {
  const total = PROGRESS_STEPS.length
  // Derive the count from the actual step states so it can never mismatch the
  // visible rows (e.g. when the demo report has fewer signals than steps).
  const doneCount = PROGRESS_STEPS.filter(
    (_, index) => getStepState(phase, index, resolvedCount) === 'done',
  ).length

  return (
    <div className="rounded-2xl border border-stone-light/70 bg-parchment/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
          Progress log
        </span>
        <span
          className={`font-mono text-[11px] ${
            phase === 'complete' ? 'text-emerald-700' : 'text-charcoal-mid'
          }`}
        >
          {phase === 'queued'
            ? 'Awaiting slot'
            : `${doneCount} / ${total} complete`}
        </span>
      </div>
      <div className="space-y-2">
        {PROGRESS_STEPS.map((label, index) => {
          const state = getStepState(phase, index, resolvedCount)
          return (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-light/70 bg-white-warm/80 px-3 py-2"
            >
              <span
                className={`text-sm ${
                  state === 'queued' ? 'text-charcoal-light' : 'text-charcoal-mid'
                }`}
              >
                {label}
              </span>
              {state === 'done' && (
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-700">
                  Done
                </span>
              )}
              {state === 'running' && (
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-amber">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber" />
                  Running
                </span>
              )}
              {state === 'queued' && (
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                  Queued
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result details (dark card, right column)
// ---------------------------------------------------------------------------

function ResultDetails({ phase, resolvedCount }) {
  const meta = VERDICT_META[DEMO_REPORT.verdict] || VERDICT_META.inconclusive
  const agreement = Math.round(
    (DEMO_SIGNALS.filter((signal) => signalTone(signal.finding) === 'ok').length /
      DEMO_SIGNALS.length) *
      100,
  )
  const avgConfidence = Math.round(
    DEMO_SIGNALS.reduce((sum, signal) => sum + signal.confidence, 0) / DEMO_SIGNALS.length,
  )

  const rows =
    phase === 'complete'
      ? [
          ['Authenticity score', `${DEMO_REPORT.confidence_score} / 100`],
          ['AI confidence', `${avgConfidence}%`],
          ['Signal agreement', `${agreement}%`],
          ['Verification status', meta.title],
          ['Risk level', meta.risk],
          ['Report ID', DEMO_REPORT.report_id],
        ]
      : [
          ['Authenticity score', phase === 'analyzing' ? 'Resolving…' : '—'],
          ['AI confidence', phase === 'analyzing' ? `${Math.round((resolvedCount / DEMO_SIGNALS.length) * 100)}%` : '—'],
          ['Signal agreement', '—'],
          ['Verification status', phase === 'analyzing' ? 'Signals in flight' : 'Queued'],
          ['Risk level', '—'],
          ['Report ID', phase === 'analyzing' ? 'Assembling…' : '—'],
        ]

  return (
    <div className="rounded-[1.5rem] border border-stone-light/80 bg-charcoal p-5 text-parchment shadow-[0_24px_55px_rgba(26,26,26,0.18)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
            Result details
          </p>
          <h4 className="mt-2 font-serif text-2xl text-parchment">
            {phase === 'queued' && 'Awaiting analysis'}
            {phase === 'analyzing' && 'Analysis in progress'}
            {phase === 'complete' && meta.title}
          </h4>
        </div>
        <span
          aria-live="polite"
          className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] ${
            phase === 'complete' ? meta.chipCls : 'border-white/10 bg-white/5 text-stone'
          }`}
        >
          {phase === 'queued' && 'Queued'}
          {phase === 'analyzing' && `Resolved ${resolvedCount}/${DEMO_SIGNALS.length}`}
          {phase === 'complete' && meta.chip}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-stone">
        {phase === 'complete' &&
          'Provance keeps the verdict, confidence, metadata summary, and key findings together so the user sees what happened and why.'}
        {phase === 'analyzing' &&
          'Signals are resolving across the file. The verdict, confidence, and report id assemble as each layer reports back.'}
        {phase === 'queued' &&
          'The file is waiting for an analysis slot in the verification pipeline.'}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">{label}</p>
            <p
              className={`mt-2 truncate text-sm ${
                phase === 'complete' ? 'text-parchment' : 'text-parchment/60'
              }`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Key findings (right column, bottom card)
// ---------------------------------------------------------------------------

function FindingsPanel({ phase }) {
  const findings = DEMO_SIGNALS.map((signal) => {
    const tone = signalTone(signal.finding)
    return {
      label: signal.label,
      note: signal.finding || 'Finding resolving…',
      tone,
    }
  })

  return (
    <div className="rounded-[1.5rem] border border-stone-light/80 bg-white-warm/88 p-5 shadow-[0_18px_40px_rgba(26,26,26,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
            Key findings
          </p>
          <h4 className="mt-2 font-serif text-xl text-charcoal">
            {phase === 'complete'
              ? 'Evidence ready for report output.'
              : phase === 'analyzing'
                ? 'Findings resolving across signals.'
                : 'Findings appear after analysis.'}
          </h4>
        </div>
        <span className="rounded-full border border-stone-light bg-parchment px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
          {phase === 'complete'
            ? `${findings.filter((f) => f.tone === 'warn').length} flagged`
            : '—'}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        {findings.map((finding) => (
          <div key={finding.label} className="rounded-2xl border border-stone-light/70 bg-parchment/80 p-3">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_BAR[finding.tone]}`} />
              {finding.label}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">{finding.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main showcase
// ---------------------------------------------------------------------------

export default function ProductShowcase() {
  const sectionRef = useRef(null)
  const inView = useInViewOnce(sectionRef)
  const autoStartedRef = useRef(false)

  const [phase, setPhase] = useState('idle')
  const [resolvedCount, setResolvedCount] = useState(0)
  const [expandedSignal, setExpandedSignal] = useState(null)
  const [runId, setRunId] = useState(0)

  // Auto-start the scan cycle when the section scrolls into view.
  useEffect(() => {
    if (inView && !autoStartedRef.current) {
      autoStartedRef.current = true
      setRunId((current) => current + 1)
    }
  }, [inView])

  // Run the cycle: queued → analyzing (signals resolve one by one) → complete.
  useEffect(() => {
    if (runId === 0) return

    setPhase('queued')
    setResolvedCount(0)
    setExpandedSignal(null)

    const timers = []
    const at = (delay, fn) => timers.push(window.setTimeout(fn, delay))

    at(SCHEDULE.queued, () => setPhase('analyzing'))
    DEMO_SIGNALS.forEach((_, index) => {
      at(SCHEDULE.queued + (index + 1) * SCHEDULE.signalStep, () =>
        setResolvedCount(index + 1),
      )
    })
    at(
      SCHEDULE.queued + DEMO_SIGNALS.length * SCHEDULE.signalStep + SCHEDULE.settle,
      () => setPhase('complete'),
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [runId])

  const activePhase = phase === 'idle' ? 'queued' : phase
  const badge = PHASE_BADGE[activePhase]
  const isRunning = phase === 'queued' || phase === 'analyzing'

  function toggleSignal(index) {
    setExpandedSignal((current) => (current === index ? null : index))
  }

  function replay() {
    setRunId((current) => current + 1)
  }

  const stepIndex = phase === 'complete' ? 2 : phase === 'analyzing' ? 1 : 0
  const steps = [
    ['Upload', 'Image or video enters the workspace'],
    ['Analysis', 'Signals, metadata, and confidence resolve'],
    ['Details', 'The result becomes a report-ready output'],
  ]

  return (
    <section
      ref={sectionRef}
      className="relative bg-parchment-light px-6 pb-20 pt-6 md:px-8 md:pb-24 lg:pb-28"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,119,6,0.08),transparent_36%)]" />
      <div className="content-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-3 rounded-full border border-amber/20 bg-white-warm/75 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-amber shadow-[0_18px_45px_rgba(26,26,26,0.05)]">
            Live Product Preview
          </span>
          <h2 className="mt-5 font-serif text-3xl text-charcoal sm:text-4xl lg:text-5xl">
            Watch a scan move from queue to report.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-charcoal-mid">
            The demo runs the real verification flow — the file queues, signals
            resolve one by one, and a report is assembled. Click any resolved
            signal to inspect its evidence.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
          <InteractivePanel className="rounded-[2rem] border border-stone-light/80 bg-white-warm/85 shadow-[0_28px_80px_rgba(26,26,26,0.12)] backdrop-blur-xl">
            <div className="relative z-10 p-5 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-light/90 pb-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                    Verification Workspace
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-charcoal">
                    Upload. analyze. inspect details.
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <span className="rounded-full border border-stone-light bg-parchment px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                    Image + video
                  </span>
                  <button
                    type="button"
                    onClick={replay}
                    disabled={isRunning}
                    className="ui-focus-ring inline-flex items-center gap-1.5 rounded-full border border-charcoal/15 bg-white-warm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal transition hover:border-charcoal/35 hover:bg-parchment disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M16 10a6 6 0 1 1-1.8-4.2" />
                      <path d="M16 3v3.5h-3.5" />
                    </svg>
                    {isRunning ? 'Running' : phase === 'idle' ? 'Run demo' : 'Replay'}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_0.95fr_0.9fr]">
                {/* Uploaded asset */}
                <div className="space-y-5 xl:col-span-1">
                  <div className="rounded-[1.5rem] border border-stone-light/80 bg-parchment/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                          Uploaded asset
                        </p>
                        <p className="mt-2 truncate text-sm text-charcoal-mid">
                          `press-briefing-source-clip.mp4`
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] ${
                          phase === 'complete'
                            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700'
                            : 'border-amber/20 bg-amber/10 text-amber'
                        }`}
                      >
                        {ASSET_BADGE[activePhase]}
                      </span>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-stone-light/70 bg-charcoal">
                      <ForensicMediaFrame
                        label="Uploaded asset"
                        badge={FRAME_BADGE[activePhase]}
                        className="rounded-[1.1rem] border-0"
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ['File type', 'Video with audio'],
                        ['Duration', '00:42'],
                        ['Resolution', '1920 × 1080'],
                        ['Submitted by', 'Early-access user'],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-stone-light/80 bg-white-warm/90 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(26,26,26,0.08)]"
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                            {label}
                          </p>
                          <p className="mt-2 text-lg font-medium text-charcoal">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Analysis run with clickable signals */}
                <div className="space-y-5 xl:col-span-1">
                  <div className="rounded-[1.5rem] border border-stone-light/80 bg-white-warm/88 p-4 shadow-[0_18px_40px_rgba(26,26,26,0.06)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                          Analysis run
                        </p>
                        <h4 className="mt-2 font-serif text-xl text-charcoal">
                          {phase === 'complete'
                            ? 'All signals resolved.'
                            : phase === 'analyzing'
                              ? 'Signals resolving across the file.'
                              : 'Queued for the analysis pipeline.'}
                        </h4>
                      </div>
                      <span className="rounded-full border border-stone-light px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                        {phase === 'complete'
                          ? `${DEMO_SIGNALS.length} signals resolved`
                          : `${DEMO_SIGNALS.length} checks`}
                      </span>
                    </div>
                    <div className="mt-5 space-y-3">
                      {DEMO_SIGNALS.map((signal, index) => {
                        const state = getSignalState(phase, index, resolvedCount)
                        const isExpanded = expandedSignal === index

                        return (
                          <SignalRow
                            key={signal.model}
                            signal={signal}
                            index={index}
                            state={state}
                            expanded={isExpanded}
                            onToggle={toggleSignal}
                          />
                        )
                      })}
                    </div>
                    <div className="mt-5">
                      <ProgressLog phase={phase} resolvedCount={resolvedCount} />
                    </div>
                  </div>
                </div>

                {/* Result details + key findings */}
                <div className="space-y-5 xl:col-span-1">
                  <ResultDetails phase={phase} resolvedCount={resolvedCount} />
                  <FindingsPanel phase={phase} />
                </div>
              </div>
            </div>
          </InteractivePanel>

          <div className="space-y-6">
            <InteractivePanel className="rounded-[1.75rem] border border-stone-light/80 bg-white-warm/85 shadow-[0_24px_60px_rgba(26,26,26,0.1)] backdrop-blur-xl">
              <div className="relative z-10 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                  What this preview shows
                </p>
                <h3 className="mt-3 font-serif text-2xl text-charcoal">From file to findings.</h3>
                <div className="mt-5 space-y-3">
                  {steps.map(([label, value], index) => {
                    const isActive = index === stepIndex
                    const isPast = index < stepIndex
                    return (
                      <div
                        key={label}
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all duration-500 ${
                          isActive
                            ? 'border-amber/30 bg-amber/[0.06]'
                            : 'border-stone-light/70 bg-parchment/70'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isPast
                                ? 'bg-emerald-500'
                                : isActive
                                  ? 'animate-pulse bg-amber'
                                  : 'bg-stone-300'
                            }`}
                          />
                          <span
                            className={`font-mono text-[10px] uppercase tracking-[0.16em] ${
                              isActive ? 'text-amber' : 'text-charcoal-light'
                            }`}
                          >
                            {label}
                          </span>
                        </span>
                        <span className="max-w-[180px] text-right text-sm text-charcoal">
                          {value}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </InteractivePanel>

            <InteractivePanel className="rounded-[1.75rem] border border-stone-light/80 bg-charcoal shadow-[0_24px_60px_rgba(26,26,26,0.18)]">
              <div className="relative z-10 p-5 text-parchment">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                  Report output
                </p>
                <h3 className="mt-3 font-serif text-2xl">Shareable by design.</h3>
                <p className="mt-4 text-sm leading-relaxed text-stone">
                  Exported outputs keep the verdict, evidence summary, metadata,
                  timeline, and fingerprint reference together so the reasoning survives
                  beyond the app screen.
                </p>
                <div className="mt-5 space-y-2">
                  {['PDF report', 'Case link', 'Timeline', 'Evidence appendix'].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-stone"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </InteractivePanel>
          </div>
        </div>
      </div>
    </section>
  )
}
