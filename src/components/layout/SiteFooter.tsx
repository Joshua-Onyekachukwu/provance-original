import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { footerLinks, footerMeta, primaryClaim } from '@/data/siteContent'

export function SiteFooter() {
  return (
    <footer className="border-t border-black/8 bg-[rgba(255,248,240,0.72)]">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <div className="mb-10 grid gap-6 rounded-[2rem] border border-black/8 bg-[#1a1d20] p-8 shadow-[0_30px_80px_rgba(24,20,14,0.12)] lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-orange-200/70">Operator Note</p>
            <h2 className="max-w-2xl font-display text-4xl leading-tight text-[#f2ede3]">
              {footerMeta.headline}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-zinc-400">{footerMeta.note}</p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              to="/signup?intent=demo"
              className="accent-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
            >
              Request Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/sample-report"
              className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-[#f2ede3] transition duration-300 hover:border-white/20 hover:bg-white/[0.08]"
            >
              View Sample Report
            </Link>
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.2fr_repeat(3,0.7fr)]">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#7b6f62]">Provance</p>
            <h2 className="max-w-lg font-display text-3xl leading-tight text-[#17181a]">
              Trust-grade verification for image, video, evidence, and workflow.
            </h2>
            <p className="max-w-xl text-sm leading-7 text-[#5d6066]">{primaryClaim}</p>
            <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-[#5d6066]">
              <span className="rounded-full border border-black/8 bg-white/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]">
                image + video
              </span>
              <span className="rounded-full border border-black/8 bg-white/60 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]">
                report-first
              </span>
              <a href={`mailto:${footerMeta.contact}`} className="transition hover:text-[#17181a]">
                {footerMeta.contact}
              </a>
            </div>
          </div>

          {footerLinks.map((group) => (
            <div key={group.group} className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#17181a]">{group.group}</p>
              <div className="space-y-3 text-sm text-[#5d6066]">
                {group.links.map((link) => (
                  <div key={link.to}>
                    <Link to={link.to} className="transition duration-300 hover:text-[#17181a]">
                      {link.label}
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-black/8 pt-6 text-sm text-[#6b6f75] md:flex-row md:items-center md:justify-between">
          <p>Provance. Built for high-trust verification workflows.</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em]">Evidence. Reports. Workflow.</p>
        </div>
      </div>
    </footer>
  )
}
