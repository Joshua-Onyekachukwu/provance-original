import { motion } from 'framer-motion'

const reasons = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
    title: 'Explainable Evidence',
    desc: 'No black boxes. Every detection comes with a human-readable explanation showing exactly why the media is flagged — pixel-level heatmaps, metadata analysis, and provenance signals.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
    ),
    title: 'Downloadable Forensic Reports',
    desc: 'Export comprehensive PDF reports suitable for legal proceedings, newsroom verification workflows, and internal compliance audits.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
    ),
    title: 'Enterprise-Ready Workflows',
    desc: 'API-first architecture, SSO integration, role-based access controls, and audit logging designed for organizations handling sensitive content.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
    ),
    title: 'Lightning-Fast Results',
    desc: 'Most verifications complete in under 3 seconds. Real-time streaming analysis for urgent editorial and security workflows.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { transition: { staggerChildren: 0.12 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
}

export default function WhyProvance() {
  return (
    <section id="why" className="section-padding bg-charcoal text-parchment relative overflow-hidden">
      <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={itemVariants} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">
            Why Provance
          </motion.span>
          <motion.h2 variants={itemVariants} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance">
            Trust isn't claimed. It's <span className="italic text-amber">verified</span>.
          </motion.h2>
          <motion.p variants={itemVariants} className="mt-4 text-stone text-lg leading-relaxed text-pretty max-w-lg mx-auto">
            Generic detectors give you a probability score. Provance gives you a case file.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={containerVariants}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {reasons.map((r) => (
            <motion.div
              key={r.title}
              variants={itemVariants}
              className="p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-amber/20 transition-all duration-500 group"
            >
              <div className="w-12 h-12 rounded-xl bg-amber/10 text-amber flex items-center justify-center mb-5 group-hover:bg-amber/20 transition-colors duration-300">
                {r.icon}
              </div>
              <h3 className="font-serif text-xl mb-3">{r.title}</h3>
              <p className="text-stone text-sm leading-relaxed">{r.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
