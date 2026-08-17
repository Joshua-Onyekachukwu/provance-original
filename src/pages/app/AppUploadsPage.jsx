import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  EmptyState,
  useRegisterCommands,
  useToast,
} from '../../components/ui'
import ForensicMediaFrame from '../../components/ForensicMediaFrame.jsx'
import { formatFileSize } from '../../components/app/scanPresentation.js'
import { USE_MOCK, initiateScan, submitScan } from '../../lib/api.js'
import { supabase } from '../../lib/supabase.js'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

const PROCESSING_MODES = [
  {
    id: 'quick',
    title: 'Quick',
    tagline: 'Baseline triage',
    eta: '~30 sec',
    description: 'Fast triage of provenance markers and known model signatures.',
    coverage: ['File fingerprint', 'Metadata integrity', 'Signature match'],
  },
  {
    id: 'standard',
    title: 'Standard',
    tagline: 'Balanced analysis',
    eta: '~2 min',
    description: 'Default depth. Full signal set with explainable evidence.',
    coverage: ['All Quick checks', 'Frequency-domain review', 'Confidence scoring'],
  },
  {
    id: 'deep',
    title: 'Deep',
    tagline: 'Full forensic pipeline',
    eta: '~6 min',
    description: 'Complete forensic sweep with frame-level continuity and spectral review.',
    coverage: ['All Standard checks', 'Frame continuity analysis', 'Extended artifact pass'],
  },
]

const PIPELINE_STEPS = [
  { id: 'record', label: 'Create record', detail: 'Verification ID reserved server-side' },
  { id: 'upload', label: 'Secure upload', detail: 'Streams to private storage with a signed token' },
  { id: 'queue', label: 'Queue for analysis', detail: 'Enters the pipeline and appears in the queue' },
  { id: 'verify', label: 'Report generated', detail: 'Signals and evidence produce the report' },
]

const CONSTRAINTS = [
  'Image uploads are supported today and power the current verification workflow.',
  'Files land in the Verification Queue the moment they are submitted.',
  'Video and audio will follow the same queue and report structure once those pipelines are enabled.',
  'Validation enforces file type and size before any analysis starts.',
]

const UPLOAD_STEPS = [
  { id: 'record', label: 'Create record' },
  { id: 'upload', label: 'Upload media' },
  { id: 'queue', label: 'Queue for analysis' },
  { id: 'verify', label: 'Verification' },
]

function UploadIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}

function CheckIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

function ShieldIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  )
}

// Module-level guard: the ?demo= affordance seeds exactly once per page load,
// even under StrictMode double-mounts or HMR remounts, so a reload never
// creates duplicate demo scans.
let demoSeededFor = null

