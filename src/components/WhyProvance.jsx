import { motion } from 'framer-motion'

const reasons = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    title: 'Explainable Evidence',
    desc: 'Review verdicts, confidence context, and supporting reasoning together instead of relying on a single opaque score.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
    ),
    title: 'Downloadable Forensic Reports',
    desc: 'Export a professional report with verdict, findings, timeline, and reference details another reviewer can inspect.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
    ),
    title: 'Built For Individuals And Teams',
    desc: 'Review one file or support repeatable verification workflows across a newsroom, risk team, or client account.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 6.75h15m-15 5.25h15m-15 5.25h9" /></svg>
    ),
    title: 'Image And Video Coverage',
    desc: 'Start with image-first early access now and extend the same evidence-led workflow into richer video review over time.',
  },
]

export default function WhyProvance() {
  return (
    <section id="why" className="section-padding bg-charcoal text-parchment relative overflow-hidden">
      <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="eyebrow eyebrow-dark">
            Why Provance
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance">
            Trust is earned through <span className="italic text-trust-soft">evidence</span>.
          </motion.h2>
          <motion.p variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.18 } } }} className="mt-5 text-lg leading-relaxed text-stone max-w-xl mx-auto">
            Generic detectors return a score. Provance gives teams a structured case file they can
            inspect, discuss, and act on.
          </motion.p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 md:gap-6 max-w-5xl mx-auto">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="surface-card-dark p-6 md:p-8 transition-all duration-500 group hover:-translate-y-1"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-trust/10 text-trust-soft">
                {r.icon}
              </span>
              <h3 className="font-serif text-xl mb-3">{r.title}</h3>
              <p className="text-stone text-sm leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
