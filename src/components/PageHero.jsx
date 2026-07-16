import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

export default function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs = [],
  meta = [],
  actions = [],
  align = 'left',
}) {
  const centered = align === 'center'
  const hasMeta = meta.length > 0
  const heroLayoutClass = centered
    ? 'lg:grid-cols-1'
    : hasMeta
      ? 'lg:grid-cols-[minmax(0,1.1fr)_22rem] lg:items-end'
      : 'lg:grid-cols-1'

  return (
    <section className="page-hero section-padding relative overflow-hidden bg-parchment">
      <div className="page-hero-orb page-hero-orb-left" />
      <div className="page-hero-orb page-hero-orb-right" />
      <div className="absolute inset-0 forensic-grid opacity-[0.22]" />

      <div className="content-container relative z-10">
        {breadcrumbs.length ? (
          <motion.nav
            initial="hidden"
            animate="visible"
            className={`mb-8 flex flex-wrap items-center gap-2 ${centered ? 'justify-center' : ''}`}
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((item, index) =>
              item.href ? (
                <motion.div key={item.label} variants={fadeUp} custom={index} className="flex items-center gap-2">
                  <Link to={item.href} className="page-hero-crumb">
                    {item.label}
                  </Link>
                  {index < breadcrumbs.length - 1 ? <span className="text-charcoal-light">/</span> : null}
                </motion.div>
              ) : (
                <motion.div key={item.label} variants={fadeUp} custom={index} className="flex items-center gap-2">
                  <span className="page-hero-crumb page-hero-crumb-active">{item.label}</span>
                </motion.div>
              ),
            )}
          </motion.nav>
        ) : null}

        <div className={`grid gap-8 ${heroLayoutClass}`}>
          <motion.div
            initial="hidden"
            animate="visible"
            className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}
          >
            {eyebrow ? (
              <motion.span variants={fadeUp} custom={0} className="eyebrow">
                {eyebrow}
              </motion.span>
            ) : null}
            <motion.h1
              variants={fadeUp}
              custom={eyebrow ? 1 : 0}
              className={`${eyebrow ? 'mt-5' : ''} font-serif text-4xl text-balance text-charcoal sm:text-5xl lg:text-6xl`}
            >
              {title}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              custom={eyebrow ? 2 : 1}
              className={`mt-6 text-lg leading-relaxed text-charcoal-mid ${centered ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}
            >
              {description}
            </motion.p>

            {actions.length ? (
              <motion.div
                variants={fadeUp}
                custom={eyebrow ? 3 : 2}
                className={`mt-8 flex flex-wrap gap-4 ${centered ? 'justify-center' : ''}`}
              >
                {actions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.href}
                    className={action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}
                  >
                    {action.label}
                  </Link>
                ))}
              </motion.div>
            ) : null}
          </motion.div>

          {!centered && hasMeta ? (
            <motion.aside
              initial="hidden"
              animate="visible"
              className="page-hero-panel hidden lg:block"
            >
              <div className="space-y-4">
                {meta.map((item, index) => (
                  <motion.div key={item.label} variants={fadeUp} custom={index + 2} className="page-hero-meta-item">
                    <div className="page-hero-meta-label">{item.label}</div>
                    <div className="mt-2 text-sm leading-relaxed text-charcoal">{item.value}</div>
                  </motion.div>
                ))}
              </div>
            </motion.aside>
          ) : null}
        </div>

        {centered && hasMeta ? (
          <motion.div
            initial="hidden"
            animate="visible"
            className="mt-10 grid gap-4 md:grid-cols-3"
          >
            {meta.map((item, index) => (
              <motion.div key={item.label} variants={fadeUp} custom={index + 3} className="page-hero-meta-item">
                <div className="page-hero-meta-label">{item.label}</div>
                <div className="mt-2 text-sm leading-relaxed text-charcoal">{item.value}</div>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </div>
    </section>
  )
}
