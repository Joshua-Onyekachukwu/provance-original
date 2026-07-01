import React from 'react';
import { motion } from 'framer-motion';

const TransparencyFooter = ({ methodology, reportId, hash, node, c2paStatus = 'missing' }) => {
  return (
    <footer className="w-full bg-charcoal text-parchment/60 font-mono text-[9px] py-2 px-6 border-t border-charcoal-soft flex flex-wrap items-center justify-between gap-4 z-50">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <motion.span 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 bg-amber rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]"
          ></motion.span>
          <span className="tracking-[0.1em] uppercase">Core: {methodology || 'V2.4.1-STABLE'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-charcoal-light uppercase">Analysis_ID:</span>
          <span className="text-parchment/80">{reportId || 'PRV-882-X9'}</span>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-charcoal-light uppercase">SHA256:</span>
          <span className="text-parchment/40 select-all truncate max-w-[150px]">{hash || '7f83b1c2a4e5d6f7890123456789abcdef0123456789abcdef'}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
           <span className="text-charcoal-light uppercase text-[8px]">C2PA:</span>
           {c2paStatus === 'verified' ? (
             <span className="text-emerald-500 font-bold border border-emerald-500/20 px-1 rounded-[2px] bg-emerald-500/5">VALIDATED</span>
           ) : (
             <span className="text-rose-500 font-bold border border-rose-500/20 px-1 rounded-[2px] bg-rose-500/5 uppercase">{c2paStatus}</span>
           )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-charcoal-light uppercase text-[8px]">Node:</span>
          <span className="text-parchment/40">{node || 'US-EAST-04'}</span>
        </div>
        <div className="flex items-center gap-2 border-l border-charcoal-soft pl-4">
          <span className="text-[8px] text-amber/60 uppercase tracking-widest font-bold">Audit_Locked</span>
        </div>
      </div>
    </footer>
  );
};

export default TransparencyFooter;
