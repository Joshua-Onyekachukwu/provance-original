import React from 'react';

const TransparencyFooter = ({ methodology, reportId, hash, node }) => {
  return (
    <footer className="w-full bg-charcoal text-parchment/60 font-mono text-[10px] py-2 px-6 border-t border-charcoal-soft flex flex-wrap items-center justify-between gap-4 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse"></span>
          <span className="tracking-widest uppercase">Methodology: {methodology || 'V2.4.1-STABLE'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-charcoal-light uppercase">Report ID:</span>
          <span className="text-parchment/80">{reportId || 'PRV-882-X9'}</span>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <span className="text-charcoal-light uppercase">Hash:</span>
          <span className="text-parchment/80 select-all">{hash || '7f83b1c2a4e5d6f7890123456789abcdef0123456789abcdef'}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-charcoal-light uppercase">Node:</span>
          <span className="text-emerald-500/80">{node || 'US-EAST-FORENSIC-04'}</span>
        </div>
        <div className="flex items-center gap-2 border-l border-charcoal-soft pl-4">
          <span className="text-charcoal-light uppercase">Status:</span>
          <span className="text-amber/80 uppercase">Audited</span>
        </div>
      </div>
    </footer>
  );
};

export default TransparencyFooter;
