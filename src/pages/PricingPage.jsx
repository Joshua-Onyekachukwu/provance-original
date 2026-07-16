import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1] } }),
}

const tiers = [
  {
    name: 'Early Access',
    price: 'Waitlist',
    period: '',
    desc: 'Join the first controlled image-review cohorts.',
    features: [
      'Waitlist review',
      'Guided onboarding',
      'Feedback-led rollout',
      'Priority updates',
      'Email support',
    ],
    cta: 'Join Waitlist',
    href: '/waitlist',
    featured: false,
  },
  {
    name: 'Pro',
    price: 'Custom',
    period: '',
    desc: 'For individual professionals with repeat review needs.',
    features: [
      'Image-review workflow',
      'Result history direction',
      'Report-ready output path',
      'Priority product feedback loop',
      'Email support',
    ],
    cta: 'Talk to us',
    href: '/contact',
    featured: false,
  },
  {
    name: 'Team',
    price: 'Custom',
    period: '',
    desc: 'For growing teams with higher verification needs.',
    features: [
      'Pilot planning',
      'Workflow mapping',
      'Shared onboarding',
      'Priority product support',
      'Roadmap alignment',
      'Custom rollout planning',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For organizations requiring dedicated infrastructure.',
    features: [
      'Security and review discussions',
      'Deployment-path evaluation',
      'Long-term workflow design',
      'Custom implementation planning',
      'Enterprise roadmap support',
      'Dedicated commercial conversation',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    featured: false,
  },
]

export default function PricingPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Commercial paths built for trust-critical work."
        description="Choose the access path that fits your workflow today, then expand into team support, security review, and deeper integration as your volume grows."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Pricing' }]}
      />

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
                    ? 'surface-card-dark text-parchment scale-[1.02] lg:scale-105 z-10'
                    : 'surface-card text-charcoal hover:-translate-y-1'
                }`}
              >
                {tier.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-trust px-3 py-1 text-xs font-medium uppercase tracking-wider text-white font-mono whitespace-nowrap">
                    Best for teams
                  </div>
                )}

                <h3 className={`font-serif text-xl mb-1 ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  {tier.price === 'Custom' ? (
                    <span className={`text-3xl font-medium ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>Custom</span>
                  ) : (
                    <span className={`text-3xl font-medium ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>{tier.price}</span>
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
                  to={tier.href}
                  className={`block rounded-xl py-3 text-center text-sm font-medium transition-all duration-200 ${
                    tier.featured
                      ? 'btn-primary'
                      : 'btn-secondary'
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
              <motion.span variants={fadeUp} className="eyebrow eyebrow-dark">Commercial Logic</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                What changes at each <span className="italic text-trust-soft">level</span>.
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
                    <th className="text-center py-4 px-4 text-amber font-mono text-xs">Early Access</th>
                    <th className="text-center py-4 px-4 text-amber font-mono text-xs">Pro</th>
                    <th className="text-center py-4 px-4 text-amber font-mono text-xs bg-amber/10">Team</th>
                    <th className="text-center py-4 px-4 text-amber font-mono text-xs">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Access path', trial: 'Waitlist', pro: 'Direct review', team: 'Pilot', ent: 'Custom' },
                    { name: 'Image-first onboarding', trial: '✓', pro: '✓', team: '✓', ent: '✓' },
                    { name: 'Report-ready direction', trial: '✓', pro: '✓', team: '✓', ent: '✓' },
                    { name: 'Dedicated rollout support', trial: 'Not yet', pro: 'Not yet', team: 'Included', ent: 'Included' },
                    { name: 'Security review discussion', trial: 'Not yet', pro: 'Not yet', team: 'Not yet', ent: 'Included' },
                    { name: 'API roadmap alignment', trial: 'Not yet', pro: 'Planned', team: 'Planned', ent: 'Planned' },
                    { name: 'Team workflow planning', trial: 'Not yet', pro: 'Not yet', team: 'Included', ent: 'Included' },
                    { name: 'Custom implementation path', trial: 'Not yet', pro: 'Not yet', team: 'Optional', ent: 'Included' },
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
              Need a custom plan? <Link to="/contact" className="text-amber hover:text-amber-light underline transition-colors">Talk to the Provance team</Link>.
            </motion.p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="content-container max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
            <motion.span variants={fadeUp} className="eyebrow">FAQ</motion.span>
            <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl mt-4 text-balance text-charcoal">
              Questions about <span className="italic text-trust">pricing</span>?
            </motion.h2>
          </motion.div>

          <div className="space-y-3">
            {[
              { q: 'How do I choose the right access path?', a: 'Start with the waitlist if you are exploring the product on your own. Contact us if you need repeat workflows, team review, or security conversations.' },
              { q: 'Is pricing self-serve yet?', a: 'Not yet. Access is handled through early cohorts and direct conversations so rollout, support, and security needs can be matched correctly.' },
              { q: 'Do you support teams and enterprise buyers?', a: 'Yes. Team and enterprise paths are available for organizations that need workflow planning, rollout support, or custom security discussions.' },
              { q: 'Can I talk to someone before joining?', a: 'Yes. Use the contact page if you want a demo, design-partner conversation, or help choosing between waitlist and team access.' },
            ].map((item) => (
              <details key={item.q} className="surface-card group overflow-hidden open:border-trust/18 transition-all duration-300">
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
