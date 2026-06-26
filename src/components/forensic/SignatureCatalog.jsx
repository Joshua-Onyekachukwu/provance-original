import React from 'react';
import { motion } from 'framer-motion';

const SignaturePattern = ({ type }) => {
  if (type === 'sora') {
    // Spatial-temporal patch boundaries + spectral spikes
    return (
      <div className="relative w-full h-full bg-charcoal overflow-hidden">
        {/* Grid Patches */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-30">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-amber/40" />
          ))}
        </div>
        {/* Spectral Spikes */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-[1px] bg-amber/60"
              style={{ height: '80%', left: `${20 + i * 15}%` }}
              animate={{ opacity: [0.2, 0.8, 0.2], height: ['60%', '90%', '60%'] }}
              transition={{ duration: 2, delay: i * 0.3, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    );
  }
  if (type === 'midjourney') {
    // Spectral decoupling + Dithering
    return (
      <div className="relative w-full h-full bg-[#121212] overflow-hidden">
        <div className="absolute inset-0 flex flex-wrap opacity-40">
           {Array.from({ length: 100 }).map((_, i) => (
             <div 
               key={i} 
               className="w-1 h-1" 
               style={{ backgroundColor: Math.random() > 0.8 ? '#F59E0B' : 'transparent' }}
             />
           ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-amber/20 to-transparent mix-blend-overlay" />
      </div>
    );
  }
  if (type === 'kling') {
    // Motion warping / Jello effect (Simulated with wavy lines)
    return (
      <svg width="100%" height="100%" viewBox="0 0 48 48" className="opacity-70">
        {Array.from({ length: 6 }).map((_, i) => (
          <motion.path
            key={i}
            d={`M 0 ${8 + i * 6} Q 12 ${4 + i * 6}, 24 ${8 + i * 6} T 48 ${8 + i * 6}`}
            stroke="#F59E0B"
            strokeWidth="0.5"
            fill="none"
            animate={{ d: [
              `M 0 ${8 + i * 6} Q 12 ${12 + i * 6}, 24 ${8 + i * 6} T 48 ${8 + i * 6}`,
              `M 0 ${8 + i * 6} Q 12 ${4 + i * 6}, 24 ${8 + i * 6} T 48 ${8 + i * 6}`,
              `M 0 ${8 + i * 6} Q 12 ${12 + i * 6}, 24 ${8 + i * 6} T 48 ${8 + i * 6}`
            ]}}
            transition={{ duration: 2, delay: i * 0.1, repeat: Infinity }}
          />
        ))}
      </svg>
    );
  }
  if (type === 'flux') {
    // Chrominance grid (U/V)
    return (
      <div className="relative w-full h-full bg-charcoal overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
           {Array.from({ length: 64 }).map((_, i) => (
             <div 
               key={i} 
               className="border-[0.25px] border-emerald-500/20"
               style={{ backgroundColor: i % 7 === 0 ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}
             />
           ))}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
           <div className="w-10 h-10 rounded-full border border-emerald-500 animate-pulse" />
        </div>
      </div>
    );
  }
  return null;
};

const SignatureCard = ({ name, version, confidence, type, artifact }) => (
  <div className="bg-charcoal-soft/40 border border-charcoal-soft p-4 rounded-xl flex items-center gap-4 hover:border-amber/40 transition-all cursor-default group">
    <div className="w-16 h-16 bg-charcoal rounded-lg border border-charcoal-soft flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
      <SignaturePattern type={type} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-start gap-2">
        <h4 className="text-parchment font-medium text-sm truncate group-hover:text-amber transition-colors">{name}</h4>
        <span className="text-amber font-mono text-[9px] bg-amber/10 border border-amber/20 px-1.5 py-0.5 rounded shrink-0">{confidence}%</span>
      </div>
      <p className="text-charcoal-light font-mono text-[9px] mt-1 uppercase tracking-tighter truncate">{version}</p>
      <div className="mt-2 flex items-center gap-1.5">
         <span className="w-1 h-1 bg-amber rounded-full" />
         <span className="text-[9px] text-parchment-dark/60 font-mono italic truncate">{artifact}</span>
      </div>
    </div>
  </div>
);

const SignatureCatalog = () => {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-charcoal">Signature Attribution</h3>
        <span className="text-[10px] font-mono text-charcoal-light uppercase tracking-widest bg-stone-light/30 px-2 py-1 rounded">Forensic Catalog v1.1</span>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-4">
        <SignatureCard 
          name="Sora" 
          version="OpenAI-DiT" 
          confidence="94.2" 
          type="sora" 
          artifact="Spatial-Temporal Discontinuity"
        />
        <SignatureCard 
          name="Midjourney v6" 
          version="Latent Diffusion" 
          confidence="88.7" 
          type="midjourney" 
          artifact="Spectral Noise Decoupling"
        />
        <SignatureCard 
          name="Kling AI" 
          version="Video Diffusion" 
          confidence="91.5" 
          type="kling" 
          artifact="Temporal Jello Distortion"
        />
        <SignatureCard 
          name="Flux.1" 
          version="Rectified Flow" 
          confidence="76.4" 
          type="flux" 
          artifact="U/V Chrominance Grid"
        />
      </div>
      
      <div className="p-3 bg-amber/5 border border-amber/10 rounded-lg">
        <p className="text-[10px] text-charcoal-mid italic leading-relaxed">
          <strong>Methodology Note:</strong> Signatures are derived from multi-layer latent space mapping. High-confidence matches indicate structural overlap with known model training trajectories.
        </p>
      </div>
    </section>
  );
};

export default SignatureCatalog;
