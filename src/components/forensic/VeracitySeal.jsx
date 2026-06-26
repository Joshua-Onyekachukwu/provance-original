import React from 'react';

const VeracitySeal = ({ size = 120, className = "" }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" className="animate-[spin_20s_linear_infinite]">
        <defs>
          <path id="circlePath" d="M 60, 60 m -50, 0 a 50,50 0 1,1 100,0 a 50,50 0 1,1 -100,0" />
        </defs>
        <circle cx="60" cy="60" r="58" fill="none" stroke="#1A1A1A" strokeWidth="0.5" strokeDasharray="2 2" />
        <text className="text-[10px] font-mono uppercase tracking-[0.2em] fill-charcoal/40">
          <textPath xlinkHref="#circlePath">
            Provance Verified • Forensic Integrity • Trust Infrastructure •
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 bg-charcoal rounded-full flex items-center justify-center text-parchment font-bold text-3xl shadow-xl">
          P
        </div>
      </div>
      {/* Glossy Overlay */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
    </div>
  );
};

export default VeracitySeal;
