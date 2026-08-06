import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const tiers = [
  {
    name: 'Early Access',
    price: 'Waitlist',
    period: '',
    desc: 'Join the first controlled image-review cohorts.',
    features: [
      'Priority waitlist review',
      'Guided onboarding',
      'Feedback-driven rollout',
      'Early workflow access',
    ],
    cta: 'Join Waitlist',
    href: '/waitlist',
    featured: false,
  },
  {
    name: 'Pro',
    price: 'From $49',
    period: '/mo',
    desc: 'For individual professionals with repeat review needs.',
    features: [
      'Image-review workflow',
      'Result history direction',
      'Report-ready output path',
      'Priority product feedback loop',
    ],
    cta: 'Talk to us',
    href: '/contact',
    featured: false,
  },
  {
    name: 'Team',
    price: 'From $249',
    period: '/mo',
    desc: 'For teams with higher verification volume and shared review.',
    features: [
      'Shared onboarding',
      'Workflow mapping',
      'Pilot planning',
      'Priority product support',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For organizations with higher-trust requirements and custom implementation.',
    features: [
      'Custom evaluation path',
      'Security review support',
      'Deployment planning',
      'Long-term enterprise roadmap',
    ],
    cta: 'Contact Sales',
    href: '/contact',
    featured: false,
  },
]

export default function Pricing() {
  return (
    <section id="pricing" className="section-padding bg-parchment-light relative overflow-hidden">
      <div className="content-container">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="eyebrow">
            Pricing
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance text-charcoal">
            Clear paths into <span className="italic text-trust">Provance</span>.
          </motion.h2>
        </motion.div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
              className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-500 ${
                tier.featured
                  ? 'surface-card-dark text-parchment scale-[1.02] xl:scale-105 z-10'
                  : 'surface-card text-charcoal hover:-translate-y-1'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-trust px-3 py-1 text-xs font-medium uppercase tracking-wider text-white font-mono whitespace-nowrap">
                  Best for teams
                </div>
              )}
              <h3 className={`font-serif text-2xl mb-1 ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>{tier.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                {tier.price === 'Custom' ? (
                  <span className={`text-3xl font-medium ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>Custom</span>
                ) : (
                  <span className={`text-3xl font-medium ${tier.featured ? 'text-parchment' : 'text-charcoal'}`}>{tier.price}</span>
                )}
                {tier.period ? (
                  <span className={`text-sm font-mono ${tier.featured ? 'text-stone' : 'text-charcoal-light'}`}>{tier.period}</span>
                ) : null}
              </div>
              <p className={`text-sm mb-6 ${tier.featured ? 'text-stone' : 'text-charcoal-mid'}`}>{tier.desc}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${tier.featured ? 'text-stone' : 'text-charcoal-mid'}`}>
                    <svg className="w-4 h-4 shrink-0 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center text-sm leading-relaxed text-charcoal-mid"
        >
          Indicative commercial pricing for general availability. Early-access members lock
          founding rates and priority rollout.{' '}
          <Link to="/pricing" className="text-trust-strong hover:text-trust underline transition-colors">
            See the full pricing model
          </Link>.
        </motion.p>
      </div>
    </section>
  )
}
