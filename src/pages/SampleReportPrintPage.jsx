import { Link } from 'react-router-dom'
import SampleReportDocument from '../components/SampleReportDocument.jsx'

export default function SampleReportPrintPage() {
  return (
    <div className="min-h-screen bg-parchment-light px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between gap-4 print:hidden">
        <Link to="/sample-report" className="btn-secondary">
          Back to sample report
        </Link>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-charcoal-light">
            Print-ready document
          </p>
          <p className="mt-1 text-sm text-charcoal-mid">
            Save to PDF from your browser for the downloadable sample.
          </p>
        </div>
      </div>

      <SampleReportDocument showPrintControls />
    </div>
  )
}
