import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1] } }),
}

const dimensions = [
  { name: 'Pixel Consistency', desc: 'Analysis of high-frequency noise patterns, compression block boundaries, and statistical anomalies that differ between natural and generated images.' },
  { name: 'Metadata Integrity', desc: 'Examination of EXIF data, creation timestamps, software signatures, and edit history for inconsistencies indicative of synthetic origin.' },
  { name: 'Generative Fingerprints', desc: 'Detection of model-specific artifacts from popular generators including Stable Diffusion, DALL-E, Midjourney, and proprietary models.' },
  { name: 'Lighting & Shadows', desc: 'Physics-based analysis of light sources, shadow directions, and ambient occlusion patterns that are often inconsistent in AI-generated scenes.' },
  { name: 'Edge & Frequency', desc: 'Frequency-domain analysis examining edge transitions, texture gradients, and spatial frequency distributions for GAN artifacts.' },
  { name: 'Provenance Chain', desc: 'Cryptographic verification of content history, including signature chains, watermark integrity, and creation lineage.' },
]

export default function MethodologyPage() {
  return (
    <div className="pt-20 md:pt-24">
      {/* ── Hero ── */}
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl mx-auto text-center">
            <motion.span variants={fadeUp} custom={0} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Methodology</motion.span>
            <motion.h1 variants={fadeUp} custom={1} className="font-serif text-4xl sm:text-5xl lg:text-6xl mt-4 text-balance text-charcoal">
              Confidence through <span className="italic text-amber">clarity</span>.
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-charcoal-mid leading-relaxed max-w-xl mx-auto">
              We believe trust requires transparency. Every Provance verdict is accompanied by a clear explanation of how it was reached, what it means, and where its limits lie.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Confidence Language ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Confidence</motion.span>
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
              How we express <span className="italic text-amber">certainty</span>.
            </motion.h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {[
              { range: '95–100%', label: 'Very Likely AI-Generated', color: 'bg-rose-500', note: 'Multiple high-confidence evidence dimensions detected. Model fingerprint matched.' },
              { range: '80–94%', label: 'Likely AI-Generated', color: 'bg-orange-500', note: 'Several evidence dimensions present. Some natural characteristics also detected.' },
              { range: '60–79%', label: 'Suspicious', color: 'bg-amber-400', note: 'Some artifacts detected but not conclusive. Additional context recommended.' },
              { range: '40–59%', label: 'Inconclusive', color: 'bg-stone', note: 'Insufficient signal. Results may require human review or additional metadata.' },
              { range: '< 40%', label: 'Likely Authentic', color: 'bg-emerald-500', note: 'No significant synthetic artifacts detected. Metadata and provenance intact.' },
            ].map((level, i) => (
              <motion.div
                key={level.range}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex items-center gap-4 md:gap-6 p-5 rounded-xl bg-white/5 border border-white/10"
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${level.color}`} />
                <div className="w-20 shrink-0">
                  <span className="font-mono text-sm text-amber">{level.range}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-base text-parchment">{level.label}</div>
                  <div className="text-xs text-stone mt-0.5">{level.note}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How We Detect ── */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <motion.span variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Detection Dimensions</motion.span>
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance text-charcoal">
              47 dimensions of <span className="italic text-amber">analysis</span>.
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {dimensions.map((dim, i) => (
              <motion.div
                key={dim.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="p-5 rounded-xl bg-white-warm border border-stone-light hover:border-amber/20 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
                  <h3 className="font-serif text-base text-charcoal">{dim.name}</h3>
                </div>
                <p className="text-charcoal-mid text-sm leading-relaxed">{dim.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Uncertainty & Limits ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-14">
              <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Limits & Uncertainty</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                We're transparent about what we <span className="italic text-amber">don't know</span>.
              </motion.h2>
            </motion.div>

            <div className="space-y-4">
              {[
                { title: 'Evolving Models', desc: 'Detection capabilities are continuously updated as new generative models emerge. We maintain a model registry with known fingerprints and update detection algorithms accordingly.' },
                { title: 'Adversarial Attacks', desc: 'Sophisticated adversarial techniques can reduce detection confidence. Our multi-dimensional approach mitigates this, but no detection system is foolproof against all attacks.' },
                { title: 'Compression Degradation', desc: 'Heavy compression, resizing, or format conversion can degrade forensic signals. Results on heavily compressed media carry appropriate confidence reductions.' },
                { title: 'False Positives', desc: 'Certain natural images, especially those with heavy filters, HDR processing, or unusual lighting, may trigger detection flags. We surface these signals transparently for human review.' },
                { title: 'Current Scope', desc: 'The current public and early-access direction is image-first. Video remains part of the longer-term product roadmap rather than the first release requirement.' },
              ].map((limit, i) => (
                <motion.div
                  key={limit.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="p-5 md:p-6 rounded-xl bg-white/5 border border-white/10"
                >
                  <h3 className="font-serif text-lg text-parchment mb-2">{limit.title}</h3>
                  <p className="text-stone text-sm leading-relaxed">{limit.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Responsible Use ── */}
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center max-w-2xl mx-auto mb-14">
              <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Responsible Use</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance text-charcoal">
                Built for <span className="italic text-amber">accountability</span>.
              </motion.h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: 'Human-in-the-Loop', desc: 'Verdicts are designed to inform human decision-makers, not replace them. High-stakes decisions require human review of evidence.' },
                { title: 'Audit Trails', desc: 'Every verification generates a complete audit trail, including model version, confidence scores, and all raw evidence data.' },
                { title: 'Unbiased Analysis', desc: 'Our models are trained on diverse datasets spanning multiple generative platforms, geographic regions, and content types.' },
                { title: 'Ethical Guardrails', desc: 'We prohibit use of Provance for mass surveillance, discriminatory content filtering, or any application that violates human rights.' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="p-6 rounded-xl bg-white-warm border border-stone-light"
                >
                  <h3 className="font-serif text-lg text-charcoal mb-2">{item.title}</h3>
                  <p className="text-charcoal-mid text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-10 text-center"
            >
              <Link to="/sample-report" className="inline-flex px-6 py-3 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200">
                View Sample Report
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
