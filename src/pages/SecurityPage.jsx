import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1] } }),
}

export default function SecurityPage() {
  return (
    <div className="pt-20 md:pt-24">
      {/* ── Hero ── */}
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl mx-auto text-center">
            <motion.span variants={fadeUp} custom={0} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Security</motion.span>
            <motion.h1 variants={fadeUp} custom={1} className="font-serif text-4xl sm:text-5xl lg:text-6xl mt-4 text-balance text-charcoal">
              Trust is our <span className="italic text-amber">infrastructure</span>.
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-charcoal-mid leading-relaxed max-w-xl mx-auto">
              Every aspect of Provance is built with security and compliance at its core. From data retention to audit trails, we provide the controls your organization needs.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Data Retention ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-14">
              <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Data Retention</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                Your data, <span className="italic text-amber">your control</span>.
              </motion.h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Retention Policies',
                  items: [
                    'Uploaded media retained for the duration of your active subscription',
                    'Configurable auto-deletion timelines (7, 30, 90, 365 days)',
                    'Immediate deletion on account termination',
                    'Reports archived indefinitely for audit compliance (Enterprise)',
                  ],
                },
                {
                  title: 'Data Handling',
                  items: [
                    'All uploads encrypted at rest (AES-256) and in transit (TLS 1.3)',
                    'Media processed in ephemeral, isolated environments',
                    'No training on customer data without explicit written consent',
                    'SOC 2 Type II certified data centers',
                  ],
                },
              ].map((col, i) => (
                <motion.div
                  key={col.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10"
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
              <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Audit Logs</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance text-charcoal">
                Every action, <span className="italic text-amber">recorded</span>.
              </motion.h2>
            </motion.div>

            <div className="space-y-6">
              {[
                {
                  title: 'Complete Traceability',
                  desc: 'Every verification, API call, user action, and configuration change is logged with timestamps, actor identity, and before/after state. Logs are immutable and cryptographically signed.',
                },
                {
                  title: 'Export & Integration',
                  desc: 'Export audit logs in JSON, CSV, or syslog format. Integrate with your SIEM of choice including Splunk, Datadog, and Amazon Security Lake. Log retention configurable up to 7 years.',
                },
                {
                  title: 'Compliance Ready',
                  desc: 'Audit logs meet the requirements of SOC 2, ISO 27001, FedRAMP, and GDPR. Each log entry includes a cryptographic hash for tamper detection, ensuring chain-of-custody integrity.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="p-6 md:p-8 rounded-2xl bg-white-warm border border-stone-light"
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
                <span className="ml-3 text-xs text-stone font-mono">audit-log — tail -f</span>
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
              <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Enterprise Readiness</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                Built for the <span className="italic text-amber">enterprise</span>.
              </motion.h2>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { title: 'SSO & SCIM', desc: 'SAML 2.0, OAuth 2.0, and SCIM provisioning. Support for Okta, Azure AD, Google Workspace, and OneLogin.' },
                { title: 'Role-Based Access', desc: 'Granular permissions for owners, admins, editors, reviewers, and auditors. Custom roles available.' },
                { title: 'Private Cloud', desc: 'Deploy Provance in your VPC or on-premises. Dedicated instances with isolated networking and customer-managed keys.' },
                { title: 'Compliance Certifications', desc: 'SOC 2 Type II (annually), ISO 27001 (in progress), GDPR compliant. Penetration testing reports available under NDA.' },
                { title: 'SLA Guarantee', desc: '99.9% uptime SLA for Enterprise plans. Financial remediation for verified downtime incidents.' },
                { title: 'Dedicated Support', desc: 'Named support engineer with 15-minute response time for critical issues. 24/7 coverage available.' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="p-6 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-amber/20 transition-all duration-300"
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
              <Link to="/#demo" className="inline-flex px-6 py-3 bg-amber text-charcoal font-medium text-sm rounded-xl hover:bg-amber-light transition-all duration-200">
                Request Enterprise Demo
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
