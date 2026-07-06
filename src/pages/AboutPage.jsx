import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const principles = [
  {
    title: 'Evidence First',
    desc: 'Provance is built for teams that need more than a score. We focus on explainable signals, defensible reporting, and workflows that hold up under scrutiny.',
  },
  {
    title: 'Honest Uncertainty',
    desc: 'Synthetic-media verification should never pretend to be more certain than it is. We treat uncertainty as useful information, not a weakness to hide.',
  },
  {
    title: 'Operational Trust',
    desc: 'The product is designed for journalism, investigations, trust and safety, and other repeat workflows where the output has to be understandable and usable.',
  },
]

export default function AboutPage() {
  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-amber font-mono text-xs uppercase tracking-[0.2em]"
            >
              About
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl mt-4 text-balance text-charcoal"
            >
              Building trust infrastructure for the synthetic-media era.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-6 text-lg text-charcoal-mid leading-relaxed"
            >
              Provance is focused on helping professionals review suspicious media with
              evidence, context, and workflow-ready outputs instead of black-box scores.
            </motion.p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="space-y-6 max-w-2xl">
            <h2 className="font-serif text-3xl text-charcoal">Why Provance exists</h2>
            <p className="text-charcoal-mid leading-relaxed">
              Synthetic media is improving faster than the systems people use to verify it.
              For journalists, investigators, legal-adjacent teams, and trust operators,
              a probability score alone is not enough. They need outputs they can inspect,
              explain, and act on.
            </p>
            <p className="text-charcoal-mid leading-relaxed">
              Provance fills that gap with explainable verification, signal-level
              evidence, and report-ready workflows that support real decision making.
            </p>
          </div>

          <div className="rounded-2xl border border-stone-light bg-white-warm p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
              Focus Areas
            </p>
            <ul className="mt-5 space-y-3 text-sm text-charcoal-mid">
              <li>Image-first verification workflows for early access</li>
              <li>Evidence-backed result presentation and reporting</li>
              <li>Repeat-use professional workflows over novelty usage</li>
              <li>Future API and enterprise trust infrastructure</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-amber font-mono text-xs uppercase tracking-[0.2em]">
                Principles
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl mt-4 text-balance">
                What shapes the product.
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {principles.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6"
                >
                  <h3 className="font-serif text-xl text-parchment">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                to="/waitlist"
                className="inline-flex px-6 py-3 bg-amber text-charcoal font-medium text-sm rounded-xl hover:bg-amber-light transition-all duration-200"
              >
                Join the early-access waitlist
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
