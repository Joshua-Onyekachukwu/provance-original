import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import InteractivePanel from './InteractivePanel'

const reportPreview =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=close-up%20documentary%20frame%20of%20a%20speaker%20at%20a%20lectern%2C%20professional%20broadcast%20still%2C%20subtle%20newsroom%20lighting%2C%20realistic%20face%2C%20high%20detail%2C%20editorial%20photography&image_size=landscape_16_9'

const scoreCards = [
  { label: 'Authenticity score', value: '31 / 100', tone: 'text-rose-700 bg-rose-50 border-rose-200/70' },
  { label: 'AI confidence', value: '94.7%', tone: 'text-amber-700 bg-amber-50 border-amber-200/70' },
  { label: 'Verification status', value: 'Manipulated', tone: 'text-rose-700 bg-rose-50 border-rose-200/70' },
  { label: 'Overall risk', value: 'High', tone: 'text-rose-700 bg-rose-50 border-rose-200/70' },
  { label: 'Signal agreement', value: '61%', tone: 'text-charcoal bg-parchment border-stone-light' },
  { label: 'Source confidence', value: '48%', tone: 'text-charcoal bg-parchment border-stone-light' },
]

const evidenceItems = [
  ['Frequency artifacts', 'Synthetic patterning detected around facial edges and backdrop gradients.'],
  ['Metadata summary', 'EXIF retained, but creation path and edit history do not fully reconcile.'],
  ['Timeline marker', 'Frame continuity breaks in the final 12 seconds of the uploaded clip.'],
  ['Fingerprint reference', 'SHA-256 2b7f91c0b6cc...0e114d91 stored with the case file.'],
]

