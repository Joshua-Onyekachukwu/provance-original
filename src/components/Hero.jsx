import { motion } from 'framer-motion'
import SignalVisualizer from './forensic/SignalVisualizer'
import VeracitySeal from './forensic/VeracitySeal'

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
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20 md:pt-24">
      <div className="absolute inset-0 forensic-grid opacity-40" />
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -left-32 w-80 h-80 bg-amber/5 rounded-full blur-3xl" />

      <div className="content-container section-padding relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="max-w-xl">
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={0}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-subtle/60 border border-amber/20 rounded-full text-xs text-amber uppercase tracking-widest font-medium mb-6"
            >
              <span className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse" />
              Trust Infrastructure
            </motion.div>

            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible" custom={1}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-tight text-balance text-charcoal"
            >
              The fastest trustworthy{' '}
              <span className="italic text-amber">image and video</span>{' '}
              verification platform
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" custom={2}
              className="mt-6 text-lg sm:text-xl text-charcoal-mid leading-relaxed text-pretty max-w-lg"
            >
              with explainable evidence, downloadable forensic reports, and
              enterprise-ready trust workflows.
            </motion.p>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={3}
              className="mt-8 flex flex-wrap gap-4"
            >
              <a href="/#demo"
                className="px-7 py-3.5 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200 tracking-wide shadow-lg shadow-charcoal/10"
              >
                Request Demo
              </a>
              <a href="/sample-report"
                className="px-7 py-3.5 border border-stone text-charcoal font-medium text-sm rounded-xl hover:border-charcoal/30 hover:bg-white-warm/50 transition-all duration-200 tracking-wide"
              >
                View Sample Report
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" custom={4}
              className="mt-10 flex flex-wrap gap-6 text-xs text-charcoal-light uppercase tracking-wider"
            >
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-amber rounded-full" /> Forensic-grade
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-amber rounded-full" /> Explainable AI
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 bg-amber rounded-full" /> SOC 2 Compliant
              </span>
            </motion.div>
          </div>

          {/* Interactive Signal Visualizer + Veracity Seal */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative"
          >
            <div className="relative">
              <SignalVisualizer />
              <div className="absolute -top-4 -right-4 z-30">
                <VeracitySeal size={80} />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
