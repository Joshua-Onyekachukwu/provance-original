import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import InteractivePanel from './InteractivePanel'
import { sampleAiDetectionResults, sampleReportCover, sampleReportMeta, sampleReportPreviewImage } from '../lib/sampleReportContent.js'

const LUXE = [0.32, 0.72, 0, 1]

/**
 * VerifiedSeal — circular "Verified with Provance" stamp, the brand mark of
 * the report surface. SVG circular text around a charcoal check core; the
 * center disc masks the text seam.
 */
function VerifiedSeal() {
  const circleId = 'provance-seal-circle'
  return (
    <div
      role="img"
      aria-label="Verified with Provance"
      className="relative z-20 grid h-[4.6rem] w-[4.6rem] place-items-center rounded-full bg-parchment shadow-[0_14px_34px_rgba(19,22,29,0.28)] ring-2 ring-amber/70 md:h-20 md:w-20"
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

export default function SampleReport() {
  return (
    <section id="report" className="section-padding bg-parchment relative overflow-hidden">
      <div className="absolute inset-0 forensic-grid opacity-30" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <motion.span
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: LUXE } } }}
            className="eyebrow"
          >
            Sample Report
          </motion.span>
          <motion.h2
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.08, ease: LUXE } } }}
            className="font-serif text-3xl sm:text-4xl lg:text-[3.4rem] lg:leading-[1.05] mt-5 text-balance text-charcoal"
          >
            A report built to be reviewed, shared, and defended.
          </motion.h2>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.18 } } }}
            className="mt-6 text-lg leading-relaxed text-charcoal-mid"
          >
            A glance at what every Provance report contains — a clear verdict,
            the metrics behind it, and the signal-level evidence that holds up
            under review. The full document is one click away.
          </motion.p>
        </motion.div>

        <InteractivePanel className="bezel-shell relative mx-auto max-w-3xl backdrop-blur-xl">
          <div className="absolute -top-8 right-5 md:-top-9 md:right-8">
            <VerifiedSeal />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: LUXE }}
            className="relative z-10"
          >
            <div className="bezel-core overflow-hidden">
              {/* Ink brand band — mirrors the pdfkit cover header */}
              <div className="bg-[#23201A] px-6 py-4 md:px-8 md:py-5">
                <div className="flex items-baseline justify-between gap-4 pr-16 md:pr-20">
                  <div>
                    <p className="font-sans text-lg font-bold uppercase tracking-[0.2em] text-[#F7F4ED] md:text-xl">
                      Provance
                    </p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-[#C9C2B4]">
                      Verification report — sample
                    </p>
                  </div>
                  <p className="hidden font-mono text-[10px] tracking-[0.14em] text-parchment/50 sm:block">
                    {sampleReportMeta.reportId}
                  </p>
                </div>
              </div>

              <div className="p-6 md:p-8">
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

                {/* Footer */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-light pt-4">
                  <p className="font-mono text-[11px] tracking-[0.12em] text-charcoal-light">
                    {sampleReportCover.fileName}
                  </p>
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

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            to="/sample-report/print"
            className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition-all duration-200 hover:bg-charcoal-soft"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0 4-4m-4 4-4-4M5 19.5h14" />
            </svg>
            Download Sample PDF
          </Link>
          <Link
            to="/sample-report"
            className="inline-flex items-center gap-2 rounded-xl border border-stone bg-white-warm px-5 py-3 text-sm font-medium text-charcoal transition-all duration-200 hover:border-charcoal/30"
          >
            View Full Sample Report
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