export default function SampleReport() {
  return (
    <section id="report" className="section-padding bg-parchment relative overflow-hidden">
      <div className="absolute inset-0 forensic-grid opacity-30" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="eyebrow">
            Sample Report
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance text-charcoal">
            A report built to be reviewed, shared, and defended.
          </motion.h2>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.18 } } }}
            className="mt-5 text-lg leading-relaxed text-charcoal-mid"
          >
            Review the type of report a team can download, circulate internally, and use to
            support a higher-confidence verification decision.
          </motion.p>
        </motion.div>

        <InteractivePanel className="surface-card mx-auto max-w-6xl rounded-[2rem] backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative z-10"
          >
            <div className="p-6 md:p-8 lg:p-10">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-light pb-6">
                <div>
                  <div className="mb-1 text-xs font-mono uppercase tracking-wider text-charcoal-light">FORENSIC ANALYSIS REPORT</div>
                  <h3 className="font-serif text-2xl text-charcoal">Report #PV-A3F8C2-D4</h3>
                  <p className="mt-2 text-sm text-charcoal-mid">Generated for broadcast image and video verification.</p>
                </div>
                <div className="grid gap-2 text-left md:text-right">
                  <div className="text-xs font-mono text-charcoal-light">2026-06-25 • 14:32 UTC</div>
                  <div className="text-xs font-mono text-amber">Analysis timestamp. 1.2s total verification time</div>
                  <div className="text-xs font-mono text-charcoal-light">Hash. SHA-256 2b7f91c0b6cc...0e114d91</div>
                </div>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  <div className="rounded-[1.75rem] border border-stone-light/80 bg-parchment/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">Uploaded media</div>
                        <div className="mt-2 text-sm text-charcoal-mid">Source. `briefing-room-source-clip.mp4`</div>
                      </div>
                      <span className="rounded-full border border-stone-light bg-white-warm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                        Video + audio
                      </span>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-stone-light/70 bg-charcoal">
                      <img
                        src={reportPreview}
                        alt="Uploaded media inside a Provance report."
                        className="aspect-[16/9] w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {[
                        ['Source information', 'Uploaded by newsroom desk'],
                        ['Fingerprint', 'SHA-256 matched to case'],
                        ['Report owner', 'Editorial standards team'],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-stone-light/80 bg-white-warm/85 p-3">
                          <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-charcoal-light">{label}</div>
                          <div className="mt-2 text-sm text-charcoal">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-stone-light/80 bg-white-warm/88 p-5 shadow-[0_18px_40px_rgba(26,26,26,0.05)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">Verification timeline</div>
                        <h4 className="mt-2 font-serif text-xl text-charcoal">How the case resolved.</h4>
                      </div>
                      <span className="rounded-full border border-stone-light bg-parchment px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                        04 checkpoints
                      </span>
                    </div>
                    <div className="mt-5 space-y-4">
                      {[
                        ['00:00', 'Upload accepted and media fingerprint recorded'],
                        ['00:08', 'Frequency and noise analysis completed'],
                        ['00:17', 'Metadata and timeline inconsistencies surfaced'],
                        ['00:24', 'Report assembled and queued for reviewer export'],
                      ].map(([time, step]) => (
                        <div key={time} className="grid grid-cols-[52px_1fr] gap-3">
                          <div className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 text-center font-mono text-[11px] text-amber">
                            {time}
                          </div>
                          <div className="rounded-2xl border border-stone-light/80 bg-parchment/80 px-4 py-3 text-sm text-charcoal-mid">
                            {step}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {scoreCards.map((item) => (
                      <motion.div
                        key={item.label}
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.18 }}
                        className={`rounded-[1.4rem] border p-4 shadow-[0_16px_35px_rgba(26,26,26,0.05)] ${item.tone}`}
                      >
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em]">{item.label}</div>
                        <div className="mt-2 font-serif text-2xl">{item.value}</div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="rounded-[1.75rem] border border-stone-light/80 bg-charcoal p-5 text-parchment shadow-[0_24px_55px_rgba(26,26,26,0.14)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-stone">Detection summary</div>
                        <h4 className="mt-2 font-serif text-2xl">Manipulated with strong synthetic indicators.</h4>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-amber-light">
                        Requires escalation
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-stone">
                      The strongest indicators come from frequency artifacts, source-path
                      mismatch, and discontinuity across the final sequence of frames. The
                      report keeps those findings together so another reviewer can inspect
                      the same evidence without relying on a single score.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        title: 'Evidence breakdown',
                        body: evidenceItems,
                      },
                      {
                        title: 'Metadata summary',
                        body: [
                          ['Camera model', 'Unavailable in the supplied asset headers.'],
                          ['Creation path', 'Export pattern suggests multiple editing passes.'],
                          ['Source history', 'Reporter upload and agency copy are not yet reconciled.'],
                        ],
                      },
                      {
                        title: 'Key findings',
                        body: [
                          ['Verdict line', 'The result should be shared with the full evidence summary attached.'],
                          ['Confidence indicators', 'High AI confidence but partial source certainty keeps human review in the loop.'],
                          ['Next action', 'Request original source clip and compare against the current upload.'],
                        ],
                      },
                    ].map((section) => (
                      <details
                        key={section.title}
                        className="group rounded-[1.5rem] border border-stone-light/80 bg-white-warm/90 p-5 shadow-[0_16px_35px_rgba(26,26,26,0.04)]"
                        open={section.title === 'Evidence breakdown'}
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                          <span className="font-serif text-xl text-charcoal">{section.title}</span>
                          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-light transition-transform duration-200 group-open:rotate-45">
                            +
                          </span>
                        </summary>
                        <div className="mt-4 space-y-3">
                          {section.body.map(([label, text]) => (
                            <div key={label} className="rounded-2xl border border-stone-light/70 bg-parchment/70 p-3">
                              <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-charcoal-light">{label}</div>
                              <div className="mt-2 text-sm leading-relaxed text-charcoal-mid">{text}</div>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-stone-light pt-6">
                <div className="text-sm text-charcoal-mid">
                  Built for image and video verification, with evidence and reference details kept together.
                </div>
                <Link to="/sample-report" className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition-all duration-200 hover:bg-charcoal-soft">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  View Full Sample Report
                </Link>
              </div>
            </div>
          </motion.div>
        </InteractivePanel>
      </div>
    </section>
  )
}
