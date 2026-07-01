import { motion } from 'framer-motion'

const steps = [
  { num: '01', title: 'Upload', desc: 'Submit any image or video file through our web interface or API. Support for all major formats including JPEG, PNG, MP4, and WebM.' },
  { num: '02', title: 'Analyze', desc: 'Our multi-modal engine examines the media across 47 forensic dimensions — pixel consistency, metadata integrity, compression artifacts, and generative model fingerprints.' },
  { num: '03', title: 'Report', desc: 'Receive a comprehensive forensic report with an explainable verdict, evidence heatmaps, and downloadable PDF documentation ready for court or publication.' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="section-padding bg-parchment-light relative overflow-hidden">
      <div className="content-container">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }}
          variants={{ hidden: { opacity: 0 }, visible: { transition: { staggerChildren: 0.15 } } }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.span variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }} className="text-amber font-mono text-xs uppercase tracking-[0.2em]">
            How It Works
          </motion.span>
          <motion.h2 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.1 } } }} className="font-serif text-3xl sm:text-4xl lg:text-5xl mt-4 text-balance text-charcoal">
            Three steps to the <span className="italic text-amber">truth</span>.
          </motion.h2>
        </motion.div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-[15%] right-[15%] h-px bg-stone-light -translate-y-1/2" />

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                className="relative text-center lg:text-left"
              >
                <div className="flex flex-col items-center lg:items-start">
                  <span className="font-serif text-5xl sm:text-6xl text-amber/20 font-bold leading-none mb-4">{step.num}</span>
                  <h3 className="font-serif text-xl sm:text-2xl text-charcoal mb-3">{step.title}</h3>
                  <p className="text-charcoal-mid text-sm leading-relaxed max-w-sm">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
