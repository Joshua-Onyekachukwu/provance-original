import { motion } from 'framer-motion'

const cases = [
  { title: 'Journalism & Media', icon: '📰', desc: 'Verify user-generated content before publication. Fact-checkers and newsrooms use Provance to validate images and videos in real time, ensuring editorial integrity.' },
  { title: 'Legal & Investigations', icon: '⚖️', desc: 'Defensible evidence for court. Our forensic reports include complete audit trails, chain-of-custody documentation, and expert-ready analysis.' },
  { title: 'Enterprise Trust & Safety', icon: '🛡️', desc: 'Protect platform integrity at scale. Automate content moderation pipelines with our API, flagging synthetic media before it reaches audiences.' },
  { title: 'Developers & API', icon: '⚡', desc: 'Integrate verification directly into your workflow. RESTful API with SDKs for Python, Node.js, and Go. Usage-based pricing for high-volume needs.' },
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
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">
            Use Cases
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance">
            Built for <span className="italic text-amber">high-stakes</span> decisions.
          </motion.h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 md:gap-6">
          {cases.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="p-6 md:p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-amber/20 transition-all duration-500 group"
            >
              <span className="text-2xl mb-4 block">{c.icon}</span>
              <h3 className="font-serif text-xl mb-3">{c.title}</h3>
              <p className="text-stone text-sm leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