// Idempotency-Key per selected file: stable across retries of the same file
// (a network blip or double-click reuses the original scan reservation),
// regenerated whenever the file changes or the form resets.
function newIdempotencyKey() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default function AppUploadsPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [selectedFile, setSelectedFile] = useState(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey())
  const [processingMode, setProcessingMode] = useState('standard')
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const [quotaExhausted, setQuotaExhausted] = useState(false)
  const [activeScanId, setActiveScanId] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [skipAutoNav, setSkipAutoNav] = useState(false)
  const [demoAutoStart, setDemoAutoStart] = useState(false)
  // Set when submitScan reports an identical-file hit: the record completed
  // instantly with a reused payload, so the panel + CTA shift from the queue
  // story to the reuse story.
  const [deduplicated, setDeduplicated] = useState(null)

  const isBusy = !['idle', 'error', 'queued'].includes(phase)

  const fileValidation = useMemo(() => {
    if (!selectedFile) return null
    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
      return 'Only JPG, PNG, WEBP, and GIF images are supported right now.'
    }
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      return 'This file is larger than the 50 MB upload limit.'
    }
    return null
  }, [selectedFile])

  const selectedMode = PROCESSING_MODES.find((mode) => mode.id === processingMode) || PROCESSING_MODES[1]

  useRegisterCommands(
    [
      {
        id: 'uploads.browse-file',
        group: 'Uploads',
        label: 'Choose a media file',
        hint: 'JPG, PNG, WEBP, GIF · up to 50 MB',
        keywords: ['upload', 'file', 'browse', 'media'],
        onSelect: () => document.getElementById('media-upload-input')?.click(),
      },
      {
        id: 'uploads.set-mode',
        group: 'Uploads',
        label: `Use ${selectedMode.title} processing mode`,
        hint: `${selectedMode.eta} · ${selectedMode.tagline}`,
        keywords: ['upload', 'mode', 'processing', 'quick', 'standard', 'deep'],
        onSelect: () =>
          setProcessingMode((current) =>
            current === 'quick' ? 'standard' : current === 'standard' ? 'deep' : 'quick',
          ),
      },
      {
        id: 'uploads.start-verification',
        group: 'Uploads',
        label: selectedFile ? 'Start verification' : 'Start verification (choose a file first)',
        hint: selectedFile ? selectedFile.name : 'No file selected',
        keywords: ['upload', 'start', 'verify', 'submit'],
        onSelect: () => {
          if (selectedFile && !isBusy) handleStart()
          else document.getElementById('media-upload-input')?.click()
        },
      },
    ],
    [selectedMode, selectedFile, isBusy],
  )

  const acceptFile = useCallback(
    (file) => {
      if (!file) return
      if (isBusy) return // never swap files while an upload is in flight
      setError(null)
      setPhase('idle')
      setActiveScanId(null)
      setUploadProgress(0)
      setSkipAutoNav(false)
      setDeduplicated(null)
      setIdempotencyKey(newIdempotencyKey())
      setSelectedFile(file)
    },
    [isBusy],
  )

  const handleDrop = (event) => {
    event.preventDefault()
    setDragActive(false)
    acceptFile(event.dataTransfer?.files?.[0])
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (event) => {
    // Ignore dragleave when the pointer is still inside a child element.
    if (event.currentTarget.contains(event.relatedTarget)) return
    setDragActive(false)
  }

  const handleFileInput = (event) => {
    acceptFile(event.target.files?.[0])
    event.target.value = ''
  }

  const handleReset = () => {
    setError(null)
    setQuotaExhausted(false)
    setPhase('idle')
    setActiveScanId(null)
    setUploadProgress(0)
    setSkipAutoNav(false)
    setDeduplicated(null)
    setIdempotencyKey(newIdempotencyKey())
    setSelectedFile(null)
  }

  const handleRetry = () => {
    setError(null)
    setQuotaExhausted(false)
    setPhase('idle')
    setUploadProgress(0)
    setSkipAutoNav(false)
    setDeduplicated(null)
  }

  // Simulated upload progress (mock mode only; real uploads report no partial progress).
  useEffect(() => {
    if (phase !== 'uploading' || !USE_MOCK) return
    setUploadProgress(0)
    const interval = window.setInterval(() => {
      setUploadProgress((value) => Math.min(100, value + 9 + Math.random() * 16))
    }, 130)
    return () => window.clearInterval(interval)
  }, [phase])

  // Auto-land once the scan is queued — on the Verification Queue for fresh
  // submissions, straight onto the (reused) report when dedup completed it.
  useEffect(() => {
    if (phase !== 'queued' || !activeScanId || skipAutoNav) return
    const timer = window.setTimeout(() => {
      if (deduplicated) {
        navigate(`/app/reports/${activeScanId}`)
      } else {
        navigate('/app/queue', { state: { newScanId: activeScanId } })
      }
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [phase, activeScanId, skipAutoNav, navigate, deduplicated])

  // Dev-only demo affordance (inert in production builds): ?demo=file seeds a
  // sample image so the upload flow can be exercised without a native file
  // picker, and ?demo=start also auto-runs the upload. Matches the ?state=
  // demo pattern in src/lib/useDemoState.js.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const params = new URLSearchParams(window.location.search)
    const demo = params.get('demo')
    if (demo !== 'file' && demo !== 'start') return
    if (demoSeededFor === window.location.search) return
    demoSeededFor = window.location.search
    acceptFile(
      new File([new Uint8Array(48 * 1024)], 'demo_upload_2026.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now(),
      }),
    )
    if (demo === 'start') setDemoAutoStart(true)
  }, [acceptFile])

  useEffect(() => {
    if (!demoAutoStart || !selectedFile || phase !== 'idle') return
    setDemoAutoStart(false)
    handleStart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoAutoStart, selectedFile, phase])

  const handleStart = async () => {
    if (!selectedFile) return
    if (fileValidation) return // the amber validation block already communicates this
    if (!USE_MOCK && !supabase) {
      setError('Supabase Storage is not configured for this environment.')
      return
    }

    setError(null)
    setUploadProgress(0)
    setSkipAutoNav(false)
    setPhase('starting')

    try {
      const initiation = await initiateScan(
        {
          originalFilename: selectedFile.name,
          mimeType: selectedFile.type,
          fileSizeBytes: selectedFile.size,
          mediaType: 'image',
          processingMode,
        },
        idempotencyKey,
      )

      setActiveScanId(initiation.scanId)
      setPhase('uploading')

      if (USE_MOCK) {
        await new Promise((resolve) => window.setTimeout(resolve, 900))
      } else {
        const uploadResult = await supabase.storage
          .from(initiation.bucket)
          .uploadToSignedUrl(initiation.path, initiation.token, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          })
        if (uploadResult.error) {
          throw new Error(uploadResult.error.message)
        }
      }

      setPhase('submitting')
      const submission = await submitScan(initiation.scanId)
      if (submission?.deduplicated) {
        setDeduplicated({
          sourceScanId: submission.sourceScanId,
          sourceReportId: submission.sourceReportId,
        })
        toast.info('Identical file already verified', {
          description:
            'This file matched a prior verification — the existing report was reused without reprocessing.',
        })
      } else {
        setDeduplicated(null)
      }
      setPhase('queued')
    } catch (uploadError) {
      setPhase('error')
      // 402 = plan quota exhausted for this billing cycle. Show the dedicated
      // quota message (with the reset hint) instead of a generic upload error.
      if (uploadError.status === 402) {
        setQuotaExhausted(true)
        setError(uploadError.message || 'Monthly scan quota reached.')
      } else {
        setQuotaExhausted(false)
        setError(uploadError.message || 'Upload failed.')
      }
    }
  }

  const stepState = (stepId) => {
    if (phase === 'starting') {
      return stepId === 'record' ? 'active' : 'pending'
    }
    if (phase === 'uploading') {
      return stepId === 'record' ? 'done' : stepId === 'upload' ? 'active' : 'pending'
    }
    if (phase === 'submitting') {
      return stepId === 'verify' ? 'pending' : 'done'
    }
    if (phase === 'queued') {
      return stepId === 'verify' ? 'active' : 'done'
    }
    return 'pending'
  }

  const previewBadge =
    phase === 'uploading'
      ? `Uploading ${Math.round(uploadProgress)}%`
      : phase === 'starting'
        ? 'Preparing record'
        : phase === 'submitting'
          ? 'Submitting'
          : phase === 'queued'
            ? deduplicated
              ? 'Report reused — identical file'
              : 'Queued for analysis'
            : 'Ready to verify'

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Upload workspace
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Submit media for verification
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Drag in an image, pick the analysis depth, and send it into the pipeline.
          Every submission becomes a verification record that lands in the queue
          the moment it is uploaded.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {/* ── Upload card ─────────────────────────────────────────────── */}
          <Card
            eyebrow="1 · Upload media"
            title="Add the file to verify"
            description="Images only today. Validation enforces type and size before anything leaves this page."
            padding="lg"
          >
            {/* Dropzone */}
            <label
              htmlFor="media-upload-input"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 ${
                selectedFile
                  ? 'border-stone-light bg-parchment/60 hover:border-amber/40'
                  : dragActive
                    ? 'scale-[1.01] border-amber bg-amber/5'
                    : 'border-stone-light bg-parchment hover:border-amber/40 hover:bg-parchment'
              }`}
            >
              <input
                id="media-upload-input"
                type="file"
                accept={ALLOWED_MIME_TYPES.join(',')}
                onChange={handleFileInput}
                className="sr-only peer"
              />
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors ${
                  dragActive
                    ? 'border-amber/50 bg-amber/10 text-amber'
                    : 'border-stone-light bg-white-warm text-charcoal-mid group-hover:text-amber'
                }`}
              >
                <UploadIcon />
              </div>
              <p className="mt-4 font-serif text-lg text-charcoal">
                {dragActive ? 'Drop it to verify' : selectedFile ? 'Replace the file' : 'Drag and drop an image here'}
              </p>
              <p className="mt-1.5 text-sm text-charcoal-mid">
                {selectedFile ? 'Drop a new file to swap it in' : 'or browse from your device'}
              </p>
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                JPG · PNG · WEBP · GIF · up to 50 MB
              </p>
            </label>

            {/* Selected file details */}
            {selectedFile && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-light bg-parchment px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal">{selectedFile.name}</p>
                  <p className="mt-0.5 text-xs text-charcoal-light">
                    {formatFileSize(selectedFile.size)} · {selectedFile.type || 'unknown type'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset} disabled={isBusy}>
                  Remove
                </Button>
              </div>
            )}

            {fileValidation && !isBusy && (
              <p className="mt-3 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-2.5 text-sm text-amber-800">
                {fileValidation}
              </p>
            )}
            {error && phase === 'idle' && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                {error}
              </p>
            )}

            {/* Forensic preview */}
            {selectedFile && phase !== 'error' && (
              <div className="mt-6">
                <ForensicMediaFrame label={selectedFile.name} badge={previewBadge} />
              </div>
            )}

            {/* Processing mode selector */}
            <div className="mt-8">
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-serif text-lg text-charcoal">Processing mode</h4>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                  {selectedMode.eta} estimate
                </p>
              </div>
              <div role="radiogroup" aria-label="Processing mode" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {PROCESSING_MODES.map((mode) => {
                  const selected = processingMode === mode.id
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={isBusy}
                      onClick={() => setProcessingMode(mode.id)}
                      className={`relative rounded-2xl border p-4 text-left transition-all duration-200 ${
                        selected
                          ? 'border-amber/60 bg-amber/5 shadow-sm ring-1 ring-amber/30'
                          : 'border-stone-light bg-white-warm hover:border-charcoal/25'
                      } ${isBusy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-serif text-base text-charcoal">{mode.title}</span>
                        {selected && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber text-charcoal">
                            <CheckIcon className="h-3 w-3" />
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-charcoal-light">{mode.tagline}</span>
                      <span className="mt-2 inline-flex rounded-full border border-stone-light bg-parchment px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-charcoal-mid">
                        {mode.eta}
                      </span>
                      {selected && (
                        <span className="mt-3 block space-y-1.5 border-t border-amber/20 pt-3">
                          {mode.coverage.map((item) => (
                            <span key={item} className="flex items-start gap-2 text-xs text-charcoal-mid">
                              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
                              {item}
                            </span>
                          ))}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-charcoal-light">
                {selectedMode.description}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                loading={isBusy && phase !== 'queued'}
                disabled={!selectedFile || Boolean(fileValidation) || phase === 'queued'}
                onClick={handleStart}
              >
                {phase === 'queued' ? 'Queued' : 'Start verification'}
              </Button>
              {selectedFile && phase !== 'queued' && (
                <Button variant="ghost" onClick={handleReset} disabled={isBusy}>
                  Reset
                </Button>
              )}
              {phase === 'queued' && activeScanId && (
                <Button
                  to={deduplicated ? `/app/reports/${activeScanId}` : '/app/queue'}
                  state={{ newScanId: activeScanId }}
                  size="lg"
                  variant="success"
                >
                  {deduplicated ? 'View reused report' : 'View verification queue'}
                </Button>
              )}
            </div>
          </Card>

          {/* ── Progress / result panel ─────────────────────────────────── */}
          {phase !== 'idle' && (
            <div aria-live="polite">
            <Card
              eyebrow="Upload status"
              title={
                phase === 'queued'
                  ? deduplicated
                    ? 'Identical file already verified'
                    : 'Added to the verification queue'
                  : phase === 'error'
                    ? 'Verification could not start'
                    : 'Moving through the pipeline'
              }
              description={
                phase === 'queued'
                  ? deduplicated
                    ? `This file matched a prior verification (${deduplicated.sourceScanId}) — the existing evidence payload was reused instead of reprocessing the media.`
                    : 'Your file is queued for a worker. Opening the Verification Queue shortly.'
                  : phase === 'error'
                    ? error || 'Something went wrong.'
                    : 'The upload flows through the same steps every production scan takes.'
              }
              padding="lg"
            >
              {phase === 'error' ? (
                <EmptyState
                  variant="error"
                  title={quotaExhausted ? 'Monthly scan quota reached' : 'Upload failed'}
                  description={
                    quotaExhausted
                      ? `${error || 'Your plan\u2019s scan allowance for this cycle is used up.'} Upgrade your plan or wait for the cycle to reset to resume scanning.`
                      : error || 'Something went wrong.'
                  }
                  action={
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={handleRetry}>
                        Try again
                      </Button>
                      <Button variant="ghost" onClick={handleReset}>
                        Choose a different file
                      </Button>
                    </div>
                  }
                />
              ) : (
                <>
                  <ol className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    {UPLOAD_STEPS.map((step) => {
                      const state = stepState(step.id)
                      return (
                        <li
                          key={step.id}
                          className={`rounded-2xl border px-4 py-3 ${
                            state === 'done'
                              ? 'border-emerald-200/70 bg-emerald-50/50'
                              : state === 'active'
                                ? 'border-amber/40 bg-amber/5'
                                : 'border-stone-light bg-parchment/50 opacity-60'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                                state === 'done'
                                  ? 'bg-emerald-500 text-white'
                                  : state === 'active'
                                    ? 'bg-amber text-charcoal'
                                    : 'bg-stone-light text-charcoal-light'
                              }`}
                            >
                              {state === 'done' ? (
                                <CheckIcon className="h-3 w-3" />
                              ) : (
                                UPLOAD_STEPS.findIndex((s) => s.id === step.id) + 1
                              )}
                            </span>
                            <span className="text-xs font-medium text-charcoal">{step.label}</span>
                          </span>
                        </li>
                      )
                    })}
                  </ol>

                  {phase === 'uploading' && (
                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs text-charcoal-mid">
                        <span>Uploading to secure storage</span>
                        <span className="font-mono tabular-nums">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-light">
                        <div
                          className="h-full rounded-full bg-amber transition-[width] duration-200 ease-out"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {activeScanId && (
                    <p className="mt-5 rounded-xl border border-stone-light bg-parchment px-4 py-3 font-mono text-xs text-charcoal-mid">
                      Verification ID:{' '}
                      <span className="font-semibold text-charcoal">{activeScanId}</span>
                      {' · '}mode:{' '}
                      <span className="font-semibold text-charcoal">{processingMode}</span>
                    </p>
                  )}
                </>
              )}
            </Card>
            </div>
          )}
        </div>

        {/* ── Right rail ────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <Card
            eyebrow="Pipeline"
            title="What happens next"
            description="Every submission follows the same four-step path through the platform."
          >
            <ol className="space-y-4">
              {PIPELINE_STEPS.map((step, index) => (
                <li key={step.id} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-stone-light bg-white-warm font-mono text-xs font-semibold text-charcoal">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-charcoal">{step.label}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-charcoal-mid">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card
            eyebrow="Trust by default"
            title="Supported media"
            description="Phase-ready constraints for the current verification workflow."
          >
            <ul className="space-y-3">
              {CONSTRAINTS.map((constraint) => (
                <li
                  key={constraint}
                  className="flex items-start gap-2.5 rounded-2xl border border-stone-light bg-parchment px-4 py-3 text-xs leading-relaxed text-charcoal-mid"
                >
                  <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  {constraint}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
