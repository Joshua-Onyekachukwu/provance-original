import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import InteractivePanel from './InteractivePanel'
import SampleReportDocument from './SampleReportDocument'

const LUXE = [0.32, 0.72, 0, 1]

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
            This is the verification report a team receives after a scan — the same
            branded document they can download as a PDF, circulate internally, and use
            to support a higher-confidence decision. Every detail below is part of the
            export: verdict, metrics, signals, provenance, chain of custody, and appendices.
          </motion.p>
        </motion.div>

        <InteractivePanel className="bezel-shell mx-auto max-w-6xl backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, ease: LUXE }}
            className="relative z-10"
          >
            <SampleReportDocument />
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
