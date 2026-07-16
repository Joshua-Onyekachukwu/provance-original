import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.15 * i, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-parchment pt-24 md:pt-28 lg:pt-32">
      <div className="absolute inset-0 forensic-grid opacity-30" />
      <div className="absolute inset-0 hero-gradient" />
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.45, 0.68, 0.45], scale: [1, 1.04, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-trust/10 blur-3xl"
      />
      <div className="absolute left-[12%] top-[18%] h-48 w-48 rounded-full bg-white/55 blur-3xl" />
      <div className="absolute bottom-0 right-[8%] h-64 w-64 rounded-full bg-amber/8 blur-3xl" />

      <div className="content-container relative z-10 px-6 pb-20 pt-8 md:px-8 md:pb-24 lg:pb-28">
        <div className="mx-auto max-w-5xl text-center">
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="eyebrow mb-6"
            >
              Enterprise AI media verification
            </motion.div>

            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-[5.35rem] leading-[0.92] text-balance text-charcoal"
            >
              Verify suspicious media with{' '}
              <span className="italic text-trust">explainable evidence</span>
              , not black-box scores.
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-charcoal-mid text-pretty sm:text-[1.2rem]"
            >
              Provance gives teams a faster path from upload to defensible findings with
              professional reports, confidence context, and workflows built for
              high-trust review.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <Link to="/waitlist" className="btn-primary min-w-[10.5rem]">
                Join Waitlist
              </Link>
              <Link to="/contact" className="btn-secondary min-w-[10.5rem]">
                Request Demo
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={4}
              className="mt-12 flex flex-wrap justify-center gap-3 text-[0.68rem] uppercase tracking-[0.18em] text-charcoal-light"
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
              <span className="stat-pill flex items-center gap-1.5 px-4 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber" /> Image-first early access
              </span>
            </motion.div>

            <motion.a
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={5}
              href="#why"
              className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-charcoal-mid transition-colors hover:text-charcoal"
            >
              See why teams choose Provance
              <span aria-hidden="true" className="text-trust">↓</span>
            </motion.a>
        </div>
      </div>
    </section>
  )
}
