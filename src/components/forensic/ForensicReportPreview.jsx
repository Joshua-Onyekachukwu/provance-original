import React from 'react'
import { motion } from 'framer-motion'
import EvidenceAppendix from './EvidenceAppendix'
import SignatureCatalog from './SignatureCatalog'
import PDFReportMediaAudit from './PDFReportMediaAudit'
import VeracitySeal from './VeracitySeal'

const VeracityGauge = ({ score }) => {
  const percentage = score * 100;
  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="58"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-stone-light/30"
        />
        <motion.circle
          cx="64"
          cy="64"
          r="58"
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray="364.4"
          initial={{ strokeDashoffset: 364.4 }}
          animate={{ strokeDashoffset: 364.4 - (364.4 * percentage) / 100 }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="text-charcoal"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-serif text-charcoal">{percentage.toFixed(1)}</span>
        <span className="text-[10px] font-mono text-charcoal-light uppercase">Veracity</span>
      </div>
    </div>
  )
}

export default function ForensicReportPreview() {
  return (
    <div className="bg-stone-light/10 min-h-screen p-4 md:p-12 font-sans text-charcoal selection:bg-amber-subtle">
      
      {/* PAGE 1: EXECUTIVE OVERVIEW */}
      <div className="max-w-4xl mx-auto bg-[#FDFCFB] shadow-2xl border border-stone-light relative overflow-hidden mb-12">
        
        {/* Provance Watermark */}
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none -rotate-[30deg] select-none">
          <div className="text-[120px] font-bold tracking-tighter">AUTHENTICATED_LEDGER</div>
        </div>

        {/* Header Section */}
        <div className="p-8 md:p-12 border-b-4 border-charcoal bg-white relative z-10">
          <div className="flex justify-between items-start mb-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-charcoal flex items-center justify-center text-parchment rounded-sm font-bold text-2xl">P</div>
              <div>
                <div className="text-charcoal font-black text-xl tracking-tighter leading-none">PROVANCE</div>
                <div className="text-[9px] font-mono text-charcoal-light tracking-[0.3em] mt-1 uppercase">Trust Infrastructure</div>
              </div>
            </div>
            <VeracitySeal size={80} className="opacity-80" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-charcoal-mid uppercase tracking-tighter">Case Reference</div>
              <div className="text-sm font-bold">#A3F8C2-2026-D4</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-charcoal-mid uppercase tracking-tighter">Analysis Date</div>
              <div className="text-sm font-bold">2026.06.25 • 14:32 UTC</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-charcoal-mid uppercase tracking-tighter">Methodology</div>
              <div className="text-sm font-bold underline decoration-amber underline-offset-4 decoration-2">C.L.E.A.R. v2.4</div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] font-mono text-charcoal-mid uppercase tracking-tighter">Final Verdict</div>
              <div className="text-sm font-bold text-rose-600">CONFIRMED SYNTHETIC</div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="p-8 md:p-12 border-b border-stone-light bg-parchment/20 relative z-10">
          <div className="grid md:grid-cols-3 gap-12 items-center">
            <div className="md:col-span-2">
              <h2 className="font-serif text-2xl mb-4 italic text-charcoal-soft uppercase tracking-tight">Forensic Executive Summary</h2>
              <p className="text-lg leading-relaxed text-charcoal-mid mb-6">
                Subject media "Image_A3F8.jpg" exhibits structural anomalies consistent with 
                <span className="text-charcoal font-bold"> Sora (OpenAI)</span> spatial-temporal patch misalignments. 
                Spectral analysis confirms non-natural noise peaks at 14.2kHz, indicating latent space dithering characteristic of Diffusion-Transformer architectures.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-charcoal text-parchment rounded text-[10px] font-mono uppercase">
                Classification: Level 5 (Confirmed Synthetic)
              </div>
            </div>
            <div className="flex flex-col items-center">
              <VeracityGauge score={0.947} />
              <p className="mt-4 text-[10px] font-mono text-charcoal-light uppercase text-center tracking-tighter">
                Convergent Probability<br/>(Weighted Multi-Signal)
              </p>
            </div>
          </div>
        </div>

        {/* Model Attribution */}
        <div className="p-8 md:p-12 border-b border-stone-light">
          <SignatureCatalog />
        </div>

        {/* Technical Signals Table */}
        <div className="p-8 md:p-12 bg-white">
          <h3 className="font-serif text-xl mb-6 text-charcoal uppercase tracking-widest">Signal Matrix</h3>
          <div className="border border-stone-light rounded-lg overflow-hidden">
            <table className="w-full text-left font-mono text-[10px]">
              <thead>
                <tr className="bg-parchment-light border-b border-stone-light">
                  <th className="px-4 py-2 uppercase text-charcoal-light font-bold">Forensic Dimension</th>
                  <th className="px-4 py-2 uppercase text-charcoal-light text-center font-bold">Weight</th>
                  <th className="px-4 py-2 uppercase text-charcoal-light font-bold">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-light/50">
                {[
                  { dim: 'Generative Fingerprints', weight: '35%', obs: 'Detected: Sora (Patch Bound.)' },
                  { dim: 'Pixel/Frequency Analysis', weight: '25%', obs: 'Detected: Spectral Spikes (14.2kHz)' },
                  { dim: 'Metadata Forensics', weight: '20%', obs: 'Anomalous: Missing Lens Profile' },
                  { dim: 'Compression/Splicing', weight: '10%', obs: 'Inconclusive: High Comp. Ratio' },
                  { dim: 'Cryptographic Provenance', weight: '10%', obs: 'Absent: No C2PA Chain' },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-bold">{row.dim}</td>
                    <td className="px-4 py-2 text-center text-amber">{row.weight}</td>
                    <td className="px-4 py-2">{row.obs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="p-8 md:p-12 flex justify-between items-end bg-white border-t border-stone-light relative z-10">
          <div className="text-[10px] font-mono text-charcoal-light">
             REPORT_HASH: 0x7F4B3...E91A<br/>
             TIMESTAMP: 2026-06-25T14:32:01Z
          </div>
          <div className="text-right">
             <div className="text-[10px] font-mono text-charcoal-light mb-1">Page 01 of 02</div>
             <div className="text-[8px] font-mono text-charcoal-mid uppercase">Official Forensic Record</div>
          </div>
        </div>
      </div>

      {/* PAGE 2: TECHNICAL APPENDIX */}
      <div className="max-w-4xl mx-auto bg-[#FDFCFB] shadow-2xl border border-stone-light relative overflow-hidden">
        <div className="p-8 md:p-12 border-b-4 border-charcoal bg-white">
           <div className="flex justify-between items-center">
              <div className="text-xs font-mono text-charcoal font-bold uppercase tracking-widest">Case #A3F8C2 • Technical Appendix</div>
              <div className="text-xs font-mono text-charcoal-light">Provance Core v2.4.1</div>
           </div>
        </div>

        <div className="p-8 md:p-12 bg-white-warm">
          <PDFReportMediaAudit />
        </div>

        <div className="p-8 md:p-12 border-t border-stone-light">
          <h3 className="font-serif text-xl mb-6 text-charcoal uppercase tracking-widest">Forensic Signal Breakdown</h3>
          <EvidenceAppendix />
        </div>

        {/* Final Certification Footer */}
        <div className="p-12 flex justify-between items-end bg-white border-t-2 border-charcoal relative z-10">
          <div>
            <div className="text-[10px] font-mono text-charcoal-light uppercase tracking-widest mb-4 font-bold">Chain of Custody Certification</div>
            <div className="flex items-center gap-8">
              <div>
                <div className="text-[10px] font-mono text-charcoal-mid uppercase">Ledger Transaction</div>
                <div className="text-[10px] font-mono select-all text-amber font-bold">PRV_TX_9921_X82</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                <div className="text-[10px] font-mono text-emerald-600 font-bold uppercase tracking-widest">Digitally Sealed</div>
              </div>
            </div>
          </div>
          <div className="text-right">
             <div className="text-[10px] font-mono text-charcoal-light mb-1 uppercase">Methodology v2.4.1 (Stable)</div>
             <div className="text-[10px] font-mono text-charcoal-light mb-1">Page 02 of 02</div>
             <div className="text-[8px] font-mono text-charcoal-mid italic">© 2026 Provance Infrastructure. Verified Forensic Artifact.</div>
          </div>
        </div>
      </div>
      
      {/* Preview Navigation */}
      <div className="max-w-4xl mx-auto mt-12 flex flex-wrap justify-center gap-4 pb-20">
        <button className="px-10 py-4 bg-charcoal text-parchment font-mono text-xs rounded-lg hover:bg-charcoal-soft transition-all shadow-xl hover:-translate-y-1 active:scale-95 flex items-center gap-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          DOWNLOAD_OFFICIAL_PDF
        </button>
        <button className="px-10 py-4 border border-charcoal/20 text-charcoal font-mono text-xs rounded-lg hover:bg-white transition-all active:scale-95 uppercase tracking-widest">
          Share_Forensic_Link
        </button>
      </div>
    </div>
  )
}
