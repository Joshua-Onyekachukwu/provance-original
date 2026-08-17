import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import InteractivePanel from './InteractivePanel'
import VerifiedSeal from './VerifiedSeal'
import { sampleAiDetectionResults, sampleReportCover, sampleReportMeta, sampleReportPreviewImage } from '../lib/sampleReportContent.js'

const LUXE = [0.32, 0.72, 0, 1]

function MetricPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-light bg-parchment/70 px-3 py-3 text-center md:px-4">
      <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-charcoal-light">{label}</div>
      <div className="mt-1.5 font-serif text-xl leading-none text-charcoal md:text-2xl">{value}</div>
    </div>
  )
}

function SignalRow({ item }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-stone-light bg-white-warm/92 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-charcoal">{item.label}</p>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-charcoal-light">{item.status}</p>
      </div>
      <p className="shrink-0 font-mono text-sm text-charcoal">{item.score}</p>
    </div>
  )
}

/**
 * ReportSummaryCard — the compact "case-file at a glance" report card shared
 * by the landing Sample Report section and the /product report showcase, so
 * both marketing surfaces speak the same visual language: circular Verified
 * with Provance seal, ink brand band, verdict + three headline metrics, the
 * media frame next to the top key signals, and a footer linking to the full
 * document. Extra content (depth chooser, includes grid) slots in via children.
 */
export default function ReportSummaryCard({ children }) {
  return (
    <div className="relative mx-auto max-w-5xl">
      {/* Seal sits outside the tilt panel (which clips) so the full circle
          is always visible, overlapping the report's top-right corner. */}
      <div className="absolute -top-8 right-4 z-30 md:-top-9 md:right-10">
        <VerifiedSeal className="h-[4.6rem] w-[4.6rem] md:h-20 md:w-20" />
      </div>

      <InteractivePanel className="bezel-shell backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.8, ease: LUXE }}
          className="relative z-10"
        >
          <div className="bezel-core overflow-hidden">
            {/* Ink brand band — mirrors the pdfkit cover header */}
            <div className="bg-[#23201A] px-6 py-4 md:px-10 md:py-5">
              <p className="font-sans text-lg font-bold uppercase tracking-[0.2em] text-[#F7F4ED] md:text-xl">
                Provance
              </p>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-[#C9C2B4]">
                Verification report — sample
              </p>
            </div>

            <div className="p-6 md:p-8 lg:p-10">
              {/* Verdict */}
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div className="max-w-md">
                  <div className="h-1.5 w-16 rounded-full bg-(--color-tone-warning)" />
                  <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.22em] text-charcoal-light">
                    Overall verdict
                  </p>
                  <h3 className="mt-2 font-serif text-3xl leading-tight text-charcoal md:text-4xl">
                    {sampleReportCover.verdict}
                  </h3>
                </div>
                <div className="grid w-full grid-cols-3 gap-3 sm:w-auto">
                  <MetricPill label="Confidence" value={sampleReportCover.confidenceScore} />
                  <MetricPill label="Authenticity" value={sampleReportCover.authenticityScore} />
                  <MetricPill label="Risk" value={sampleReportCover.riskLevel} />
                </div>
              </div>

              {/* Media + signal evidence */}
              <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-[0.9fr_1.1fr]">
                <div className="relative overflow-hidden rounded-2xl border border-stone-light bg-charcoal">
                  <img
                    src={sampleReportPreviewImage}
                    alt="Representative frame from the analyzed sample media."
                    className="aspect-[16/9] h-full w-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-charcoal/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-parchment backdrop-blur">
                    Sample media
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-charcoal-light">
                    Key signals
                  </p>
                  {sampleAiDetectionResults.slice(0, 3).map((item) => (
                    <SignalRow key={item.label} item={item} />
                  ))}
                </div>
              </div>

              {children}

              {/* Footer */}
              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-stone-light pt-5">
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11px] tracking-[0.12em] text-charcoal-light">
                    {sampleReportCover.fileName}
                  </p>
                  <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-charcoal-light/80">
                    {sampleReportMeta.reportId} · {sampleReportCover.mediaType}
                  </p>
                </div>
                <Link
                  to="/sample-report"
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-charcoal transition-colors hover:text-trust"
                >
                  See the full report
                  <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14m0 0-6-6m6 6-6 6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </InteractivePanel>
    </div>
  )
}
