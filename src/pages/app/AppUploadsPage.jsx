import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { mockScans, mockQueueSnapshot } from '../../lib/mockData.js'
import StatCard from '../../components/admin/StatCard.jsx'
import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_FORMATS = ['PNG', 'JPEG', 'MP4', 'MOV', 'MP3', 'WAV']
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
]
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024 // 500MB

const STEP_LABELS = ['Prepare', 'Upload', 'Queue', 'Analyze', 'Complete']

const MEDIA_TYPE_CATEGORIES = {
  image: { label: 'Image', tone: 'bg-sky-50 text-sky-700 border-sky-200' },
  video: { label: 'Video', tone: 'bg-purple-50 text-purple-700 border-purple-200' },
  audio: { label: 'Audio', tone: 'bg-amber-50 text-amber-700 border-amber-200' },
}

function getMediaCategory(mimeType) {
  if (!mimeType) return null
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return null
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getStepIndex(phase) {
  const map = { preparing: 0, uploading: 1, submitting: 2, processing: 3, complete: 4 }
  return map[phase] ?? -1
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DropZone({ onFileSelect, disabled, error }) {
  const [dragOver, setDragOver] = useState(false)
  const [dragInvalid, setDragInvalid] = useState(false)
  const inputRef = useRef(null)

  const handleDragEnter = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return

      const types = e.dataTransfer?.types || []
      const hasFiles = types.includes('Files')
      if (!hasFiles) return

      const items = Array.from(e.dataTransfer?.items || [])
      const allValid = items.every((item) => {
        const mime = item.type
        return ALLOWED_MIME_TYPES.some((allowed) => {
          if (allowed.endsWith('/*')) return mime.startsWith(allowed.replace('/*', '/'))
          return mime === allowed
        })
      })

      if (allValid) {
        setDragOver(true)
        setDragInvalid(false)
      } else {
        setDragInvalid(true)
        setDragOver(false)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    setDragInvalid(false)
  }, [])

  const handleDragOver = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (disabled) return
    },
    [disabled],
  )

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)
      setDragInvalid(false)
      if (disabled) return

      const file = e.dataTransfer?.files?.[0]
      if (file) onFileSelect(file)
    },
    [disabled, onFileSelect],
  )

  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    // Reset so re-selecting the same file triggers onChange
    e.target.value = ''
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload media file"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
      onClick={handleClick}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative cursor-pointer rounded-[2rem] border-2 border-dashed p-10 text-center transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/20 focus-visible:ring-offset-2
        ${
          disabled
            ? 'cursor-not-allowed border-stone-light/50 bg-stone-light/20 opacity-50'
            : dragOver
              ? 'border-emerald-400 bg-emerald-50/60 shadow-[0_0_0_8px_rgba(52,211,153,0.08)]'
              : dragInvalid
                ? 'border-rose-300 bg-rose-50/40'
                : 'border-stone-light bg-parchment/60 hover:border-charcoal/25 hover:bg-parchment'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Upload icon */}
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border transition-colors ${
          dragOver
            ? 'border-emerald-300 bg-emerald-50 text-emerald-600'
            : dragInvalid
              ? 'border-rose-200 bg-rose-50 text-rose-500'
              : 'border-stone-light bg-white-warm text-charcoal-light'
        }`}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <p className="mt-5 font-serif text-xl text-charcoal">
        {dragOver
          ? 'Drop your file to begin'
          : dragInvalid
            ? 'Unsupported file type'
            : 'Drag & drop or click to browse'}
      </p>
      <p className="mt-2 text-sm text-charcoal-mid">
        {dragOver
          ? 'Release to start verification'
          : dragInvalid
            ? 'Please select a supported media file (PNG, JPEG, MP4, MOV, MP3, WAV)'
            : 'Select a media file to begin the verification workflow'}
      </p>

      {error && (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </p>
      )}
    </div>
  )
}

function FileMetadataCard({
  file,
  onRemove,
  onStart,
  disabled,
}) {
  const mediaCategory = getMediaCategory(file?.type)
  const cat = mediaCategory ? MEDIA_TYPE_CATEGORIES[mediaCategory] : null

  // Read image dimensions for image files
  const [imageDimensions, setImageDimensions] = useState(null)
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Selected file
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Type icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-stone-light bg-parchment text-charcoal-mid">
              {mediaCategory === 'image' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              )}
              {mediaCategory === 'video' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              )}
              {mediaCategory === 'audio' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              )}
              {!mediaCategory && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-charcoal">{file.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {cat && (
                  <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${cat.tone}`}>
                    {cat.label}
                  </span>
                )}
                <span className="text-xs text-charcoal-light">{formatBytes(file.size)}</span>
                {imageDimensions && (
                  <span className="text-xs text-charcoal-light">
                    {imageDimensions.width} × {imageDimensions.height}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="rounded-xl border border-stone-light px-4 py-2.5 text-sm text-charcoal-mid transition hover:border-rose-200 hover:text-rose-600 disabled:opacity-50"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-2.5 text-sm font-medium text-parchment transition hover:bg-charcoal-soft disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
            Start Verification
          </button>
        </div>
      </div>

      {/* Metadata fields */}
      <div className="mt-6 grid gap-4 border-t border-stone-light pt-6 sm:grid-cols-2">
        {/* Purpose tags — disabled coming soon */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Purpose tags
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {['News verification', 'Fact-checking', 'Research', 'Content moderation', 'Archival'].map(
              (tag) => (
                <span
                  key={tag}
                  className="cursor-not-allowed rounded-lg border border-stone-light/60 bg-stone-light/20 px-3 py-1.5 text-xs text-charcoal-light/60"
                >
                  {tag}
                </span>
              ),
            )}
          </div>
          <p className="mt-2 text-[11px] text-charcoal-light/70">Coming soon — tag your uploads for better organization</p>
        </div>

        {/* Notes */}
        <div>
          <label
            htmlFor="upload-notes"
            className="block font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light"
          >
            Notes
          </label>
          <textarea
            id="upload-notes"
            rows={3}
            placeholder="Add context about this media file (optional)..."
            className="mt-2 block w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal/35 resize-none"
          />
        </div>
      </div>
    </motion.div>
  )
}

function UploadStepper({ currentPhase, failedStep = null }) {
  const currentIndex = getStepIndex(currentPhase)
  const isFailed = currentPhase === 'failed'

  return (
    <div className="mt-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
        Upload progress
      </p>
      <div className="mt-4 flex items-center gap-0">
        {STEP_LABELS.map((label, i) => {
          let state = 'pending' // pending | active | completed | failed
          if (isFailed && failedStep != null && i === failedStep) {
            state = 'failed'
          } else if (i < currentIndex) {
            state = 'completed'
          } else if (i === currentIndex) {
            state = 'active'
          } else {
            state = 'pending'
          }

          return (
            <div key={label} className="flex flex-1 items-center">
              {/* Step circle */}
              <div className="relative flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                    state === 'completed'
                      ? 'border-emerald-400 bg-emerald-400 text-white'
                      : state === 'active'
                        ? 'border-charcoal bg-charcoal text-parchment shadow-[0_0_0_4px_rgba(19,22,29,0.08)]'
                        : state === 'failed'
                          ? 'border-rose-400 bg-rose-400 text-white'
                          : 'border-stone-light bg-parchment text-charcoal-light'
                  }`}
                >
                  {state === 'completed' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : state === 'failed' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-center text-[11px] font-medium uppercase tracking-[0.12em] ${
                    state === 'completed'
                      ? 'text-emerald-600'
                      : state === 'active'
                        ? 'text-charcoal'
                        : state === 'failed'
                          ? 'text-rose-600'
                          : 'text-charcoal-light/60'
                  }`}
                >
                  {label}
                </span>
              </div>

              {/* Connector line (not after last) */}
              {i < STEP_LABELS.length - 1 && (
                <div className="mx-1 h-0.5 flex-1 self-start mt-4">
                  <div className="h-full rounded-full bg-stone-light">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i < currentIndex
                          ? 'w-full bg-emerald-400'
                          : i === currentIndex && state === 'active'
                            ? 'w-1/2 bg-charcoal animate-pulse'
                            : isFailed && failedStep != null && i === failedStep
                              ? 'w-1/2 bg-rose-300'
                              : 'w-0'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ProcessingPanel({ scanId, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-3xl border border-sky-100 bg-sky-50/40 p-6"
    >
      <div className="flex items-center gap-4">
        {/* Pulsing dot */}
        <div className="relative flex h-10 w-10 items-center justify-center">
          <div className="absolute h-4 w-4 rounded-full bg-sky-400 animate-ping opacity-60" />
          <div className="h-3 w-3 rounded-full bg-sky-500" />
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-sky-700">
              Processing
            </span>
            {scanId && (
              <span className="font-mono text-xs text-charcoal-mid">ID: {scanId}</span>
            )}
          </div>
          <p className="mt-2 text-sm text-charcoal-mid">
            Provance is extracting file fingerprints, metadata, provenance markers, and visual
            statistics before generating the initial report payload.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm text-rose-600 transition hover:border-rose-300 hover:bg-rose-50"
        >
          Cancel
        </button>
      </div>

      {/* Queue position + ETA (future) placeholders */}
      <div className="mt-4 grid gap-3 rounded-2xl border border-sky-100 bg-white/60 p-4 sm:grid-cols-2">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-light bg-parchment text-charcoal-light">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </div>
          <div>
            <p className="text-xs text-charcoal-light">Queue position</p>
            <p className="text-sm font-medium text-charcoal-mid/70">Available soon</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-light bg-parchment text-charcoal-light">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <p className="text-xs text-charcoal-light">Estimated time</p>
            <p className="text-sm font-medium text-charcoal-mid/70">Available soon</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CompleteState({ scanId, onRunAnother }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-8 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[2rem] border-2 border-emerald-300 bg-emerald-100 text-emerald-600">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h3 className="mt-5 font-serif text-2xl text-charcoal">Verification complete</h3>
      <p className="mt-2 text-sm text-charcoal-mid">
        A structured report payload is now attached to this upload, including fingerprints,
        metadata review, and printable report output.
      </p>
      {scanId && (
        <p className="mt-3 font-mono text-xs text-charcoal-mid">
          Report ID:{' '}
          <span className="text-charcoal">
            PRV-{scanId.replace('scan_', '')}
          </span>
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={scanId ? `/app/reports/${scanId}` : '/app/reports'}
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          Open Report
        </Link>
        <button
          type="button"
          onClick={onRunAnother}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-light px-5 py-3 text-sm text-charcoal transition hover:border-charcoal"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          Run Another
        </button>
      </div>
    </motion.div>
  )
}

function FailedState({ error, onRetry, onRemove }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-3xl border border-rose-100 bg-rose-50/40 p-8 text-center"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[2rem] border-2 border-rose-200 bg-rose-100 text-rose-600">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      </div>
      <h3 className="mt-5 font-serif text-2xl text-charcoal">Verification failed</h3>
      <p className="mt-2 text-sm text-charcoal-mid max-w-md mx-auto">
        {error || 'An unexpected error occurred during verification. Please try again.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Retry
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-light px-5 py-3 text-sm text-charcoal transition hover:border-rose-200 hover:text-rose-600"
        >
          Remove & Start Over
        </button>
      </div>
    </motion.div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-8">
      {/* Upload card skeleton */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <div className="h-4 w-32 animate-pulse rounded-2xl bg-stone-light/50" />
        <div className="mt-3 h-9 w-80 animate-pulse rounded-2xl bg-stone-light/50" />
        <div className="mt-4 h-5 w-[500px] animate-pulse rounded-2xl bg-stone-light/50" />
        <div className="mt-4 h-5 w-64 animate-pulse rounded-2xl bg-stone-light/50" />
        <div className="mt-7 h-48 animate-pulse rounded-[2rem] bg-stone-light/40" />
      </section>

      {/* Two-column skeleton */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="h-40 animate-pulse rounded-3xl bg-stone-light/40" />
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-3xl bg-stone-light/40" />
          <div className="h-24 animate-pulse rounded-3xl bg-stone-light/40" />
          <div className="h-40 animate-pulse rounded-3xl bg-stone-light/40" />
        </div>
      </div>
    </div>
  )
}

function RecentUploadRow({ scan }) {
  const statusStyles = {
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    processing: 'bg-sky-50 text-sky-700 border-sky-200',
    queued: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
  }

  const verdictStyles = {
    authentic: 'text-emerald-600',
    suspicious: 'text-rose-600',
    inconclusive: 'text-amber-600',
  }

  const relativeTime = (() => {
    if (!scan.created_at) return ''
    const diff = Date.now() - new Date(scan.created_at).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  })()

  return (
    <Link
      to={scan.status === 'completed' ? `/app/reports/${scan.id}` : `/app/uploads`}
      className="flex items-center gap-4 rounded-2xl border border-stone-light bg-parchment/60 px-4 py-3 transition hover:border-charcoal/20 hover:bg-parchment"
    >
      {/* File icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-stone-light bg-white-warm text-charcoal-light">
        {scan.mime_type?.startsWith('image/') ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        ) : scan.mime_type?.startsWith('video/') ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{scan.original_filename}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <span className={`inline-flex rounded-md border px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.1em] ${statusStyles[scan.status] || statusStyles.queued}`}>
            {scan.status}
          </span>
          {scan.verdict && (
            <span className={`text-[11px] font-medium capitalize ${verdictStyles[scan.verdict] || ''}`}>
              {scan.verdict}
            </span>
          )}
        </div>
      </div>

      <span className="shrink-0 text-[11px] text-charcoal-light">{relativeTime}</span>
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Page-level error banner
// ---------------------------------------------------------------------------

function PageErrorBanner({ message, onRetry }) {
  return (
    <AppStatePanel
      label="Error"
      title="Something went wrong"
      description={message || 'An unexpected error occurred loading this page. Please try again.'}
      variant="error"
      action={
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Try again
        </button>
      }
    />
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function AppUploadsPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | preparing | uploading | submitting | processing | complete | failed
  const [error, setError] = useState(null)
  const [activeScanId, setActiveScanId] = useState(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Extract recent scans for history snippet
  const recentScans = useMemo(() => {
    return [...mockScans]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3)
  }, [])

  // Queue stats from mock data
  const queueStats = useMemo(() => {
    const queued = mockScans.filter((s) => s.status === 'queued').length
    const completed = mockScans.filter((s) => s.status === 'completed').length
    return { queued, completed }
  }, [])

  // Simulate page loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  // Simulate occasional page error for state testing
  useEffect(() => {
    if (pageLoading) return
    // 5% chance of page error on mount for testing
    if (Math.random() < 0.05) {
      setPageError('Simulated page load error — please retry.')
    }
  }, [pageLoading])

  // Polling simulation for processing phase
  useEffect(() => {
    if (!activeScanId || phase !== 'processing') return

    let isCancelled = false
    const processingTime = 3000 + Math.random() * 4000
    const successChance = 0.85

    const timer = setTimeout(() => {
      if (isCancelled) return

      if (Math.random() < successChance) {
        setPhase('complete')
      } else {
        setPhase('failed')
        setError('AI pipeline returned an error: unable to process file. The file may be corrupted or in an unsupported encoding.')
      }
    }, processingTime)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [activeScanId, phase])

  // File validation
  const fileValidation = useMemo(() => {
    if (!selectedFile) return null

    if (!ALLOWED_MIME_TYPES.some((mime) => {
      if (mime.endsWith('/*')) return selectedFile.type.startsWith(mime.replace('/*', '/'))
      return selectedFile.type === mime
    })) {
      return `Unsupported file type. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      return `File too large. Maximum upload size is ${formatBytes(MAX_UPLOAD_BYTES)}.`
    }

    return null
  }, [selectedFile])

  const handleFileSelect = useCallback((file) => {
    setError(null)
    setActiveScanId(null)
    setPhase('idle')
    setSelectedFile(file)
  }, [])

  const handleRemove = useCallback(() => {
    setSelectedFile(null)
    setError(null)
    setActiveScanId(null)
    setPhase('idle')
  }, [])

  const handleStartUpload = useCallback(() => {
    if (!selectedFile) return
    if (fileValidation) {
      setError(fileValidation)
      return
    }

    setError(null)
    const scanId = `scan_${String(mockScans.length + 1).padStart(3, '0')}`
    setActiveScanId(scanId)

    // Simulate rapid phase transitions
    setPhase('preparing')
    const t1 = setTimeout(() => setPhase('uploading'), 800)
    const t2 = setTimeout(() => setPhase('submitting'), 1600)
    const t3 = setTimeout(() => setPhase('processing'), 2200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [selectedFile, fileValidation])

  const handleCancel = useCallback(() => {
    setShowCancelDialog(false)
    setPhase('idle')
    setActiveScanId(null)
    setSelectedFile(null)
    setError(null)
  }, [])

  const handleRetry = useCallback(() => {
    setError(null)
    setPhase('idle')
    if (selectedFile) {
      // Re-trigger upload
      setTimeout(() => handleStartUpload(), 100)
    }
  }, [selectedFile, handleStartUpload])

  const handlePageRetry = useCallback(() => {
    setPageError(null)
    setPageLoading(true)
    setTimeout(() => setPageLoading(false), 500)
  }, [])

  // Determine failed step for stepper
  const failedStep = useMemo(() => {
    if (phase !== 'failed') return null
    // Find which phase we were likely on when failure occurred
    return 3 // default to 'Analyze' step
  }, [phase])

  // --- Render ---

  if (pageError) {
    return (
      <div className="space-y-8">
        <PageErrorBanner message={pageError} onRetry={handlePageRetry} />
      </div>
    )
  }

  if (pageLoading) {
    return <Skeleton />
  }

  return (
    <div className="space-y-8">
      {/* Section 1: Upload Card */}
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        {/* Header */}
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          Upload workspace
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          Submit media for verification
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Uploads create a verification record, move through an async-ready status lifecycle,
          and return a structured, image-first report payload. Select any supported media file
          to begin the intake workflow.
        </p>

        {/* Supported formats note */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">
            Supported:
          </span>
          {SUPPORTED_FORMATS.map((fmt) => (
            <span
              key={fmt}
              className="rounded-lg border border-stone-light bg-parchment px-2.5 py-1 text-xs font-medium text-charcoal-mid"
            >
              {fmt}
            </span>
          ))}
          <span className="ml-2 text-xs text-charcoal-light/80">
            — max {formatBytes(MAX_UPLOAD_BYTES)}
          </span>
        </div>

        {/* Drop Zone (pre-upload) */}
        {!selectedFile && phase === 'idle' && (
          <div className="mt-7">
            <DropZone
              onFileSelect={handleFileSelect}
              disabled={false}
              error={error}
            />
          </div>
        )}

        {/* File Metadata Card (file selected, not started) */}
        {selectedFile && phase === 'idle' && (
          <div className="mt-7">
            <FileMetadataCard
              file={selectedFile}
              onRemove={handleRemove}
              onStart={handleStartUpload}
              disabled={Boolean(fileValidation)}
            />
            {fileValidation && (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {fileValidation}
              </p>
            )}
          </div>
        )}

        {/* Upload Stepper (visible during all non-idle, non-file-selected phases) */}
        {(phase !== 'idle' || (phase === 'idle' && selectedFile && fileValidation)) && (
          <UploadStepper currentPhase={phase} failedStep={failedStep} />
        )}

        {/* File info row (visible during processing phases) */}
        {phase !== 'idle' && selectedFile && (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-stone-light bg-parchment px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-light bg-white-warm text-charcoal-light">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-charcoal">{selectedFile.name}</p>
              <p className="text-xs text-charcoal-light">{formatBytes(selectedFile.size)}</p>
            </div>
            {getMediaCategory(selectedFile.type) && (
              <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.12em] ${MEDIA_TYPE_CATEGORIES[getMediaCategory(selectedFile.type)].tone}`}>
                {MEDIA_TYPE_CATEGORIES[getMediaCategory(selectedFile.type)].label}
              </span>
            )}
          </div>
        )}

        {/* Processing Panel */}
        {phase === 'processing' && (
          <ProcessingPanel
            scanId={activeScanId}
            onCancel={() => setShowCancelDialog(true)}
          />
        )}

        {/* Complete State */}
        {phase === 'complete' && (
          <CompleteState
            scanId={activeScanId}
            onRunAnother={handleRemove}
          />
        )}

        {/* Failed State */}
        {phase === 'failed' && (
          <FailedState
            error={error}
            onRetry={handleRetry}
            onRemove={handleRemove}
          />
        )}
      </section>

      {/* Section 2: Two-column grid */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* Left column: State panels for non-terminal phases */}
        <div>
          {phase === 'idle' && !selectedFile && (
            <AppStatePanel
              label="Ready"
              title="No file is in progress yet"
              description="Select a media file above to begin. The verification record and upload authorization are created server-side, then processing starts once the file is stored."
            />
          )}

          {phase === 'preparing' && (
            <AppStatePanel
              label="Preparing"
              title="Creating a verification record"
              description="Generating an upload authorization token and reserving a verification ID for this media file."
              variant="loading"
            />
          )}

          {phase === 'uploading' && (
            <AppStatePanel
              label="Uploading"
              title="Uploading to secure storage"
              description="Sending the file directly to the private Storage bucket using a signed upload token."
              variant="loading"
            />
          )}

          {phase === 'submitting' && (
            <AppStatePanel
              label="Submitting"
              title="Starting verification"
              description="The upload is queued and a processing job is being started in the background."
              variant="loading"
            />
          )}

          {phase === 'complete' && (
            <AppStatePanel
              label="Complete"
              title="Verification completed"
              description="A structured MVP report payload is now attached to this upload, including fingerprints, metadata review, and printable report output."
              variant="success"
              action={
                activeScanId ? (
                  <Link
                    to={`/app/reports/${activeScanId}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    Open verification report
                  </Link>
                ) : null
              }
            />
          )}

          {phase === 'failed' && (
            <AppStatePanel
              label="Failed"
              title="Verification did not complete"
              description={error || 'Something went wrong during the verification process.'}
              variant="error"
              action={
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="inline-flex items-center gap-2 rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    className="rounded-xl border border-stone-light px-4 py-3 text-sm text-charcoal transition hover:border-charcoal"
                  >
                    Start over
                  </button>
                </div>
              }
            />
          )}

          {/* When file selected but not started, show a preview panel */}
          {phase === 'idle' && selectedFile && !fileValidation && (
            <AppStatePanel
              label="Ready to submit"
              title="File validated and ready"
              description="Your file has passed type and size validation. Click 'Start Verification' in the card above to begin the intake workflow."
            />
          )}

          {phase === 'idle' && selectedFile && fileValidation && (
            <AppStatePanel
              label="Validation error"
              title="File cannot be submitted"
              description={fileValidation}
              variant="error"
              action={
                <button
                  type="button"
                  onClick={handleRemove}
                  className="rounded-xl border border-stone-light px-4 py-3 text-sm text-charcoal transition hover:border-charcoal"
                >
                  Select a different file
                </button>
              }
            />
          )}
        </div>

        {/* Right column: StatCards + Recent Uploads */}
        <div className="space-y-4">
          <StatCard
            label="In Queue"
            value={queueStats.queued}
            detail="Scans waiting to be processed"
            tone="info"
            trend={{ direction: 'up', value: '+2 today' }}
          />
          <StatCard
            label="Completed"
            value={queueStats.completed}
            detail="Total scans processed"
            tone="success"
            trend={{ direction: 'up', value: '+5 today' }}
          />

          {/* Recent uploads history snippet */}
          <section className="rounded-3xl border border-stone-light bg-white-warm p-5 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
              Recent uploads
            </p>
            <div className="mt-3 space-y-2">
              {recentScans.length === 0 && (
                <div className="rounded-2xl border border-stone-light bg-parchment px-4 py-8 text-center">
                  <p className="text-sm text-charcoal-light">No uploads yet</p>
                  <p className="mt-1 text-xs text-charcoal-light/70">
                    Your recent uploads will appear here after your first verification
                  </p>
                </div>
              )}
              {recentScans.map((scan) => (
                <RecentUploadRow key={scan.id} scan={scan} />
              ))}
            </div>
            <Link
              to="/app/reports"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-charcoal-mid transition hover:text-charcoal"
            >
              View all uploads
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </section>
        </div>
      </div>

      {/* Cancel confirmation dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        onConfirm={handleCancel}
        onCancel={() => setShowCancelDialog(false)}
        title="Cancel verification?"
        description="The current upload and any in-progress processing will be discarded. This action cannot be undone."
        confirmLabel="Yes, cancel"
        cancelLabel="Keep processing"
        variant="warning"
      />
    </div>
  )
}
