import { motion } from 'framer-motion'
import InteractivePanel from './InteractivePanel'

const uploadedPreview =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=editorial%20photo%20of%20a%20public%20figure%20at%20a%20press%20briefing%2C%20documentary%20style%2C%20neutral%20lighting%2C%20high-detail%2C%20professional%20photography%2C%20clean%20background&image_size=landscape_16_9'

const analysisChecks = [
  { label: 'Frequency scan', value: 96, tone: 'bg-amber' },
  { label: 'Metadata pass', value: 82, tone: 'bg-emerald-600' },
  { label: 'Frame continuity', value: 71, tone: 'bg-amber-light' },
  { label: 'Noise profile', value: 88, tone: 'bg-amber' },
]

export default function ProductShowcase() {
  return (
    <section className="relative bg-parchment-light px-6 pb-20 pt-6 md:px-8 md:pb-24 lg:pb-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,119,6,0.08),transparent_36%)]" />
      <div className="content-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-3 rounded-full border border-amber/20 bg-white-warm/75 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-amber shadow-[0_18px_45px_rgba(26,26,26,0.05)]">
            Product Preview
          </span>
          <h2 className="mt-5 font-serif text-3xl text-charcoal sm:text-4xl lg:text-5xl">
            A dashboard preview grounded in the real product flow.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-charcoal-mid">
            Upload the file, run the analysis, then review the results and report details
            in one workspace. This is a coming-soon product preview that can later be
            replaced with live application screens.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.55fr_0.85fr]">
          <InteractivePanel className="rounded-[2rem] border border-stone-light/80 bg-white-warm/85 shadow-[0_28px_80px_rgba(26,26,26,0.12)] backdrop-blur-xl">
            <div className="relative z-10 p-5 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-light/90 pb-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
                    Verification Workspace
                  </p>
                  <h3 className="mt-2 font-serif text-2xl text-charcoal">
                    Upload. analyze. inspect details.
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
                    Analysis active
                  </span>
                  <span className="rounded-full border border-stone-light bg-parchment px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                    Image + video
                  </span>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr_0.95fr_0.9fr]">
                <div className="space-y-5 xl:col-span-1">
                  <div className="rounded-[1.5rem] border border-stone-light/80 bg-parchment/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                          Uploaded asset
                        </p>
                        <p className="mt-2 text-sm text-charcoal-mid">
                          `press-briefing-source-clip.mp4`
                        </p>
                      </div>
                      <div className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
                        In review
                      </div>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-stone-light/70 bg-charcoal">
                      <img
                        src={uploadedPreview}
                        alt="Uploaded media preview inside the Provance verification workspace."
                        className="aspect-[16/9] w-full object-cover opacity-95"
                        loading="lazy"
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ['File type', 'Video with audio'],
                        ['Duration', '00:42'],
                        ['Resolution', '1920 × 1080'],
                        ['Submitted by', 'Early-access user'],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl border border-stone-light/80 bg-white-warm/90 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_35px_rgba(26,26,26,0.08)]"
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                            {label}
                          </p>
                          <p className="mt-2 text-lg font-medium text-charcoal">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-5 xl:col-span-1">
                  <div className="rounded-[1.5rem] border border-stone-light/80 bg-white-warm/88 p-4 shadow-[0_18px_40px_rgba(26,26,26,0.06)]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                          Analysis run
                        </p>
                        <h4 className="mt-2 font-serif text-xl text-charcoal">
                          Signals resolving across the file.
                        </h4>
                      </div>
                      <span className="rounded-full border border-stone-light px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                        04 active checks
                      </span>
                    </div>
                    <div className="mt-5 space-y-4">
                      {analysisChecks.map((item) => (
                        <div key={item.label}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-charcoal">{item.label}</span>
                            <span className="font-mono text-charcoal-mid">{item.value}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-stone-light/70">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${item.value}%` }}
                              viewport={{ once: true, margin: '-80px' }}
                              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                              className={`h-2 rounded-full ${item.tone}`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 rounded-2xl border border-stone-light/70 bg-parchment/80 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                          Progress log
                        </span>
                        <span className="font-mono text-[11px] text-emerald-700">3 / 4 complete</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          ['Upload fingerprinted', 'done'],
                          ['Signal analysis complete', 'done'],
                          ['Confidence assembled', 'done'],
                          ['Report packaging', 'running'],
                        ].map(([label, state]) => (
                          <div key={label} className="flex items-center justify-between rounded-xl border border-stone-light/70 bg-white-warm/80 px-3 py-2">
                            <span className="text-sm text-charcoal-mid">{label}</span>
                            <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${state === 'done' ? 'text-emerald-700' : 'text-amber'}`}>
                              {state}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 xl:col-span-1">
                  <div className="rounded-[1.5rem] border border-stone-light/80 bg-charcoal p-5 text-parchment shadow-[0_24px_55px_rgba(26,26,26,0.18)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                          Result details
                        </p>
                        <h4 className="mt-2 font-serif text-2xl text-parchment">
                          Requires review
                        </h4>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-amber-light">
                        Signals disagree
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-stone">
                      Provance keeps the verdict, confidence, metadata summary, and key
                      findings together so the user sees what happened and why.
                    </p>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      {[
                        ['Authenticity score', '31 / 100'],
                        ['AI confidence', '94.7%'],
                        ['Signal agreement', '61%'],
                        ['Verification status', 'Requires review'],
                        ['Risk level', 'High'],
                        ['Hash reference', '2b7f...91c0'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone">
                            {label}
                          </p>
                          <p className="mt-2 text-sm text-parchment">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-stone-light/80 bg-white-warm/88 p-5 shadow-[0_18px_40px_rgba(26,26,26,0.06)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                          Key findings
                        </p>
                        <h4 className="mt-2 font-serif text-xl text-charcoal">
                          Details ready for report output.
                        </h4>
                      </div>
                      <span className="rounded-full border border-stone-light bg-parchment px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                        3 highlighted issues
                      </span>
                    </div>
                    <div className="mt-5 space-y-3">
                      {[
                        ['Detection summary', 'Synthetic pattern signatures and frame continuity breaks are both present in the file.'],
                        ['Metadata summary', 'Headers are only partially consistent with the submitted source context.'],
                        ['Next step', 'Export the report or move the file into a deeper review workflow.'],
                      ].map(([role, note]) => (
                        <div key={role} className="rounded-2xl border border-stone-light/70 bg-parchment/80 p-3">
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                            {role}
                          </p>
                          <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">{note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </InteractivePanel>

          <div className="space-y-6">
            <InteractivePanel className="rounded-[1.75rem] border border-stone-light/80 bg-white-warm/85 shadow-[0_24px_60px_rgba(26,26,26,0.1)] backdrop-blur-xl">
              <div className="relative z-10 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                  What this preview shows
                </p>
                <h3 className="mt-3 font-serif text-2xl text-charcoal">From file to findings.</h3>
                <div className="mt-5 space-y-3">
                  {[
                    ['Upload', 'Image or video enters the workspace'],
                    ['Analysis', 'Signals, metadata, and confidence resolve'],
                    ['Details', 'The result becomes a report-ready output'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between rounded-2xl border border-stone-light/70 bg-parchment/70 px-4 py-3"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">{label}</span>
                      <span className="max-w-[180px] text-right text-sm text-charcoal">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </InteractivePanel>

            <InteractivePanel className="rounded-[1.75rem] border border-stone-light/80 bg-charcoal shadow-[0_24px_60px_rgba(26,26,26,0.18)]">
              <div className="relative z-10 p-5 text-parchment">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone">
                  Report output
                </p>
                <h3 className="mt-3 font-serif text-2xl">Shareable by design.</h3>
                <p className="mt-4 text-sm leading-relaxed text-stone">
                  Exported outputs keep the verdict, evidence summary, metadata,
                  timeline, and fingerprint reference together so the reasoning survives
                  beyond the app screen.
                </p>
                <div className="mt-5 space-y-2">
                  {['PDF report', 'Case link', 'Timeline', 'Evidence appendix'].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-stone"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </InteractivePanel>
          </div>
        </div>
      </div>
    </section>
  )
}
