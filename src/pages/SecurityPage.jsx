import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1] } }),
}

export default function SecurityPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Trust is part of the infrastructure."
        description="Provance is built around private handling, controlled access, and traceable review workflows so teams can verify sensitive media with confidence."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Security' }]}
      />

      {/* ── Data Retention ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-14">
              <motion.span variants={fadeUp} className="eyebrow eyebrow-dark">Data Retention</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                Your data, <span className="italic text-trust-soft">your control</span>.
              </motion.h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Retention Policies',
                  items: [
                    'Set retention windows around account, workflow, and review needs',
                    'Apply deletion rules with clear access and approval boundaries',
                    'Keep uploads and artifacts behind private storage controls',
                    'Use explicit retention rules for higher-trust workflows',
                  ],
                },
                {
                  title: 'Data Handling',
                  items: [
                    'Encrypt media in transit and at rest',
                    'Keep customer media out of training use by default',
                    'Treat access controls and auditability as first-class requirements',
                    'Favor private storage and clear operational visibility',
                  ],
                },
              ].map((col, i) => (
                <motion.div
                  key={col.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="surface-card-dark p-6 md:p-8"
                >
                  <h3 className="font-serif text-xl text-parchment mb-4">{col.title}</h3>
                  <ul className="space-y-3">
                    {col.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-stone">
                        <svg className="w-4 h-4 shrink-0 text-amber mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Audit Logs ── */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-14">
              <motion.span variants={fadeUp} className="eyebrow">Audit Logs</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance text-charcoal">
                Every action, <span className="italic text-trust">recorded</span>.
              </motion.h2>
            </motion.div>

            <div className="space-y-6">
              {[
                {
                  title: 'Complete Traceability',
                  desc: 'Record meaningful workflow events with timestamps, actor identity, and enough context to support investigation and review.',
                },
                {
                  title: 'Export & Integration',
                  desc: 'Export, integration, and retention controls keep review workflows easier to manage across teams and clients.',
                },
                {
                  title: 'Compliance Ready',
                  desc: 'Compliance and evidence posture start with a clean audit foundation, documented controls, and review-ready records.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="surface-card p-6 md:p-8"
                >
                  <h3 className="font-serif text-xl text-charcoal mb-2">{item.title}</h3>
                  <p className="text-charcoal-mid text-sm leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Audit log mockup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-8 bg-charcoal rounded-xl border border-white/10 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                <span className="ml-3 text-xs text-stone font-mono">audit-log | tail -f</span>
              </div>
              <div className="p-5 md:p-6 font-mono text-xs leading-relaxed space-y-2 overflow-x-auto">
                <div className="text-stone">2026-06-25T10:23:14Z  VERIFY  user:jdoe@newsroom.io  status:completed  verdict:ai_generated  confidence:0.947</div>
                <div className="text-stone">2026-06-25T10:22:58Z  REPORT  user:jdoe@newsroom.io  action:download  report:a3f8c2-d4  format:pdf</div>
                <div className="text-stone">2026-06-25T10:22:30Z  API     service:webhook-001     method:POST  endpoint:/v1/verify  status:200</div>
                <div className="text-stone">2026-06-25T10:21:15Z  CONFIG  admin:asmith@provance.io action:update_retention  from:90d  to:365d</div>
                <div className="text-amber/60">2026-06-25T10:20:00Z  AUTH    user:asmith@provance.io  action:login  method:saml  status:success</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Enterprise Readiness ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-14">
              <motion.span variants={fadeUp} className="eyebrow eyebrow-dark">Enterprise Readiness</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                Built for the <span className="italic text-trust-soft">enterprise</span>.
              </motion.h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: 'Access Controls', desc: 'Waitlist review, invite-based access, and role-aware product controls define how approved users enter the platform.' },
                { title: 'Private Storage Direction', desc: 'The production architecture will favor private-by-default file handling and clearer separation between metadata, uploads, and generated artifacts.' },
                { title: 'Operational Auditability', desc: 'Meaningful system events, user actions, and workflow state changes should be traceable as the product moves from beta toward production readiness.' },
                { title: 'Enterprise Review Support', desc: 'Security and deployment conversations will be handled directly rather than hidden behind vague trust language or unsupported certification claims.' },
                { title: 'Deployment Planning', desc: 'The backend recommendation assumes real hosted environments beyond local development, with local setup used only for testing and iteration.' },
                { title: 'Operational Hardening', desc: 'Monitoring, rate limiting, session security, and stronger environment separation support a safer authenticated rollout.' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="surface-card-dark p-6 transition-all duration-300 hover:-translate-y-1"
                >
                  <h3 className="font-serif text-lg text-parchment mb-2">{item.title}</h3>
                  <p className="text-stone text-sm leading-relaxed">{item.desc}</p>
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
              <Link to="/contact" className="btn-primary">
                Talk to us about security and access
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
