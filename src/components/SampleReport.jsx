import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import ReportSummaryCard from './ReportSummaryCard'

const LUXE = [0.32, 0.72, 0, 1]

function IncludeChip({ label, detail }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-stone-light bg-parchment/50 px-3.5 py-3">
      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-charcoal">{label}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-charcoal-mid">{detail}</p>
      </div>
    </div>
  )
}

const REPORT_INCLUDES = [
  { label: 'AI detection signals', detail: 'Per-signal scores with plain-language reasoning' },
  { label: 'Manipulation indicators', detail: 'Temporal, compression, and continuity checks' },
  { label: 'Metadata & provenance', detail: 'Capture data, hashes, and C2PA marker status' },
  { label: 'Chain of custody', detail: 'Intake record and file fingerprint preserved' },
  { label: 'Frame analysis', detail: 'Region-level anomaly markers when present' },
  { label: 'Timeline & methodology', detail: 'Full analysis timeline and versioned method' },
]

const REPORT_DEPTHS = [
  { mode: 'quick', title: 'Quick', tag: 'Fast read', desc: 'Verdict + headline confidence in seconds. Built for a first-pass triage of a single asset.', featured: false },
  { mode: 'standard', title: 'Standard', tag: 'Default', desc: 'The full evidence package — verdict, metrics, signals, provenance, and chain of custody. What the sample above shows.', featured: true },
  { mode: 'deep', title: 'Deep', tag: 'Extended', desc: 'Adds frame-level analysis, model results, cross-validation, and the methodology appendices for higher-stakes review.', featured: false },
]

export default function SampleReport() {
  return (
    <section id="report" className="section-padding bg-parchment relative overflow-hidden">
      <div className="absolute inset-0 forensic-grid opacity-30" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-14"
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
            A glance at what every Provance report contains — a clear verdict, the metrics behind
            it, and the signal-level evidence that holds up under review. Pick the depth below, then
            open the full document.
          </motion.p>
        </motion.div>

        <ReportSummaryCard>
          {/* What the full report includes */}
          <div className="mt-8">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-charcoal-light">
                      What the full report includes
                    </p>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {REPORT_INCLUDES.map((item) => (
                        <IncludeChip key={item.label} label={item.label} detail={item.detail} />
                      ))}
                    </div>
                  </div>

                  {/* Choose your report depth */}
                  <div className="mt-8">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-charcoal-light">
                        Choose your report depth
                      </p>
                      <p className="text-xs text-charcoal-mid">The sample above is the Standard report.</p>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {REPORT_DEPTHS.map((depth) => (
                        <div
                          key={depth.mode}
                          className={`rounded-2xl border p-4 transition-colors duration-300 ${
                            depth.featured
                              ? 'border-amber/50 bg-amber-subtle/70'
                              : 'border-stone-light bg-white-warm/92'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-serif text-lg text-charcoal">{depth.title}</p>
                            <span
                              className={`rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${
                                depth.featured
                                  ? 'bg-amber/15 text-amber'
                                  : 'bg-parchment text-charcoal-mid'
                              }`}
                            >
                              {depth.tag}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-charcoal-mid">{depth.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

        </ReportSummaryCard>

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
