import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import SampleReportDocument from '../components/SampleReportDocument.jsx'
import { useToast } from '../components/ui'
import { sampleReportMeta } from '../lib/sampleReportContent.js'

function DownloadIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.8"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0 4-4m-4 4-4-4M5 19.5h14" />
    </svg>
  )
}

export default function SampleReportPrintPage() {
  const toast = useToast()

  // Give the browser a descriptive title so 'Save as PDF' suggests a sensible
  // filename (e.g. 'Provance sample report PRV-20260716-041'). Restore on unmount.
  useEffect(() => {
    const previousTitle = document.title
    document.title = `Provance sample report ${sampleReportMeta.reportId}`
    return () => {
      document.title = previousTitle
    }
  }, [])

  // Tracks whether the user started an export through the Export PDF button,
  // so the afterprint confirmation only fires for button-initiated exports
  // (not a spontaneous Ctrl+P that happens to land on this page).
  const exportRequestedRef = useRef(false)

  function handleExportPdf() {
    exportRequestedRef.current = true
    toast.info('Opening print dialog', {
      description:
        "Choose 'Save as PDF' as the destination to export this report.",
      duration: 8000,
    })
    // Defer the blocking print call so React flushes the toast first —
    // window.print() otherwise freezes the main thread mid-handler.
    window.setTimeout(() => window.print(), 0)
  }

  // Close the export loop: once the print dialog closes, confirm the
  // export completed so the user isn't left wondering whether the PDF
  // actually went out. Fires only for button-initiated exports.
  useEffect(() => {
    function handleAfterPrint() {
      if (!exportRequestedRef.current) return
      exportRequestedRef.current = false
      toast.success('PDF export complete', {
        description:
          'The report was sent to your chosen destination (Save as PDF).',
        duration: 6000,
      })
    }

    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [toast])

  return (
    <div className="min-h-screen bg-parchment-light px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto mb-6 flex max-w-5xl items-center justify-between gap-4 print:hidden">
        <Link to="/sample-report" className="btn-secondary">
          Back to sample report
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden text-right sm:block">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-charcoal-light">
              Print-ready document
            </p>
            <p className="mt-1 text-sm text-charcoal-mid">
              Save to PDF from your browser for the downloadable sample.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportPdf}
            className="ui-focus-ring inline-flex items-center gap-2 rounded-xl bg-charcoal px-4 py-2 text-sm font-medium text-parchment transition-all duration-150 hover:bg-charcoal-soft active:scale-[0.97]"
          >
            <DownloadIcon />
            Export PDF
          </button>
        </div>
      </div>

      <SampleReportDocument showPrintControls onExport={handleExportPdf} />
    </div>
  )
}
