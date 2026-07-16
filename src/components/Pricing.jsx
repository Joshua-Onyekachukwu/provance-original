import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const tiers = [
  {
    name: 'Early Access',
    price: 'Waitlist',
    desc: 'For individual professionals who want to join the first image-review cohorts.',
    features: ['Priority waitlist review', 'Guided onboarding', 'Feedback-driven rollout', 'Early workflow access'],
    cta: 'Join Waitlist',
    href: '/waitlist',
    featured: false,
  },
  {
    name: 'Team',
    price: 'Custom',
    desc: 'For teams evaluating Provance for repeat verification workflows.',
    features: ['Shared onboarding', 'Pilot planning', 'Workflow mapping', 'Priority product support'],
    cta: 'Contact Sales',
    href: '/contact',
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For organizations with higher-trust requirements and custom implementation needs.',
    features: ['Custom evaluation path', 'Security review support', 'Deployment planning', 'Long-term enterprise roadmap'],
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

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className={`relative p-6 md:p-8 rounded-2xl border transition-all duration-500 ${
                tier.featured
                  ? 'surface-card-dark text-parchment scale-[1.02] md:scale-105'
                  : 'surface-card text-charcoal hover:-translate-y-1'
              }`}
            >
              {tier.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-trust px-3 py-1 text-xs font-medium uppercase tracking-wider text-white font-mono">
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
              </div>
              <p className={`text-sm mb-6 ${tier.featured ? 'text-stone' : 'text-charcoal-mid'}`}>{tier.desc}</p>
              <ul className="space-y-3 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${tier.featured ? 'text-stone' : 'text-charcoal-mid'}`}>
                    <svg className="w-4 h-4 shrink-0 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
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
  )
}
