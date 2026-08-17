import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

const LUXE = [0.32, 0.72, 0, 1]

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
      <div className="absolute inset-0 hero-gradient opacity-60" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: LUXE } } }} className="eyebrow">
            Pricing
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.08, ease: LUXE } } }} className="font-serif text-3xl sm:text-4xl lg:text-[3.4rem] lg:leading-[1.05] mt-5 text-balance text-charcoal">
            Clear paths into <span className="italic text-trust">Provance</span>.
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.08, ease: LUXE }}
              className={tier.featured ? 'xl:scale-[1.03] z-10' : ''}
            >
              <div className={tier.featured ? 'bezel-shell-dark h-full' : 'bezel-shell h-full'}>
                <div
                  className={`relative flex h-full flex-col p-7 ${
                    tier.featured ? 'bezel-core-dark' : 'bezel-core'
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
                    className={`group inline-flex w-full items-center justify-center rounded-full py-3 text-center text-sm font-medium transition-all duration-500 ease-luxe active:scale-[0.98] ${
                      tier.featured
                        ? 'btn-primary'
                        : 'btn-secondary'
                    }`}
                  >
                    {tier.cta}
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-500 ease-luxe group-hover:translate-x-0.5 ${
                        tier.featured ? 'bg-white/15' : 'bg-charcoal/5'
                      }`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6, ease: LUXE }}
          className="mt-10 text-center text-sm leading-relaxed text-charcoal-mid"
        >
          Indicative commercial pricing for general availability. Early-access members lock
          founding rates and priority rollout.{' '}
          <Link to="/pricing" className="text-trust-strong hover:text-trust underline transition-colors duration-500 ease-luxe">
            See the full pricing model
          </Link>.
        </motion.p>
      </div>
    </section>
  )
}
