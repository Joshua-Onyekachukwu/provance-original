import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import InteractivePanel from '../components/InteractivePanel'
import PageHero from '../components/PageHero.jsx'
import SampleReportDocument from '../components/SampleReportDocument.jsx'

export default function SampleReportPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Review the report teams receive after verification."
        description="This is the branded verification report a scan produces — the same document teams download as a PDF: verdict, key metrics, AI detection results, manipulation indicators, provenance, chain of custody, and full methodology appendices."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Sample Report' }]}
        actions={[
          { label: 'Download Sample Report PDF', href: '/sample-report/print' },
          { label: 'Join Early Access', href: '/waitlist', variant: 'secondary' },
        ]}
      />

      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <InteractivePanel className="surface-card max-w-6xl mx-auto rounded-[2rem] backdrop-blur-xl print:shadow-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="relative z-10 overflow-hidden"
            >
              <SampleReportDocument />
            </motion.div>
          </InteractivePanel>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-10 text-center"
          >
            <div className="flex flex-wrap items-center justify-center gap-4 print:hidden">
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
                to="/docs"
                className="inline-flex items-center gap-2 rounded-xl border border-stone bg-white-warm px-5 py-3 text-sm font-medium text-charcoal transition-all duration-200 hover:border-charcoal/30"
              >
                View API Documentation
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
