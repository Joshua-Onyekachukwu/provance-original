import { motion } from 'framer-motion'

const cases = [
  {
    title: 'Journalism & Media',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 7.5h-15m15 4.5h-15m15 4.5h-15m15-9V6A1.5 1.5 0 0018 4.5H6A1.5 1.5 0 004.5 6v12A1.5 1.5 0 006 19.5h12a1.5 1.5 0 001.5-1.5v-1.5" /></svg>,
    desc: 'Review suspicious media before publication with outputs that help teams explain why a result should or should not be trusted.',
  },
  {
    title: 'Legal & Investigations',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v18m-6-6h12M6.75 7.5l5.25 2.25 5.25-2.25" /></svg>,
    desc: 'Support investigative and legal-adjacent review with clearer reasoning, structured evidence summaries, and stronger workflow traceability.',
  },
  {
    title: 'Enterprise Trust & Safety',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3l7.5 3v6c0 4.5-3 7.5-7.5 9-4.5-1.5-7.5-4.5-7.5-9V6L12 3z" /></svg>,
    desc: 'Evaluate how synthetic-media verification could fit into review queues, escalation paths, and broader platform trust operations.',
  },
  {
    title: 'Developers & API',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 8.25L4.5 12l3.75 3.75M15.75 8.25L19.5 12l-3.75 3.75" /></svg>,
    desc: 'Developer access is part of the roadmap. The current public site collects API interest so access can be prioritized alongside early product rollout.',
  },
  {
    title: 'Creators & Individuals',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
    desc: 'Check suspicious images or clips before sharing, responding, or relying on them. The product is intended to support everyday verification as well as professional review.',
  },
  {
    title: 'Research & Model Evaluation',
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3.433A9 9 0 1018 12h-3.75A5.25 5.25 0 119 6.75V3.433z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 3.75h4.5v4.5" /></svg>,
    desc: 'Use structured verification results to gather test data, compare outcomes, and improve future in-house detection systems over time.',
  },
]

export default function UseCases() {
  return (
    <section id="cases" className="section-padding bg-charcoal text-parchment relative overflow-hidden">
      <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="eyebrow eyebrow-dark">
            Use Cases
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance">
            Built for <span className="italic text-trust-soft">real-world</span> verification work.
          </motion.h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="surface-card-dark p-6 md:p-8 transition-all duration-500 group hover:-translate-y-1"
            >
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-trust/10 text-trust-soft">
                {c.icon}
              </span>
              <h3 className="font-serif text-xl mb-3">{c.title}</h3>
              <p className="text-stone text-sm leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
