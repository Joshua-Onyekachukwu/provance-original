import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'

const LUXE = [0.32, 0.72, 0, 1]

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  visible: (i = 0) => ({ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.85, delay: 0.1 * i, ease: LUXE } }),
}

export default function DocsPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Developer access."
        description="Use this page to understand the API shape, expected verification flow, and the integration path for teams requesting developer access."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Docs' }]}
      />

      {/* ── Getting Started ── */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-14">
              <motion.span variants={fadeUp} className="eyebrow">Quick Start</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl lg:text-[3.4rem] lg:leading-[1.05] mt-5 text-balance text-charcoal">
                A three-step <span className="italic text-trust">verification flow</span>.
              </motion.h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Register Interest', desc: 'Share your API use case, expected volume, and integration environment through the waitlist or contact flow.', icon: '01' },
                { title: 'Map The Workflow', desc: 'Plan around authenticated submission, status tracking, and structured result retrieval.', icon: '02' },
                { title: 'Expand Over Time', desc: 'Start with core verification and add reporting, callbacks, and operational integration as access expands.', icon: '03' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: LUXE }}
                  className="group"
                >
                  <div className="bezel-shell h-full transition-transform duration-700 ease-luxe group-hover:-translate-y-1">
                    <div className="bezel-core h-full p-6 text-center">
                      <span className="text-amber font-mono text-xs uppercase tracking-[0.2em] mb-3 block">{item.icon}</span>
                      <h3 className="font-serif text-lg text-charcoal mb-2">{item.title}</h3>
                      <p className="text-charcoal-mid text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── API Reference ── */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
              <motion.span variants={fadeUp} className="eyebrow eyebrow-dark">API Reference</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl lg:text-[3.4rem] lg:leading-[1.05] mt-5 text-balance">
                Submit media for <span className="italic text-trust-soft">verification</span>.
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-stone text-sm max-w-xl mx-auto">
                Draft contract — this documents the real <code className="font-mono text-trust-soft">POST /v1/scans</code> endpoint the
                backend serves today (image-first, behind Supabase JWT auth). Hosts shown are the planned public surface; no heatmaps,
                callback webhooks, or SDKs ship yet.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {/* Request Example — initiate */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, ease: LUXE }}
                className="bezel-shell-dark"
              >
                <div className="bezel-core-dark overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <span className="ml-3 flex min-w-0 break-words items-center gap-2 text-xs text-stone font-mono">
                    <span className="px-2 py-0.5 bg-emerald-700/50 text-emerald-300 rounded text-[10px] font-bold">POST</span>
                    https://api.provance.io/v1/scans
                  </span>
                </div>
                <div className="p-5 md:p-8">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone/60 mb-4">
                    Step 1 — reserve the scan and get a signed upload URL
                  </p>
                  <pre className="text-sm font-mono text-stone leading-relaxed overflow-x-auto">
                    <code>{`curl -X POST https://api.provance.io/v1/scans \\
  -H "Authorization: Bearer <jwt>" \\
  -H "Idempotency-Key: 7f2c9a1e-4b8d" \\
  -H "Content-Type: application/json" \\
  -d '{
    "originalFilename": "evidence-photo-01.jpg",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 4200000,
    "mediaType": "image",
    "processingMode": "standard"
  }'`}</code>
                  </pre>
                </div>
                </div>
              </motion.div>

              {/* Response Example — 201 reserved */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.1, ease: LUXE }}
                className="bezel-shell-dark"
              >
                <div className="bezel-core-dark overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <span className="ml-3 flex min-w-0 break-words items-center gap-2 text-xs text-stone font-mono">
                    <span className="px-2 py-0.5 bg-emerald-700/50 text-emerald-300 rounded text-[10px] font-bold">201</span>
                    Scan reserved — upload the bytes to signedUrl
                  </span>
                </div>
                <div className="p-5 md:p-8">
                  <pre className="text-sm font-mono text-stone leading-relaxed overflow-x-auto">
                    <code>{`{
  "scanId": "7f2c9a1e-4b8d-4f62-9a31-3d8e5c7b2a90",
  "status": "awaiting_upload",
  "bucket": "scan-uploads",
  "path": "<user-id>/7f2c9a1e/evidence-photo-01.jpg",
  "token": "<signed-upload-token>",
  "signedUrl": "https://<project>.supabase.co/storage/v1/object/upload/sign/scan-uploads/<user-id>/7f2c9a1e/evidence-photo-01.jpg?token=..."
}`}</code>
                  </pre>
                </div>
                </div>
              </motion.div>

              {/* Completed scan — GET */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.2, ease: LUXE }}
                className="bezel-shell-dark"
              >
                <div className="bezel-core-dark overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-white/5">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  </div>
                  <span className="ml-3 flex min-w-0 break-words items-center gap-2 text-xs text-stone font-mono">
                    <span className="px-2 py-0.5 bg-sky-700/50 text-sky-300 rounded text-[10px] font-bold">GET</span>
                    /v1/scans/{'{scanId}'} — poll until status is completed
                  </span>
                </div>
                <div className="p-5 md:p-8">
                  <pre className="text-sm font-mono text-stone leading-relaxed overflow-x-auto">
                    <code>{`{
  "scan": {
    "id": "7f2c9a1e-4b8d-4f62-9a31-3d8e5c7b2a90",
    "status": "completed",
    "original_filename": "evidence-photo-01.jpg",
    "mime_type": "image/jpeg",
    "file_size_bytes": 4200000,
    "processing_mode": "standard",
    "verdict": "suspicious",
    "completed_at": "2026-07-16T14:32:00.000Z",
    "result_payload": {
      "payload_version": "1.0.0",
      "verdict": {
        "class": "suspicious",
        "display_label": "Suspicious",
        "confidence_score": 0.69,
        "confidence_level": "moderate",
        "signal_count_total": 4,
        "signal_count_completed": 4,
        "primary_contributing_signals": [
          "file_integrity",
          "metadata_forensics",
          "visual_statistics"
        ],
        "plain_language_summary": "The evidence package contains enough anomalous signals to recommend manual review before the media is treated as trustworthy."
      },
      "signals": [
        {
          "signal_name": "file_integrity",
          "signal_display_name": "File Integrity",
          "status": "clear",
          "score": 0.14,
          "status_reason": "File header matches the declared image/jpeg upload type."
        },
        {
          "signal_name": "visual_statistics",
          "signal_display_name": "Visual Statistics",
          "status": "warning",
          "score": 0.78,
          "status_reason": "Blockiness and edge-density patterns are consistent with heavy re-encoding."
        }
      ],
      "report": {
        "report_id": "PRV-7F2C9A1E",
        "report_url": "https://app.provance.io/app/reports/7f2c9a1e-4b8d-4f62-9a31-3d8e5c7b2a90/print"
      },
      "metadata": {
        "detected_format": "JPEG",
        "header_matches_mime": true,
        "c2pa_marker_detected": false,
        "total_processing_time_ms": 1247
      }
    }
  }
}`}</code>
                  </pre>
                </div>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="text-xs text-stone/70 font-mono leading-relaxed"
              >
                Then submit: <span className="text-emerald-300">POST /v1/scans/{'{scanId}'}/submit</span> →{' '}
                <span className="text-amber-300">202</span> {'{'} "scanId": "…", "status": "queued" {'}'}. Poll the scan every few
                seconds until <span className="text-stone">completed</span> or <span className="text-stone">failed</span> — the
                dashboard's 5s poll does exactly this.
                <br />
                Verdict classes the classifier emits:{' '}
                <span className="text-stone">likely_authentic · inconclusive · suspicious</span>; the{' '}
                <span className="text-stone">scan.verdict</span> field maps them to{' '}
                <span className="text-stone">authentic · inconclusive · suspicious</span>. Status values:{' '}
                <span className="text-stone">awaiting_upload · queued · processing · completed · failed</span>.
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Verification Lifecycle ── */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <div className="max-w-4xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="text-center mb-12">
              <motion.span variants={fadeUp} className="eyebrow">Verification Lifecycle</motion.span>
              <motion.h2 variants={fadeUp} className="font-serif text-3xl sm:text-4xl lg:text-[3.4rem] lg:leading-[1.05] mt-5 text-balance text-charcoal">
                From upload to a <span className="italic text-trust">defensible verdict</span>.
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-charcoal-mid text-sm max-w-lg mx-auto">
                Scans move through an explicit lifecycle. Today that progress is tracked by polling — webhook
                callbacks and SDKs are planned, not shipped.
              </motion.p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Reserve → Upload → Submit',
                  desc: 'Initiate returns a signed upload URL; you PUT the file bytes, then submit to enqueue. An optional Idempotency-Key dedupes retried initiates.',
                  items: ['POST /v1/scans', 'PUT bytes to signedUrl', 'POST /v1/scans/{id}/submit'],
                },
                {
                  title: 'Queue + Worker',
                  desc: 'Submissions enter the scan-processing queue (BullMQ). Failed scans keep a failure_reason and retry up to 3 times with backoff before landing in failed.',
                  items: ['awaiting_upload → queued', 'processing → completed / failed', 'Per-plan quota gate: 402 + Retry-After'],
                },
                {
                  title: 'Poll The Scan',
                  desc: 'The async mechanism today: poll GET /v1/scans/{id} every few seconds until completed or failed, then read result_payload. No callback webhooks exist yet.',
                  items: ['5s poll cadence', 'result_payload on completion', 'Printable report via report.report_url'],
                },
                {
                  title: 'Planned: SDKs & Tiers',
                  desc: 'Language-specific tooling and public rate tiers follow contract stability. Developer access is gated through the waitlist today.',
                  items: ['TypeScript first', 'Python later', 'Broader SDKs after contract stability'],
                },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.7, delay: i * 0.08, ease: LUXE }}
                  className="group"
                >
                  <div className="bezel-shell h-full transition-transform duration-700 ease-luxe group-hover:-translate-y-1">
                    <div className="bezel-core h-full p-6">
                      <h3 className="font-serif text-lg text-charcoal mb-2">{item.title}</h3>
                      <p className="text-charcoal-mid text-sm leading-relaxed mb-3">{item.desc}</p>
                      <ul className="space-y-1.5">
                        {item.items.map((li) => (
                          <li key={li} className="flex items-center gap-2 text-xs text-charcoal-mid font-mono">
                            <span className="w-1 h-1 bg-amber rounded-full shrink-0" />
                            {li}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-10 flex flex-wrap gap-4 justify-center"
            >
              <Link to="/sample-report" className="btn-primary">
                View Sample Report
              </Link>
              <Link to="/waitlist" className="btn-secondary">
                Register API interest
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
