import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const stats = [
  {
    value: '1.00',
    label: 'Trust-weighted accuracy',
    compare: 'vs 0.79 standard detector',
    tone: 'text-trust-strong',
  },
  {
    value: '0.0%',
    label: 'False-positive rate',
    compare: 'vs 7.5% standard detector',
    tone: 'text-trust-strong',
  },
  {
    value: '0',
    label: 'Confident-wrong results',
    compare: 'vs 4 on standard detectors',
    tone: 'text-trust-strong',
  },
  {
    value: '500',
    label: 'Adversarial gold assets',
    compare: 'Provance-1000 catalog V0.2',
    tone: 'text-amber',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: 0.08 * i, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

export default function TrustBar() {
  return (
    <section className="relative bg-parchment px-6 pb-6 pt-2 md:px-8 md:pb-8">
      <div className="content-container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="rounded-[2rem] border border-stone-light bg-white-warm/85 px-6 py-8 shadow-[0_24px_60px_rgba(19,22,29,0.06)] backdrop-blur-xl sm:px-8 lg:px-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <motion.div variants={fadeUp} custom={0}>
              <span className="eyebrow">Open Benchmark · Published</span>
              <h2 className="mt-5 font-serif text-3xl text-balance text-charcoal sm:text-4xl">
                Measured against the <span className="italic text-trust">status quo</span> — and published for review.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-charcoal-mid">
                The Provance-1000 benchmark and its ground truth ship with the product.
                No black boxes, no unverifiable claims: inspect the methodology, the
                catalog, and the results yourself.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/benchmark"
                  className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                >
                  Read the V0.1 report
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </Link>
                <Link
                  to="/benchmark#catalog"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-light bg-parchment px-5 py-3 text-sm font-medium text-charcoal transition hover:border-charcoal/25 hover:bg-white-warm"
                >
                  Browse the gold catalog
                </Link>
              </div>
            </motion.div>

            <div className="grid gap-px overflow-hidden rounded-[1.5rem] border border-stone-light bg-stone-light/70 sm:grid-cols-2">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  variants={fadeUp}
                  custom={i + 1}
                  className="bg-white-warm/95 p-5"
                >
                  <p className={`font-serif text-4xl tracking-tight tabular-nums ${stat.tone}`}>
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-charcoal">{stat.label}</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                    {stat.compare}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.p
            variants={fadeUp}
            custom={5}
            className="mt-6 border-t border-stone-light pt-4 text-xs leading-relaxed text-charcoal-light"
          >
            Baseline V0.1 runs on the 100-asset gold subset; the catalog expands to 500
            adversarial assets in V0.2. Methodology, ground truth, and catalog data are
            published with the benchmark.
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
