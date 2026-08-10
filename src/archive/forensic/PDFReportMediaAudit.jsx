import React from 'react';

const MediaCrop = ({ label, type, description }) => (
  <div className="space-y-3">
    <div className="relative aspect-square bg-stone-light/20 border border-stone-light rounded overflow-hidden group">
      <div className="absolute inset-0 forensic-grid opacity-10" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-mono text-stone italic uppercase">Crop_{label}</span>
      </div>
      {/* Zoom Effect Decoration */}
      <div className="absolute inset-0 border-2 border-amber/0 group-hover:border-amber/40 transition-all" />
      <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-charcoal text-parchment text-[8px] font-mono rounded">
        400% ZOOM
      </div>
    </div>
    <div>
      <div className="text-[10px] font-mono text-charcoal font-bold uppercase">{label}</div>
      <div className="text-[9px] font-mono text-charcoal-light uppercase mb-1">{type}</div>
      <p className="text-[10px] text-charcoal-mid leading-tight italic">"{description}"</p>
    </div>
  </div>
);

const PDFReportMediaAudit = () => {
  return (
    <div className="space-y-8 py-8">
      <div className="flex items-center justify-between border-b border-charcoal/10 pb-4">
        <h3 className="font-serif text-xl text-charcoal">Deep Media Audit</h3>
        <span className="text-[10px] font-mono text-charcoal-light uppercase tracking-widest">Section 04 • Pixel Analysis</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <MediaCrop 
          label="Artifact_A" 
          type="Edge Discontinuity" 
          description="High-contrast masking artifacts detected along the subject-background boundary."
        />
        <MediaCrop 
          label="Artifact_B" 
          type="GAN Checkerboard" 
          description="Subtle 8x8 pixel periodic noise consistent with upsampling layers."
        />
        <MediaCrop 
          label="Artifact_C" 
          type="Spectral Spike" 
          description="Non-natural frequency peak detected at the 14.2kHz band."
        />
        <MediaCrop 
          label="Artifact_D" 
          type="Lighting Vector" 
          description="Shadow cast direction (214°) inconsistent with primary light source (198°)."
        />
      </div>

      <div className="bg-charcoal p-6 rounded-xl relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-5" />
        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
           <div>
              <div className="text-[10px] font-mono text-amber uppercase tracking-[0.2em] mb-2">Spectral Density Map</div>
              <div className="h-24 w-full bg-charcoal-soft border border-charcoal-mid/30 rounded flex items-end justify-between p-2 gap-1">
                 {Array.from({ length: 40 }).map((_, i) => (
                   <div 
                    key={i} 
                    className="flex-1 bg-amber/40 rounded-t-[1px]" 
                    style={{ height: `${Math.random() * 80 + 10}%`, opacity: i % 5 === 0 ? 1 : 0.4 }} 
                   />
                 ))}
              </div>
           </div>
           <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-parchment/10 pb-2">
                 <span className="text-[10px] font-mono text-parchment/60 uppercase">Entropy Score</span>
                 <span className="text-sm font-mono text-parchment">0.9842 (CRITICAL)</span>
              </div>
              <div className="flex justify-between items-end border-b border-parchment/10 pb-2">
                 <span className="text-[10px] font-mono text-parchment/60 uppercase">Noise Variance</span>
                 <span className="text-sm font-mono text-parchment">± 0.0031%</span>
              </div>
              <div className="flex justify-between items-end border-b border-parchment/10 pb-2">
                 <span className="text-[10px] font-mono text-parchment/60 uppercase">Dithering Match</span>
                 <span className="text-sm font-mono text-emerald-500">MJ_V6_POSITIVE</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default PDFReportMediaAudit;
