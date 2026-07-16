import { motion } from 'framer-motion'

const answers = [
  { q: 'What kind of users is Provance built for?', a: 'Provance is being shaped first for journalists, investigators, legal-adjacent review teams, and trust-focused operators who need evidence they can inspect and communicate.' },
  { q: 'Does Provance support images or video?', a: 'The current public direction is image-first for early access. Video remains part of the product roadmap, but it is not the primary launch requirement.' },
  { q: 'What happens if a result is uncertain?', a: 'Uncertainty is surfaced explicitly. The goal is not to hide ambiguity, but to show when the evidence is mixed or insufficient and human review should carry more weight.' },
  { q: 'Can I join before broader access opens?', a: 'Yes. Access is currently waitlist-first, with review and invite-based activation for early users and design partners.' },
  { q: 'Will there be an API?', a: 'Yes, API access is part of the long-term product direction. Developer interest is being gathered now so we can prioritize access and onboarding correctly.' },
]

export default function CLEARAnswers() {
  return (
    <section id="faq" className="section-padding bg-parchment relative overflow-hidden">
      <div className="content-container">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="eyebrow">
            Frequently Asked Questions
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance text-charcoal">
            Everything you need to <span className="italic text-trust">know</span>.
          </motion.h2>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-4">
          {answers.map((item, i) => (
            <motion.details
              key={item.q}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="surface-card group overflow-hidden open:border-trust/18 transition-all duration-300"
            >
              <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none">
                <span className="font-serif text-lg text-charcoal pr-4">{item.q}</span>
                <svg className="w-5 h-5 text-charcoal-light shrink-0 group-open:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-6 pb-5 pt-0">
                <p className="text-charcoal-mid text-sm leading-relaxed">{item.a}</p>
              </div>
            </motion.details>
          ))}
        </div>
      </div>
    </section>
  )
}
