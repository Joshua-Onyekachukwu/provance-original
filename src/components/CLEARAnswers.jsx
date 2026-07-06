import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

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
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">
            Frequently Asked Questions
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance text-charcoal">
            Everything you need to <span className="italic text-amber">know</span>.
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
              className="group bg-white-warm rounded-xl border border-stone-light overflow-hidden open:border-amber/20 open:shadow-sm transition-all duration-300"
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

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-2xl mx-auto mt-16 text-center"
        >
          <h3 className="font-serif text-2xl sm:text-3xl text-charcoal mb-4">
            Ready to explore early access?
          </h3>
          <p className="text-charcoal-mid mb-8 max-w-xl mx-auto">
            Join the waitlist or request a design-partner conversation, depending on how
            you plan to use Provance.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/waitlist" className="inline-flex px-8 py-4 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200 tracking-wide shadow-lg shadow-charcoal/10">
              Join Waitlist
            </Link>
            <Link to="/contact" className="inline-flex px-8 py-4 border border-stone text-charcoal font-medium text-sm rounded-xl hover:border-charcoal/30 transition-all duration-200 tracking-wide">
              Request Demo
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
