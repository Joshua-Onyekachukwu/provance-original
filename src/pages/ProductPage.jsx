import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1] } }),
}

const verdictSteps = [
  { label: 'Submission', desc: 'Start with an uploaded image or video file and keep the case tied to the original asset.' },
  { label: 'Signal Review', desc: 'Inspect metadata, artifact patterns, confidence signals, and supporting forensic detail in one view.' },
  { label: 'Evidence Extraction', desc: 'See what shaped the result instead of relying on a single score.' },
  { label: 'Report Output', desc: 'Export a clear record that another reviewer can inspect and share.' },
]

export default function ProductPage() {
  return (
    <div className="pt-20 md:pt-24">
      {/* ── Hero ── */}
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl mx-auto text-center">
            <motion.span variants={fadeUp} custom={0} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Product</motion.span>
            <motion.h1 variants={fadeUp} custom={1} className="font-serif text-4xl sm:text-5xl lg:text-6xl mt-4 text-balance text-charcoal">
              Every verdict comes with <span className="italic text-amber">evidence</span>.
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-charcoal-mid leading-relaxed max-w-xl mx-auto">
              Provance helps individuals and teams review suspicious image and video
              media with clearer reasoning, stronger context, and outputs they can share.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Verdict & Evidence Breakdown ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}>
              <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">How It Works</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                From upload to <span className="italic text-amber">verdict</span>.
              </motion.h2>
            </motion.div>

            <div className="space-y-8">
              {verdictSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex gap-5"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-amber/20 border border-amber/30 flex items-center justify-center shrink-0">
                      <span className="text-amber text-xs font-mono font-bold">{i + 1}</span>
                    </div>
                    {i < verdictSteps.length - 1 && <div className="w-px flex-1 bg-white/10 mt-2" />}
                  </div>
                  <div className="pb-8">
                    <h3 className="font-serif text-lg text-parchment mb-2">{step.label}</h3>
                    <p className="text-stone text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow Readiness ── */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center max-w-2xl mx-auto mb-16">
            <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Workflow Readiness</motion.span>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance text-charcoal">
              Fits your existing <span className="italic text-amber">pipeline</span>.
            </motion.h2>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { title: 'Review-first UX', desc: 'Keep evidence, confidence language, and key findings together from first pass to final decision.', icon: '01' },
                { title: 'Structured Access', desc: 'Use controlled onboarding, invite-based access, and protected workflows as access expands.', icon: '02' },
                { title: 'Report-ready Outputs', desc: 'Share a structured result that gives teams and clients the same decision context.', icon: '03' },
                { title: 'Auditability', desc: 'Track what was reviewed, when it changed, and how the final result was reached.', icon: '04' },
                { title: 'Developer Path', desc: 'Extend the product into API-driven workflows when teams need verification inside their own systems.', icon: '05' },
                { title: 'Security Controls', desc: 'Add storage, access, and review controls that fit both individual use and larger environments.', icon: '06' },
              ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="p-6 rounded-xl bg-white-warm border border-stone-light hover:border-amber/20 hover:shadow-sm transition-all duration-300"
              >
                  <span className="text-amber font-mono text-xs uppercase tracking-[0.2em]">{item.icon}</span>
                <h3 className="font-serif text-lg text-charcoal mb-2">{item.title}</h3>
                <p className="text-charcoal-mid text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API Path ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
              <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">API</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                Simple, powerful <span className="italic text-amber">API</span>.
              </motion.h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                <span className="ml-3 text-xs text-stone font-mono">POST /v1/verify</span>
              </div>
              <div className="p-5 md:p-8">
                <pre className="text-sm font-mono text-stone leading-relaxed overflow-x-auto">
                  <code>{`{
  "status": "completed",
  "verdict": "ai_generated",
  "confidence": 0.947,
  "media": {
    "type": "image",
    "format": "jpeg",
    "dimensions": "2048x1536"
  },
  "evidences": [
    {
      "type": "gan_artifact",
      "severity": "high",
      "description": "Grid pattern detected in high-frequency pixels",
      "heatmap_url": "https://api.provance.io/v1/reports/a3f8c2/heatmap"
    }
  ],
  "report_url": "https://api.provance.io/v1/reports/a3f8c2/download"
}`}</code>
                </pre>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-8 text-center"
            >
              <Link to="/docs" className="inline-flex px-6 py-3 bg-amber text-charcoal font-medium text-sm rounded-xl hover:bg-amber-light transition-all duration-200">
                View API Documentation
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
