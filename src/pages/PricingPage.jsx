import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1] } }),
}

const tiers = [
  {
    name: 'Trial',
    price: '0',
    period: '14 days',
    desc: 'Evaluate Provance with full-featured access.',
    features: [
      '10 verifications',
      'Image & video support',
      'Web dashboard access',
      'PDF forensic reports',
      'Email support',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Pro',
    price: '49',
    period: '/mo',
    desc: 'For individual professionals and small teams.',
    features: [
      '100 verifications / month',
      'Priority processing',
      'API access (1,000 req/mo)',
      'PDF & JSON reports',
      'Slack community support',
    ],
    cta: 'Start Free Trial',
    featured: false,
  },
  {
    name: 'Team',
    price: 'Custom',
    period: '',
    desc: 'For growing teams with higher verification needs.',
    features: [
      'Unlimited verifications',
      'Priority processing queue',
      'Full API access',
      'SSO & role-based access',
      'Slack & email support',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For organizations requiring dedicated infrastructure.',
    features: [
      'SLA-backed uptime (99.9%)',
      'On-premise deployment option',
      'Dedicated support engineer',
      'Custom model fine-tuning',
      'Audit log exports',
      'SOC 2 Type II reports',
      'Volume discounts available',
    ],
    cta: 'Contact Sales',
    featured: false,
  },
]

export default function PricingPage() {
  return (
    <div className="pt-20 md:pt-24">
      {/* ── Hero ── */}
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl mx-auto text-center">
            <motion.span variants={fadeUp} custom={0} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Pricing</motion.span>
            <motion.h1 variants={fadeUp} custom={1} className="font-serif text-4xl sm:text-5xl lg:text-6xl mt-4 text-balance text-charcoal">
              Simple, transparent <span className="italic text-amber">pricing</span>.
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="mt-6 text-lg text-charcoal-mid leading-relaxed max-w-xl mx-auto">
              Start with a free trial. Scale as your verification needs grow. No hidden fees, no surprises.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing Tiers ── */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {tiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
                className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-500 ${
                  tier.featured
                    ? 'bg-charcoal text-parchment border-amber/30 shadow-xl scale-[1.02] lg:scale-105 z-10'
                    : 'bg-white-warm text-charcoal border-stone-light hover:border-stone'
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber text-charcoal text-xs font-medium rounded-full font-mono uppercase tracking-wider whitespace-nowrap">
                    Most Popular
                  </div>
                )}

                <h3 className={`font-serif text-xl mb-1 ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  {tier.price === 'Custom' ? (
                    <span className={`text-3xl font-medium ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>Custom</span>
                  ) : (
                    <>
                      <span className={`text-4xl font-medium ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>${tier.price}</span>
                      <span className={`text-sm ${tier.featured ? 'text-stone' : 'text-charcoal-mid'}`}>{tier.period}</span>
                    </>
                  )}
                </div>
                <p className={`text-xs mb-5 ${tier.featured ? 'text-stone' : 'text-charcoal-mid'}`}>{tier.desc}</p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((f) => (
                    <li key={f} className={`flex items-start gap-2 text-xs leading-relaxed ${tier.featured ? 'text-stone' : 'text-charcoal-mid'}`}>
                      <svg className="w-4 h-4 shrink-0 text-amber mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  to="/#demo"
                  className={`block text-center py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    tier.featured
                      ? 'bg-amber text-charcoal hover:bg-amber-light'
                      : 'bg-charcoal text-parchment hover:bg-charcoal-soft'
                  }`}
                >
                  {tier.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commercial Logic (Feature Comparison Side Panel) ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
              <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">Commercial Logic</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                What's included at every <span className="italic text-amber">level</span>.
              </motion.h2>
            </motion.div>

            <div className="overflow-x-auto">
              <motion.table
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="w-full text-sm border-collapse"
              >
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 pr-6 text-stone font-medium">Feature</th>
                    <th className="text-center py-4 px-4 text-amber font-mono text-xs">Trial</th>
                    <th className="text-center py-4 px-4 text-amber font-mono text-xs">Pro</th>
                    <th className="text-center py-4 px-4 text-amber font-mono text-xs bg-amber/10">Team</th>
                    <th className="text-center py-4 px-4 text-amber font-mono text-xs">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Monthly verifications', trial: '10', pro: '100', team: 'Unlimited', ent: 'Unlimited' },
                    { name: 'Image verification', trial: '✓', pro: '✓', team: '✓', ent: '✓' },
                    { name: 'Video verification', trial: '✓', pro: '✓', team: '✓', ent: '✓' },
                    { name: 'PDF forensic report', trial: '✓', pro: '✓', team: '✓', ent: '✓' },
                    { name: 'Web dashboard', trial: '✓', pro: '✓', team: '✓', ent: '✓' },
                    { name: 'API access', trial: '—', pro: '1,000 req/mo', team: 'Unlimited', ent: 'Unlimited' },
                    { name: 'Priority processing', trial: '—', pro: 'Standard', team: 'High', ent: 'Highest' },
                    { name: 'SSO / SAML', trial: '—', pro: '—', team: '✓', ent: '✓' },
                    { name: 'Role-based access', trial: '—', pro: '—', team: '✓', ent: '✓' },
                    { name: 'Audit log exports', trial: '—', pro: '—', team: '—', ent: '✓' },
                    { name: 'On-premise deployment', trial: '—', pro: '—', team: '—', ent: 'Optional' },
                    { name: 'Dedicated support', trial: '—', pro: '—', team: 'Slack', ent: 'Engineer' },
                    { name: 'SLA guarantee', trial: '—', pro: '—', team: '—', ent: '99.9%' },
                  ].map((row, i) => (
                    <tr key={row.name} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                      <td className="py-3.5 pr-6 text-parchment text-sm">{row.name}</td>
                      <td className="text-center py-3.5 px-4 text-stone text-sm font-mono">{row.trial}</td>
                      <td className="text-center py-3.5 px-4 text-stone text-sm font-mono">{row.pro}</td>
                      <td className="text-center py-3.5 px-4 text-amber text-sm font-mono bg-amber/5">{row.team}</td>
                      <td className="text-center py-3.5 px-4 text-stone text-sm font-mono">{row.ent}</td>
                    </tr>
                  ))}
                </tbody>
              </motion.table>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-8 text-center text-stone text-sm"
            >
              Need a custom plan? <Link to="/#demo" className="text-amber hover:text-amber-light underline transition-colors">Contact our sales team</Link>.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="content-container max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
            <motion.span variants={fadeUp} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">FAQ</motion.span>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance text-charcoal">
              Questions about <span className="italic text-amber">pricing</span>?
            </motion.h2>
          </motion.div>

          <div className="space-y-3">
            {[
              { q: 'Can I switch plans at any time?', a: 'Yes. You can upgrade, downgrade, or cancel at any time. Changes take effect at the start of your next billing cycle.' },
              { q: 'What counts as a verification?', a: 'Each submitted image or video file counts as one verification. Re-analysis of the same file within 30 days does not count toward your quota.' },
              { q: 'Do you offer annual pricing?', a: 'Yes. Annual plans receive a 20% discount compared to monthly billing. Contact sales for annual pricing.' },
              { q: 'Is there a free trial?', a: 'Yes. The Trial tier gives you full access to all features for 14 days with 10 verifications. No credit card required.' },
            ].map((item) => (
              <details key={item.q} className="group bg-white-warm rounded-xl border border-stone-light overflow-hidden open:border-amber/20 transition-all duration-300">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                  <span className="font-serif text-base text-charcoal pr-4">{item.q}</span>
                  <svg className="w-4 h-4 text-charcoal-light shrink-0 group-open:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 pt-0">
                  <p className="text-charcoal-mid text-sm leading-relaxed">{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
