import { Download, FileBadge, ShieldEllipsis, Sparkles, Waypoints } from 'lucide-react'

export function ReportPreview() {
  return (
    <div className="surface-panel rounded-[2rem] p-7 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/8 pb-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-lime-100/80">Report Artifact</p>
          <h3 className="mt-2 font-display text-2xl text-sand">Forensic Analysis Summary</h3>
        </div>
        <div className="rounded-full border border-lime-300/15 bg-lime-300/[0.07] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-lime-100">
          Downloadable
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-card space-y-4 rounded-[1.5rem] p-5">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            <span className="h-2 w-2 rounded-full bg-orange-300" />
            Workflow chain
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {['Upload logged', 'Signals merged', 'Review complete', 'PDF ready'].map((step, index) => (
              <div key={step} className="rounded-2xl border border-white/8 bg-black/10 p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">0{index + 1}</p>
                <p className="mt-2 text-xs font-semibold text-white">{step}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Verdict</p>
            <span className="rounded-full border border-lime-300/15 bg-lime-300/[0.07] px-3 py-1 text-xs font-semibold text-lime-100">
              Likely Synthetic
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Confidence', '92%'],
              ['Uncertainty', 'Low'],
              ['Media Type', 'Video'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-black/15 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Signal Breakdown</p>
            <div className="mt-4 space-y-3">
              {[
                ['Temporal consistency anomalies', 'High confidence'],
                ['Artifact and texture mismatch', 'Medium confidence'],
                ['Metadata inconsistency', 'Supported'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-xl bg-black/20 px-3 py-3">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-lime-100">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Attribution lead</p>
              <p className="mt-3 text-base font-semibold text-white">Generator family similarities detected</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Pattern overlap is strongest against recent synthetic diffusion outputs, with confidence preserved in the appendix.
              </p>
            </div>
            <div className="rounded-2xl border border-orange-300/10 bg-orange-300/[0.06] p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-orange-100/70">Report actions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Download PDF', 'Share link', 'Rescan later'].map((action) => (
                  <span key={action} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              icon: FileBadge,
              title: 'Evidence Appendix',
              text: 'Structured sections designed to communicate what triggered the verdict and how the platform reached it.',
            },
            {
              icon: ShieldEllipsis,
              title: 'Chain-Of-Custody Metadata',
              text: 'File hash, timestamps, methodology version, and workflow metadata for higher-trust handling.',
            },
            {
              icon: Waypoints,
              title: 'Case Routing',
              text: 'Flags, notes, and downstream actions can feed into editorial, legal, and enterprise review processes.',
            },
            {
              icon: Sparkles,
              title: 'Confidence Language',
              text: 'The report explains what is strong, what is uncertain, and what should be reviewed by a human.',
            },
            {
              icon: Download,
              title: 'Shareable Output',
              text: 'A complete report that can be downloaded, stored, and moved into a larger review process.',
            },
          ].map((item) => (
            <div key={item.title} className="surface-card rounded-[1.5rem] p-5">
              <item.icon className="h-5 w-5 text-lime-100" />
              <h4 className="mt-4 text-lg font-semibold text-white">{item.title}</h4>
              <p className="mt-2 text-sm leading-7 text-zinc-400">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
