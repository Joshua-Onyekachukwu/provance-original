import { motion } from 'framer-motion'

const answers = [
  { q: 'How does Provance detect AI-generated media?', a: 'Our multi-modal engine analyzes 47 forensic dimensions including pixel-level inconsistencies, generative model fingerprints, metadata anomalies, and compression artifact patterns. Each detection is explainable with heatmap visualizations.' },
  { q: 'What file formats do you support?', a: 'We support all major image formats (JPEG, PNG, WebP, TIFF, BMP) and video formats (MP4, WebM, AVI, MOV). Maximum file size depends on your plan.' },
  { q: 'Can I integrate Provance into my existing workflow?', a: 'Yes. We offer a RESTful API with SDKs for Python, Node.js, and Go. Enterprise plans include custom integration support and SSO authentication.' },
  { q: 'Are your reports admissible as evidence?', a: 'Our forensic reports include complete audit trails, chain-of-custody documentation, and detailed methodology notes designed to meet evidentiary standards.' },
  { q: 'How fast is the verification process?', a: 'Most image verifications complete in under 3 seconds. Video analysis times vary by duration. Enterprise plans include priority processing queues.' },
]

export default function CLEARAnswers() {
  return (
    <section id="demo" className="section-padding bg-parchment relative overflow-hidden">
      <div className="content-container">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">
            C.L.E.A.R. Trust Answers
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
          <h3 className="font-serif text-2xl sm:text-3xl text-charcoal mb-4">Ready to see Provance in action?</h3>
          <p className="text-charcoal-mid mb-8 max-w-md mx-auto">Book a personalized demo with our team. We'll walk through your use case and show you exactly how Provance fits your workflow.</p>
          <a href="#" className="inline-flex px-8 py-4 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200 tracking-wide shadow-lg shadow-charcoal/10">
            Request a Demo
          </a>
        </motion.div>
      </div>
    </section>
  )
}
