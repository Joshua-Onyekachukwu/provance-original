import { motion } from 'framer-motion'
import InteractivePanel from './InteractivePanel'

const steps = [
  { num: '01', title: 'Submit', desc: 'Upload the original image or video, or register interest for the workflow you want to run with Provance.' },
  { num: '02', title: 'Review evidence', desc: 'See findings, metadata, confidence signals, and clear reasoning together in one verification flow.' },
  { num: '03', title: 'Act with clarity', desc: 'Use the verdict, report-ready output, and next-step guidance to support a confident decision.' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="section-padding bg-parchment-light relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(217,119,6,0.08),transparent_38%)]" />
      <div className="content-container relative z-10">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="inline-flex items-center gap-3 rounded-full border border-stone-light/80 bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-amber shadow-[0_18px_45px_rgba(26,26,26,0.06)]">
            How It Works
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="mt-4 font-serif text-3xl text-balance text-[#1a1a1a] sm:text-4xl lg:text-5xl">
            Upload the file, review the evidence, act with clarity.
          </motion.h2>
          <motion.p variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.18 } } }} className="mt-5 text-lg leading-relaxed text-[#3f3f46]">
            A straightforward workflow built for faster verification and clearer decisions.
          </motion.p>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-[17%] right-[17%] h-px bg-stone-light/90 -translate-y-1/2" />

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="relative"
              >
                <InteractivePanel className="rounded-[1.75rem] border border-stone-light/80 bg-white-warm/88 shadow-[0_24px_60px_rgba(26,26,26,0.08)] backdrop-blur-xl">
                  <div className="relative z-10 p-6 md:p-8 text-center lg:text-left">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="font-serif text-5xl sm:text-6xl text-amber/20 font-bold leading-none">{step.num}</span>
                      <span className="rounded-full border border-amber/20 bg-amber/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
                        Step {i + 1}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl sm:text-2xl text-charcoal mb-3">{step.title}</h3>
                    <p className="text-charcoal-mid text-sm leading-relaxed max-w-sm">{step.desc}</p>
                  </div>
                </InteractivePanel>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
