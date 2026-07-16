import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1] } }),
}

export default function DocsPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Developer access."
        description="Use this page to understand the API shape, expected verification flow, and the integration path for teams requesting developer access."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Docs' }]}
      />

      {/* ── Getting Started ── */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-14">
              <motion.span variants={fadeUp} className="eyebrow">Quick Start</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance text-charcoal">
                Verify media in <span className="italic text-trust">three lines</span>.
              </motion.h2>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Register Interest', desc: 'Share your API use case, expected volume, and integration environment through the waitlist or contact flow.', icon: '01' },
                { title: 'Map The Workflow', desc: 'Plan around authenticated submission, status tracking, and structured result retrieval.', icon: '02' },
                { title: 'Expand Over Time', desc: 'Start with core verification and add reporting, callbacks, and operational integration as access expands.', icon: '03' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="surface-card p-6 text-center"
                >
                  <span className="text-amber font-mono text-xs uppercase tracking-[0.2em] mb-3 block">{item.icon}</span>
                  <h3 className="font-serif text-lg text-charcoal mb-2">{item.title}</h3>
                  <p className="text-charcoal-mid text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── API Endpoint ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
              <motion.span variants={fadeUp} className="eyebrow eyebrow-dark">API Reference</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                `POST /v1/verify` <span className="italic text-trust-soft">endpoint</span>.
              </motion.h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {/* Request Example */}
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <span className="ml-3 flex items-center gap-2 text-xs text-stone font-mono">
                    <span className="px-2 py-0.5 bg-emerald-700/50 text-emerald-300 rounded text-[10px] font-bold">POST</span>
                    https://api.provance.io/v1/verify
                  </span>
                </div>
                <div className="p-5 md:p-8">
                  <pre className="text-sm font-mono text-stone leading-relaxed overflow-x-auto">
                    <code>{`curl -X POST https://api.provance.io/v1/verify \\
  -H "Authorization: Bearer sk_pro_xxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "media_url": "https://example.com/suspect-image.jpg",
    "media_type": "image",
    "callback_url": "https://myapp.com/webhooks/provance",
    "include_heatmaps": true
  }'`}</code>
                  </pre>
                </div>
              </div>

              {/* Response Example */}
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <span className="ml-3 flex items-center gap-2 text-xs text-stone font-mono">
                    <span className="px-2 py-0.5 bg-amber-700/50 text-amber-300 rounded text-[10px] font-bold">200</span>
                    Response
                  </span>
                </div>
                <div className="p-5 md:p-8">
                  <pre className="text-sm font-mono text-stone leading-relaxed overflow-x-auto">
                    <code>{`{
  "status": "completed",
  "verdict": "ai_generated",
  "confidence": 0.947,
  "verification_id": "vrf_a3f8c2d4",
  "media": {
    "type": "image",
    "format": "jpeg",
    "dimensions": "2048x1536",
    "file_size_bytes": 4423680
  },
  "summary": {
    "total_dimensions_analyzed": 47,
    "anomalies_detected": 3,
    "model_match": "Stable Diffusion v3.5"
  },
  "evidences": [
    {
      "type": "gan_artifact",
      "severity": "high",
      "confidence": 0.962,
      "description": "Grid pattern detected in high-frequency pixels",
      "heatmap_url": "https://api.provance.io/v1/reports/vrf_a3f8c2d4/heatmap/gan-001"
    }
  ],
  "report": {
    "pdf_url": "https://api.provance.io/v1/reports/vrf_a3f8c2d4/download",
    "summary_url": "https://api.provance.io/v1/reports/vrf_a3f8c2d4/summary",
    "expires_at": "2026-07-25T14:32:00Z"
  },
  "processing_time_ms": 1247
}`}</code>
                  </pre>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Webhooks ── */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
              <motion.span variants={fadeUp} className="eyebrow">Webhooks</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance text-charcoal">
                Async verification via <span className="italic text-trust">webhooks</span>.
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-charcoal-mid text-sm max-w-lg mx-auto">
                Webhooks support asynchronous verification so teams can submit media,
                track state changes, and receive completed results without polling.
              </motion.p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Configurable Callbacks',
                  desc: 'Callback support helps teams plug long-running verification workflows into downstream systems.',
                  items: ['Status lifecycle design', 'Secure delivery direction', 'Operational integration planning'],
                },
                {
                  title: 'Event Types',
                  desc: 'State changes stay explicit so API consumers can track work reliably.',
                  items: ['verification.queued', 'verification.processing', 'verification.completed', 'verification.failed'],
                },
                {
                  title: 'Rate Limits & Quotas',
                  desc: 'Rate limits, quota models, and API access tiers keep integrations predictable as usage grows.',
                  items: ['Access by cohort', 'Review by use case', 'Long-term tiering'],
                },
                {
                  title: 'SDKs & Libraries',
                  desc: 'Language-specific tooling follows the core API so integrations stay stable and well documented.',
                  items: ['TypeScript first', 'Python later', 'Broader SDKs after contract stability'],
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="surface-card p-6"
                >
                  <h3 className="font-serif text-lg text-charcoal mb-2">{item.title}</h3>
                  <p className="text-charcoal-mid text-sm leading-relaxed mb-3">{item.desc}</p>
                  <ul className="space-y-1.5">
                    {item.items.map((li) => (
                      <li key={li} className="flex items-center gap-2 text-xs text-charcoal-mid font-mono">
                        <span className="w-1 h-1 bg-amber rounded-full shrink-0" />
                        {li}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-wrap gap-4 justify-center"
            >
              <Link to="/sample-report" className="btn-primary">
                View Sample Report
              </Link>
              <Link to="/waitlist" className="btn-secondary">
                Register API interest
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
