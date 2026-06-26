import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ReportPreview } from '@/components/marketing/ReportPreview'
import { SectionHeading } from '@/components/marketing/SectionHeading'

export default function SampleReportPage() {
  return (
    <main className="px-6 pb-20 pt-16 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-12">
        <SectionHeading
          eyebrow="Sample Report"
          title="Show the report before the user ever uploads a file."
          description="This page exists to prove that Provance produces an artifact worth paying for: a complete, evidence-led, downloadable report that feels credible in professional workflows."
        />
        <ReportPreview />
        <div className="flex flex-wrap gap-3">
          <Link
            to="/signup?intent=trial"
            className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-[#151612] transition duration-300 hover:translate-y-[-1px] hover:bg-[#f0f4e6]"
          >
            Start Trial
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/signup?intent=demo"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-200 transition hover:border-white/20 hover:text-white"
          >
            Request Demo
          </Link>
        </div>
      </div>
    </main>
  )
}
