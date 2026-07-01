import { motion } from 'framer-motion'

export default function SampleReport() {
  return (
    <section id="report" className="section-padding bg-parchment relative overflow-hidden">
      <div className="absolute inset-0 forensic-grid opacity-30" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">
            Sample Report
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance text-charcoal">
            See what <span className="italic text-amber">forensic-grade</span> looks like.
          </motion.h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-4xl mx-auto bg-white-warm rounded-2xl border border-stone-light shadow-xl overflow-hidden"
        >
          <div className="p-6 md:p-10">
            <div className="flex items-start justify-between mb-8 pb-6 border-b border-stone-light">
              <div>
                <div className="text-xs text-charcoal-light font-mono uppercase tracking-wider mb-1">FORENSIC ANALYSIS REPORT</div>
                <h3 className="font-serif text-2xl text-charcoal">Report #A3F8C2-D4</h3>
              </div>
              <div className="text-right">
                <div className="text-xs text-charcoal-light font-mono">2026-06-25 • 14:32 UTC</div>
                <div className="text-xs text-amber font-mono mt-1">Verification Time: 1.2s</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-stone-light/60">
                  <span className="text-sm text-charcoal-mid">Verdict</span>
                  <span className="text-sm font-mono text-rose-600 font-medium">AI-Generated (94.7%)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-stone-light/60">
                  <span className="text-sm text-charcoal-mid">Media Type</span>
                  <span className="text-sm font-mono text-charcoal">Image (JPEG, 2048×1536)</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-stone-light/60">
                  <span className="text-sm text-charcoal-mid">Model Fingerprint</span>
                  <span className="text-sm font-mono text-charcoal">Stable Diffusion v3.5</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-stone-light/60">
                  <span className="text-sm text-charcoal-mid">Dimension Score</span>
                  <span className="text-sm font-mono text-charcoal">8 / 10</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-stone-light/60">
                  <span className="text-sm text-charcoal-mid">Metadata</span>
                  <span className="text-sm font-mono text-emerald-600">Intact</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-stone-light/60">
                  <span className="text-sm text-charcoal-mid">ELO Rating</span>
                  <span className="text-sm font-mono text-charcoal">0.847</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-stone-light/60">
                  <span className="text-sm text-charcoal-mid">Detected Artifacts</span>
                  <span className="text-sm font-mono text-charcoal">3</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-stone-light/60">
                  <span className="text-sm text-charcoal-mid">Provenance Chain</span>
                  <span className="text-sm font-mono text-rose-600">Incomplete</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <div className="text-sm font-medium text-charcoal mb-3">Detected Artifacts</div>
              <div className="flex flex-wrap gap-2">
                {['GAN Artifacts (Grid Pattern)', 'Inconsistent Lighting (Shadow Mismatch)', 'Edge Anomaly (Pixel Discontinuity)'].map((tag) => (
                  <span key={tag} className="px-3 py-1.5 text-xs bg-rose-50 border border-rose-200/60 text-rose-700 rounded-lg font-mono">{tag}</span>
                ))}
              </div>
            </div>

            <a href="#" className="inline-flex items-center gap-2 px-5 py-3 bg-charcoal text-parchment text-sm font-medium rounded-xl hover:bg-charcoal-soft transition-all duration-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Download Full Report (PDF)
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
