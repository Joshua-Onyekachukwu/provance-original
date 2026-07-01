import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

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
              See what <span className="italic text-amber">forensic-grade</span> looks like.
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-charcoal-mid leading-relaxed max-w-xl mx-auto">
              Every Provance report is a comprehensive case file — not a single score. Here's what you get with every verification.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto bg-white-warm rounded-2xl border border-stone-light shadow-xl overflow-hidden"
          >
            <div className="p-6 md:p-10 border-b border-stone-light">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <div className="text-xs text-charcoal-light font-mono uppercase tracking-widest mb-1">FORENSIC ANALYSIS REPORT</div>
                  <h2 className="font-serif text-2xl md:text-3xl text-charcoal">Report #A3F8C2-D4</h2>
                </div>
                <div className="text-right">
                  <div className="text-xs text-charcoal-light font-mono">2026-06-25 • 14:32 UTC</div>
                  <div className="text-xs text-amber font-mono mt-1">Verification Time: 1.2s</div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-10 border-b border-stone-light">
              <h3 className="font-serif text-lg text-charcoal mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber rounded-full" /> Verdict &amp; Metadata
              </h3>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
                {[
                  { label: 'Verdict', value: 'AI-Generated', accent: 'text-rose-600' },
                  { label: 'Confidence', value: '94.7%', accent: 'text-amber' },
                  { label: 'Media Type', value: 'Image (JPEG, 2048×1536)', accent: 'text-charcoal' },
                  { label: 'Model Fingerprint', value: 'Stable Diffusion v3.5', accent: 'text-charcoal' },
                  { label: 'Dimension Score', value: '8 / 10', accent: 'text-charcoal' },
                  { label: 'ELO Rating', value: '0.847', accent: 'text-charcoal' },
                  { label: 'Metadata', value: 'Intact', accent: 'text-emerald-600' },
                  { label: 'Provenance Chain', value: 'Incomplete', accent: 'text-rose-600' },
                  { label: 'File Size', value: '4.2 MB', accent: 'text-charcoal' },
                  { label: 'Hash (SHA-256)', value: 'a3f8c2d4...', accent: 'text-charcoal font-mono text-xs' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-stone-light/60">
                    <span className="text-sm text-charcoal-mid">{row.label}</span>
                    <span className={`text-sm font-mono font-medium ${row.accent}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-10 border-b border-stone-light">
              <h3 className="font-serif text-lg text-charcoal mb-5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber rounded-full" /> Evidence Appendix
              </h3>
              <div className="space-y-5">
                {[
                  { id: 'GAN-001', title: 'GAN Artifacts (Grid Pattern)', severity: 'High', severityColor: 'bg-rose-100 text-rose-700 border-rose-200', desc: 'High-frequency periodic grid pattern detected at 4×4 pixel intervals, consistent with convolutional generator upscaling artifacts. Pattern spans 78% of the image area.', confidence: '96.2%' },
                  { id: 'LGT-002', title: 'Inconsistent Lighting (Shadow Mismatch)', severity: 'High', severityColor: 'bg-rose-100 text-rose-700 border-rose-200', desc: 'Primary light source direction (azimuth 215°) conflicts with shadow cast direction (azimuth 140°). Ambient occlusion inconsistent with global illumination model.', confidence: '91.5%' },
                  { id: 'EDG-003', title: 'Edge Anomaly (Pixel Discontinuity)', severity: 'Medium', severityColor: 'bg-amber-50 text-amber-700 border-amber-200', desc: 'Irregular edge transitions detected in 12 regions. Sobel gradient analysis shows non-natural distribution of high-frequency edge responses.', confidence: '84.3%' },
                  { id: 'META-004', title: 'Metadata Integrity Check', severity: 'Info', severityColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'EXIF headers intact. No modification timestamps detected. Camera model and GPS coordinates absent (consistent with AI generation).', confidence: '\u2014' },
                ].map((evidence) => (
                  <div key={evidence.id} className="p-5 rounded-xl bg-stone-light/30 border border-stone-light/60">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-charcoal-light">{evidence.id}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium border ${evidence.severityColor}`}>{evidence.severity}</span>
                        </div>
                        <h4 className="font-serif text-base text-charcoal">{evidence.title}</h4>
                      </div>
                      {evidence.confidence !== '\u2014' && (
                        <span className="text-xs font-mono text-charcoal-light whitespace-nowrap">{evidence.confidence} confidence</span>
                      )}
                    </div>
                    <p className="text-charcoal-mid text-sm leading-relaxed">{evidence.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 md:p-10">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs text-charcoal-light font-mono">
                  <span>Methodology v2.4.1</span>
                  <span>Analysis Engine: Provance Forensics Engine</span>
                  <span>Report ID: RPT-A3F8C2-D4-0625</span>
                </div>
                <Link to="#" className="inline-flex items-center gap-2 px-5 py-3 bg-charcoal text-parchment text-sm font-medium rounded-xl hover:bg-charcoal-soft transition-all duration-200">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download Full Report (PDF)
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mt-10 text-center">
            <Link to="/docs" className="inline-flex px-6 py-3 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200">
              View API Documentation
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
