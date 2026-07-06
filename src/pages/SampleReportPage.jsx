import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import InteractivePanel from '../components/InteractivePanel'

const reportPreview =
  'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=close-up%20documentary%20frame%20of%20a%20speaker%20at%20a%20lectern%2C%20professional%20broadcast%20still%2C%20subtle%20newsroom%20lighting%2C%20realistic%20face%2C%20high%20detail%2C%20editorial%20photography&image_size=landscape_16_9'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1] } }),
}

export default function SampleReportPage() {
  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl mx-auto text-center">
            <motion.span variants={fadeUp} custom={0} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Sample Report</motion.span>
            <motion.h1 variants={fadeUp} custom={1} className="font-serif text-4xl sm:text-5xl lg:text-6xl mt-4 text-balance text-charcoal">
              Review the report teams receive after verification.
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-charcoal-mid leading-relaxed max-w-xl mx-auto">
              See how media context, scores, findings, metadata, timeline, and export-ready
              detail come together in one report for image and video review.
            </motion.p>
            <motion.div variants={fadeUp} custom={3} className="mt-8 flex flex-wrap justify-center gap-4 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-5 py-3 bg-charcoal text-parchment text-sm font-medium rounded-xl hover:bg-charcoal-soft transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Sample Report PDF
              </button>
              <Link to="/waitlist" className="inline-flex items-center gap-2 px-5 py-3 border border-stone text-charcoal text-sm font-medium rounded-xl hover:border-charcoal/30 hover:bg-white-warm/50 transition-all duration-200">
                Join Waitlist
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <InteractivePanel className="max-w-6xl mx-auto rounded-[2rem] border border-stone-light/80 bg-white-warm/90 shadow-[0_32px_90px_rgba(26,26,26,0.12)] backdrop-blur-xl print:shadow-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative z-10 overflow-hidden"
          >
            <div className="p-6 md:p-8 lg:p-10 border-b border-stone-light">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs text-charcoal-light font-mono uppercase tracking-widest mb-1">FORENSIC ANALYSIS REPORT</div>
                  <h2 className="font-serif text-2xl md:text-3xl text-charcoal">Report #PV-A3F8C2-D4</h2>
                  <p className="mt-2 text-sm text-charcoal-mid">Preview layout for image and video verification outputs.</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-charcoal-light font-mono">2026-06-25 • 14:32 UTC</div>
                  <div className="text-xs text-amber font-mono mt-1">Verification Time: 1.2s</div>
                  <div className="text-xs text-charcoal-light font-mono mt-1">Hash. SHA-256 2b7f91c0b6cc...0e114d91</div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.02fr_0.98fr] lg:p-10 border-b border-stone-light">
              <div className="space-y-6">
                <div className="rounded-[1.5rem] border border-stone-light/80 bg-parchment/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-charcoal-light">Uploaded media preview</div>
                      <div className="mt-2 text-sm text-charcoal-mid">Source file. `briefing-room-source-clip.mp4`</div>
                    </div>
                    <span className="rounded-full border border-stone-light bg-white-warm px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                      Video + audio
                    </span>
                  </div>
                  <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-stone-light/70 bg-charcoal">
                    <img
                      src={reportPreview}
                      alt="Sample uploaded media preview inside the Provance report."
                      className="aspect-[16/9] w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[
                      ['Source information', 'Uploaded by newsroom desk'],
                      ['Fingerprint', 'Matched to case record'],
                      ['Analysis mode', 'Full verification'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-stone-light/80 bg-white-warm/85 p-3">
                        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-charcoal-light">{label}</div>
                        <div className="mt-2 text-sm text-charcoal">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-stone-light/80 bg-white-warm/90 p-5 shadow-[0_18px_40px_rgba(26,26,26,0.05)]">
                  <h3 className="font-serif text-lg text-charcoal mb-5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber rounded-full" /> Verification Timeline
                  </h3>
                  <div className="space-y-4">
                    {[
                      ['00:00', 'Upload accepted and fingerprint logged'],
                      ['00:08', 'Signal analysis resolved across the file'],
                      ['00:17', 'Metadata and confidence summary assembled'],
                      ['00:24', 'Report output prepared for export'],
                    ].map(([time, text]) => (
                      <div key={time} className="grid grid-cols-[52px_1fr] gap-3">
                        <div className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 text-center font-mono text-[11px] text-amber">
                          {time}
                        </div>
                        <div className="rounded-2xl border border-stone-light/80 bg-parchment/80 px-4 py-3 text-sm text-charcoal-mid">
                          {text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Authenticity Score', value: '31 / 100', accent: 'text-rose-700 bg-rose-50 border-rose-200/70' },
                    { label: 'AI Confidence', value: '94.7%', accent: 'text-amber-700 bg-amber-50 border-amber-200/70' },
                    { label: 'Verification Status', value: 'Manipulated', accent: 'text-rose-700 bg-rose-50 border-rose-200/70' },
                    { label: 'Overall Risk', value: 'High', accent: 'text-rose-700 bg-rose-50 border-rose-200/70' },
                    { label: 'Signal Agreement', value: '61%', accent: 'text-charcoal bg-parchment border-stone-light' },
                    { label: 'Source Confidence', value: '48%', accent: 'text-charcoal bg-parchment border-stone-light' },
                  ].map((row) => (
                    <div key={row.label} className={`rounded-[1.4rem] border p-4 shadow-[0_16px_35px_rgba(26,26,26,0.05)] ${row.accent}`}>
                      <div className="text-[10px] font-mono uppercase tracking-[0.16em]">{row.label}</div>
                      <div className="mt-2 font-serif text-2xl">{row.value}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[1.5rem] border border-stone-light/80 bg-charcoal p-5 text-parchment shadow-[0_24px_55px_rgba(26,26,26,0.14)]">
                  <h3 className="font-serif text-lg mb-4">Detection Summary</h3>
                  <p className="text-sm leading-relaxed text-stone">
                    The strongest indicators come from frequency artifacts, source-path
                    mismatch, and discontinuity across the final sequence of frames. The
                    report keeps those findings together so another reviewer can inspect
                    the same evidence without relying on one score alone.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      title: 'Metadata Summary',
                      items: [
                        ['Media type', 'Video (MP4, 1920 × 1080)'],
                        ['Analysis timestamp', '2026-06-25 • 14:32 UTC'],
                        ['Source information', 'Uploaded by editorial standards team'],
                      ],
                    },
                    {
                      title: 'Key Findings',
                      items: [
                        ['Frequency artifacts', 'Synthetic pattern signatures detected around facial edges and backdrop gradients.'],
                        ['Continuity break', 'Frame continuity breaks are present in the final 12 seconds of the clip.'],
                        ['Fingerprint reference', 'SHA-256 2b7f91c0b6cc...0e114d91 stored with the case file.'],
                      ],
                    },
                    {
                      title: 'Evidence Breakdown',
                      items: [
                        ['Verdict line', 'The result should be shared with the evidence summary attached.'],
                        ['Confidence indicators', 'High AI confidence but partial source certainty keeps human review in the loop.'],
                        ['Next action', 'Export the PDF or move the file into a deeper review workflow.'],
                      ],
                    },
                  ].map((section, index) => (
                    <details
                      key={section.title}
                      open={index === 0}
                      className="group rounded-[1.5rem] border border-stone-light/80 bg-white-warm/90 p-5 shadow-[0_16px_35px_rgba(26,26,26,0.04)]"
                    >
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                        <span className="font-serif text-xl text-charcoal">{section.title}</span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-light transition-transform duration-200 group-open:rotate-45">+</span>
                      </summary>
                      <div className="mt-4 space-y-3">
                        {section.items.map(([label, value]) => (
                          <div key={label} className="rounded-2xl border border-stone-light/70 bg-parchment/70 p-3">
                            <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-charcoal-light">{label}</div>
                            <div className="mt-2 text-sm leading-relaxed text-charcoal-mid">{value}</div>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 lg:p-10">
              <h3 className="font-serif text-lg text-charcoal mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber rounded-full" /> Evidence Appendix
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { id: 'FRQ-001', title: 'Frequency artifacts', desc: 'High-frequency patterning detected around the subject contour and backdrop gradients.', tone: 'bg-rose-50 border-rose-200/70 text-rose-700' },
                  { id: 'TMP-002', title: 'Timeline continuity', desc: 'Frame-to-frame shifts rise sharply in the final section of the uploaded clip.', tone: 'bg-amber-50 border-amber-200/70 text-amber-700' },
                  { id: 'MET-003', title: 'Metadata inconsistency', desc: 'Source-path context and header information do not fully reconcile.', tone: 'bg-parchment border-stone-light text-charcoal' },
                  { id: 'HSH-004', title: 'Fingerprint reference', desc: 'A stable hash is stored with the case so the report can be tied back to the reviewed asset.', tone: 'bg-parchment border-stone-light text-charcoal' },
                ].map((item) => (
                  <div key={item.id} className="rounded-[1.4rem] border border-stone-light/80 bg-parchment/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">{item.id}</span>
                      <span className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] ${item.tone}`}>{item.title}</span>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
          </InteractivePanel>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mt-10 text-center">
            <div className="flex flex-wrap items-center justify-center gap-4 print:hidden">
              <Link to="/docs" className="inline-flex px-6 py-3 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200">
                View API Documentation
              </Link>
              <Link to="/waitlist" className="inline-flex px-6 py-3 border border-stone text-charcoal font-medium text-sm rounded-xl hover:border-charcoal/30 hover:bg-white transition-all duration-200">
                Join Waitlist
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
