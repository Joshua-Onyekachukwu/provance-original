import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { LucideIcon } from 'lucide-react'
import { SectionHeading } from './SectionHeading'

type Highlight = {
  title: string
  description: string
  icon: LucideIcon
}

type InfoPageProps = {
  eyebrow: string
  title: string
  intro: string
  highlights?: Highlight[]
}

export function InfoPage({ eyebrow, title, intro, highlights = [] }: InfoPageProps) {
  return (
    <main className="px-6 pb-20 pt-16 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-14">
        <SectionHeading eyebrow={eyebrow} title={title} description={intro} />

        {highlights.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-3">
            {highlights.map((item) => (
              <article
                key={item.title}
                className="surface-card rounded-[1.75rem] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.22)]"
              >
                <item.icon className="h-5 w-5 text-lime-100" />
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
              </article>
            ))}
          </div>
        )}

        <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(163,230,53,0.09),rgba(255,255,255,0.04),transparent)] p-8">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-lime-100/75">Next Step</p>
          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h3 className="max-w-2xl font-display text-3xl text-white">
              Move from positioning into a live product path with signup, reports, and workflow depth.
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup?intent=demo"
                className="inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-[#151612] transition duration-300 hover:translate-y-[-1px] hover:bg-[#f0f4e6]"
              >
                Request Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sample-report"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm text-zinc-200 transition hover:border-white/20 hover:text-white"
              >
                View Sample Report
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
