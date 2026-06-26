import { motion } from 'framer-motion'

const signals = [
  {
    id: 'GAN-01',
    name: 'GAN Grid Artifacts',
    description: 'High-frequency periodic noise detected in the blue channel, characteristic of ProGAN upsampling.',
    confidence: 0.98,
    type: 'generative',
    coordinates: { x: '24%', y: '32%' },
  },
  {
    id: 'LIT-04',
    name: 'Lighting Inconsistency',
    description: 'Shadow vectors on the subject mismatch the primary light source detected in the background (14° variance).',
    confidence: 0.84,
    type: 'physical',
    coordinates: { x: '68%', y: '45%' },
  },
  {
    id: 'EDG-12',
    name: 'Pixel Discontinuity',
    description: 'Alpha-channel blending artifacts detected around the subject hairline. Likely manual masking.',
    confidence: 0.91,
    type: 'manipulation',
    coordinates: { x: '42%', y: '18%' },
  }
]

export default function EvidenceAppendix() {
  return (
    <div className="bg-white-warm border border-stone-light rounded-2xl overflow-hidden shadow-sm font-sans">
      <div className="p-6 border-b border-stone-light bg-parchment-light flex justify-between items-center">
        <div>
          <h4 className="font-serif text-xl text-charcoal">Evidence Appendix</h4>
          <p className="text-xs text-charcoal-light font-mono mt-1 uppercase tracking-tight">Technical Signal Analysis • Case #A3F8C2</p>
        </div>
        <div className="px-3 py-1 bg-amber/10 border border-amber/20 rounded text-[10px] text-amber font-mono uppercase tracking-widest">
          Audit Grade
        </div>
      </div>

      <div className="grid lg:grid-cols-5 divide-x divide-stone-light">
        {/* Visual Map */}
        <div className="lg:col-span-3 p-8 bg-white relative">
          <div className="relative aspect-[4/3] bg-stone-light/20 rounded-lg border border-dashed border-stone overflow-hidden group">
            {/* Mock Image Placeholder with Forensic Grid */}
            <div className="absolute inset-0 forensic-grid opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-stone font-mono text-xs uppercase tracking-widest italic">Source Media Preview</span>
            </div>

            {/* Hotspots */}
            {signals.map((signal) => (
              <motion.div
                key={signal.id}
                style={{ left: signal.coordinates.x, top: signal.coordinates.y }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-amber/20 rounded-full animate-ping" />
                <div className="relative w-2.5 h-2.5 bg-amber rounded-full border-2 border-white shadow-sm cursor-pointer group-hover:scale-125 transition-transform" />
                
                {/* Annotation Tag (Mock) */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-charcoal text-parchment px-2 py-1 rounded text-[8px] font-mono whitespace-nowrap z-30">
                  SIGNAL_{signal.id}
                </div>
              </motion.div>
            ))}

            {/* Scanning Line Animation */}
            <motion.div
              animate={{ top: ['0%', '100%', '0%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute left-0 right-0 h-[2px] bg-amber/30 shadow-[0_0_15px_rgba(245,158,11,0.5)] z-20"
            />
          </div>
          
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] text-charcoal-light font-mono uppercase">Resolution</div>
              <div className="text-xs font-mono">3024 × 4032</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-charcoal-light font-mono uppercase">Color Space</div>
              <div className="text-xs font-mono">Display P3</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-charcoal-light font-mono uppercase">Hash (SHA-256)</div>
              <div className="text-[10px] font-mono truncate">f2c3...e91a</div>
            </div>
          </div>
        </div>

        {/* Signal List */}
        <div className="lg:col-span-2 bg-parchment-light/30">
          <div className="divide-y divide-stone-light/60">
            {signals.map((signal) => (
              <div key={signal.id} className="p-6 hover:bg-white transition-colors cursor-default group">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono text-charcoal-light tracking-tighter">[{signal.id}]</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    signal.type === 'generative' ? 'bg-rose-50 border-rose-100 text-rose-600' :
                    signal.type === 'physical' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                    'bg-blue-50 border-blue-100 text-blue-600'
                  }`}>
                    {signal.type.toUpperCase()}
                  </span>
                </div>
                <h5 className="font-serif text-charcoal group-hover:text-amber transition-colors">{signal.name}</h5>
                <p className="text-xs text-charcoal-mid mt-2 leading-relaxed italic">
                  "{signal.description}"
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1 h-1 bg-stone-light/40 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: `${signal.confidence * 100}%` }}
                      className={`h-full ${
                        signal.confidence > 0.9 ? 'bg-rose-500' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-charcoal-mid">
                    {(signal.confidence * 100).toFixed(1)}% Confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="p-6 bg-charcoal text-parchment">
            <div className="text-[10px] font-mono uppercase tracking-widest text-parchment-dark/50 mb-4 font-bold">Processing Log</div>
            <div className="space-y-2 font-mono text-[9px] text-parchment-dark/80">
              <div className="flex gap-3">
                <span className="text-amber">14:32:01</span>
                <span>Initializing multi-signal extractor...</span>
              </div>
              <div className="flex gap-3">
                <span className="text-amber">14:32:01</span>
                <span>Signal [GAN-01] detected in freq domain.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-amber">14:32:02</span>
                <span>Correlating lighting vectors... DONE.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-amber">14:32:02</span>
                <span>Finalizing forensic verdict: 0.947 AI.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
