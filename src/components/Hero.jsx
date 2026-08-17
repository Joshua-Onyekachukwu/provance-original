import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'

const LUXE = [0.32, 0.72, 0, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.85, delay: 0.12 * i, ease: LUXE },
  }),
}

export default function Hero() {
  // The infinite pulse blob is decorative motion — under prefers-reduced-motion
  // it renders as a static glow (no opacity/scale keyframes), while the
  // one-shot fadeUp entrance animations still run (they are short, non-looping
  // opacity/translate transitions).
  const prefersReducedMotion = useReducedMotion()
  return (
    <section className="relative overflow-hidden bg-parchment pt-24 md:pt-28 lg:pt-36">
      <div className="absolute inset-0 forensic-grid opacity-30" />
      <div className="absolute inset-0 hero-gradient" />
      <motion.div
        aria-hidden="true"
        animate={prefersReducedMotion ? undefined : { opacity: [0.45, 0.68, 0.45], scale: [1, 1.04, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-trust/10 blur-3xl"
      />
      <div className="absolute left-[12%] top-[18%] h-48 w-48 rounded-full bg-white/55 blur-3xl" />
      <div className="absolute bottom-0 right-[8%] h-64 w-64 rounded-full bg-amber/8 blur-3xl" />

      <div className="content-container relative z-10 px-6 pb-24 pt-8 md:px-8 md:pb-32 lg:pb-36">
        <div className="mx-auto max-w-5xl text-center">
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="eyebrow mb-8"
            >
              Enterprise AI media verification
            </motion.div>

            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="font-serif text-[2.75rem] leading-[0.98] text-balance text-charcoal sm:text-6xl lg:text-7xl xl:text-[5.6rem] xl:leading-[0.95]"
            >
              Verify suspicious media with{' '}
              <span className="italic text-trust">explainable evidence</span>
              , not black-box scores.
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="mx-auto mt-9 max-w-3xl text-lg leading-relaxed text-charcoal-mid text-pretty sm:text-[1.22rem]"
            >
              Provance gives teams a faster path from upload to defensible findings with
              professional reports, confidence context, and workflows built for
              high-trust review.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="mt-12 flex flex-wrap justify-center gap-4"
            >
              <Link to="/waitlist" className="btn-primary group min-w-[11rem]">
                Join Waitlist
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-transform duration-500 ease-luxe group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
              <Link to="/contact" className="btn-secondary group min-w-[11rem]">
                Request Demo
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-charcoal/5 transition-transform duration-500 ease-luxe group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={4}
              className="mt-14 flex flex-wrap justify-center gap-3 text-[0.68rem] uppercase tracking-[0.18em] text-charcoal-light"
            >
              <span className="stat-pill flex items-center gap-1.5 px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-trust" /> Explainable evidence
              </span>
              <span className="stat-pill flex items-center gap-1.5 px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber" /> Professional reports
              </span>
              <span className="stat-pill flex items-center gap-1.5 px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-trust" /> Enterprise workflows
              </span>
            </motion.div>

            <motion.a
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={5}
              href="#why"
              className="mt-12 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-charcoal-mid transition-colors duration-500 ease-luxe hover:text-charcoal"
            >
              See why teams choose Provance
              <span aria-hidden="true" className="text-trust transition-transform duration-500 ease-luxe group-hover:translate-y-0.5">↓</span>
            </motion.a>
        </div>
      </div>
    </section>
  )
}
