import { motion } from 'framer-motion'

export default function SignalVisualizer() {
  return (
    <div className="relative w-full aspect-video bg-charcoal rounded-3xl overflow-hidden shadow-2xl border border-charcoal-soft font-sans">
      {/* Background Grid Layer */}
      <div className="absolute inset-0 forensic-grid opacity-20 scale-[0.5]" />
      
      {/* Simulated Video/Image Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-4/5 aspect-square border border-charcoal-mid/30 rounded-full flex items-center justify-center">
          <div className="w-4/5 aspect-square border border-charcoal-mid/20 rounded-full animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1/2 aspect-square bg-amber/5 rounded-full blur-2xl" />
          </div>
          
          {/* Target Reticle */}
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-amber/50" />
             <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1px] h-4 bg-amber/50" />
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-amber/50" />
             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-[1px] bg-amber/50" />
          </div>
        </div>
      </div>

      {/* Floating UI Elements - Top Left */}
      <div className="absolute top-6 left-6 space-y-4 z-20">
        <div className="bg-charcoal/80 backdrop-blur-md border border-charcoal-soft p-3 rounded-xl shadow-lg">
          <div className="text-[10px] text-amber font-mono uppercase tracking-[0.2em] mb-1">Live Spectrum</div>
          <div className="flex items-end gap-[2px] h-8">
            {[0.4, 0.7, 0.5, 0.9, 0.6, 0.3, 0.8, 0.5, 0.4, 0.7, 0.9, 0.6].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: [`${h * 100}%`, `${(1 - h) * 100}%`, `${h * 100}%`] }}
                transition={{ duration: 1.5 + (i * 0.1), repeat: Infinity }}
                className="w-1 bg-amber/60 rounded-t-[1px]"
              />
            ))}
          </div>
        </div>
        
        <div className="bg-charcoal/80 backdrop-blur-md border border-charcoal-soft p-3 rounded-xl shadow-lg">
          <div className="text-[10px] text-parchment-dark/50 font-mono uppercase tracking-[0.2em] mb-2">Detection Matrix</div>
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 0.8, 0.2] }}
                transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
                className={`w-2 h-2 rounded-[1px] ${i === 5 || i === 9 ? 'bg-amber' : 'bg-charcoal-mid'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Floating UI Elements - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <div className="bg-amber text-charcoal px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold shadow-lg shadow-amber/20 animate-pulse">
          VERDICT: HIGH_CONFIDENCE_AI
        </div>
      </div>

      {/* Central Scanning Animation */}
      <motion.div
        animate={{ left: ['10%', '90%', '10%'] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[15%] bottom-[15%] w-[1px] bg-amber shadow-[0_0_20px_rgba(245,158,11,0.8)] z-10"
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber rounded-full shadow-glow" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber rounded-full shadow-glow" />
      </motion.div>

      {/* Bottom Technical Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-charcoal to-transparent">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <div className="text-[10px] text-parchment-dark/40 font-mono uppercase tracking-widest">Metadata Hash</div>
            <div className="text-xs text-parchment-dark font-mono truncate max-w-[200px]">SHA256:F2C3E91A...B8D2</div>
          </div>
          
          <div className="flex gap-6 text-right font-mono">
            <div>
              <div className="text-[10px] text-parchment-dark/40 uppercase">Latent Noise</div>
              <div className="text-sm text-amber font-bold">0.9842</div>
            </div>
            <div>
              <div className="text-[10px] text-parchment-dark/40 uppercase">C2PA Path</div>
              <div className="text-sm text-rose-500 font-bold">Broken</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
