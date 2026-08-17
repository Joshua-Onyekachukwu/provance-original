import { motion } from 'framer-motion'

const LUXE = [0.32, 0.72, 0, 1]

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
    desc: 'Image-first for early access, with the same evidence-led workflow extending to video as it rolls out.',
  },
]

// Asymmetric bento spans (lg): the first and last cards open wider so the
// grid reads as composed editorial blocks, not a uniform matrix. All spans
// reset to col-span-1 below lg (the grid base is grid-cols-1).
const SPANS = [
  'lg:col-span-2',
  'lg:col-span-1',
  'lg:col-span-1',
  'lg:col-span-2',
]

export default function WhyProvance() {
  return (
    <section id="why" className="section-padding bg-ink text-phosphor relative overflow-hidden">
      <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: LUXE } } }} className="eyebrow eyebrow-dark">
            Why Provance
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.08, ease: LUXE } } }} className="font-display text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl lg:text-[3.4rem] lg:leading-[1.05] mt-5 text-balance">
            Trust is earned through <span className="text-(--color-verdict-authentic)">evidence</span>.
          </motion.h2>
          <motion.p variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.14, ease: LUXE } } }} className="mt-6 text-lg leading-relaxed text-phosphor-dim max-w-xl mx-auto">
            Generic detectors return a score. Provance gives teams a structured case file they can
            inspect, discuss, and act on.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
          {reasons.map((r, i) => (
            <motion.div
              key={r.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: LUXE }}
              className={`${SPANS[i]}`}
            >
              <div className="bezel-shell-dark h-full transition-transform duration-700 ease-luxe group-hover:-translate-y-1">
                <div className="bezel-core-dark group h-full p-6 md:p-8 transition-all duration-700 ease-luxe hover:-translate-y-1">
                  <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-trust/10 text-trust-soft transition-transform duration-500 ease-luxe group-hover:scale-110">
                    {r.icon}
                  </span>
                  <h3 className="font-display text-lg font-semibold tracking-tight mb-3">{r.title}</h3>
                  <p className="text-phosphor-dim text-sm leading-relaxed">{r.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
