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
      <div className="absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(circle_at_top,rgba(217,119,6,0.12),transparent_38%)]" />
      <motion.div
        aria-hidden="true"
        animate={{ opacity: [0.45, 0.68, 0.45], scale: [1, 1.04, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-24 h-72 w-72 -translate-x-1/2 rounded-full bg-amber/10 blur-3xl"
      />
      <div className="absolute left-[12%] top-[18%] h-48 w-48 rounded-full bg-white/55 blur-3xl" />
      <div className="absolute bottom-0 right-[8%] h-64 w-64 rounded-full bg-amber/8 blur-3xl" />

      <div className="content-container relative z-10 px-6 pb-20 pt-8 md:px-8 md:pb-24 lg:pb-28">
        <div className="mx-auto max-w-4xl text-center">
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-subtle/60 border border-amber/20 rounded-full text-xs text-amber uppercase tracking-widest font-medium mb-6"
            >
              <span className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse" />
              Trust Infrastructure
            </motion.div>

            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[0.94] text-balance text-charcoal"
            >
              The fastest trustworthy{' '}
              <span className="italic text-amber">image and video</span>{' '}
              verification platform
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-charcoal-mid text-pretty sm:text-xl"
            >
              With explainable evidence, downloadable forensic reports, and
              enterprise-ready trust workflows.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="mt-10 flex flex-wrap justify-center gap-4"
            >
              <Link to="/waitlist"
                className="px-7 py-3.5 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200 tracking-wide shadow-lg shadow-charcoal/10"
              >
                Join Waitlist
              </Link>
              <Link to="/contact"
                className="px-7 py-3.5 border border-stone text-charcoal font-medium text-sm rounded-xl hover:border-charcoal/30 hover:bg-white-warm/50 transition-all duration-200 tracking-wide"
              >
                Request Demo
              </Link>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={4}
              className="mt-12 flex flex-wrap justify-center gap-3 text-xs uppercase tracking-wider text-charcoal-light"
            >
              <span className="flex items-center gap-1.5 rounded-full border border-stone-light/80 bg-white-warm/70 px-4 py-2 shadow-[0_18px_45px_rgba(26,26,26,0.05)]">
                <span className="w-1 h-1 bg-amber rounded-full" /> Image-first beta
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-stone-light/80 bg-white-warm/70 px-4 py-2 shadow-[0_18px_45px_rgba(26,26,26,0.05)]">
                <span className="w-1 h-1 bg-amber rounded-full" /> Explainable evidence
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-stone-light/80 bg-white-warm/70 px-4 py-2 shadow-[0_18px_45px_rgba(26,26,26,0.05)]">
                <span className="w-1 h-1 bg-amber rounded-full" /> Professional workflows
              </span>
            </motion.div>

            <motion.a
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={5}
              href="#why"
              className="mt-10 inline-flex items-center gap-2 text-sm text-charcoal-mid transition-colors hover:text-charcoal"
            >
              See why teams choose Provance
              <span aria-hidden="true" className="text-amber">↓</span>
            </motion.a>
        </div>
      </div>
    </section>
  )
}
