import AppStatePanel from '../../components/app/AppStatePanel.jsx'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getScan, initiateScan, submitScan } from '../../lib/api.js'
import { supabase } from '../../lib/supabase.js'

const CONSTRAINTS = [
  'Image uploads are supported today and power the current verification workflow.',
  'Video and audio support will follow the same report structure once those pipelines are enabled.',
  'Validation will enforce file type, size, and integrity checks before analysis starts.',
]

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

export default function AppUploadsPage() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(null)
  const [activeScanId, setActiveScanId] = useState(null)
  const [activeScan, setActiveScan] = useState(null)

  const isSupabaseReady = Boolean(supabase)

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

  useEffect(() => {
    if (!activeScanId || phase !== 'processing') return

    let isCancelled = false
    const interval = window.setInterval(async () => {
      try {
        const response = await getScan(activeScanId)
        if (isCancelled) return
        setActiveScan(response.scan)

        if (response.scan.status === 'complete') {
          setPhase('complete')
          window.clearInterval(interval)
        }

        if (response.scan.status === 'failed') {
          setPhase('error')
          setError(response.scan.failure_reason || 'Processing failed.')
          window.clearInterval(interval)
        }
      } catch (pollError) {
        if (isCancelled) return
        setPhase('error')
        setError(pollError.message || 'Failed to poll scan status.')
        window.clearInterval(interval)
      }
    }, 1000)

    return () => {
      isCancelled = true
      window.clearInterval(interval)
    }
  }, [activeScanId, phase])

  const handleFileChange = (event) => {
    setError(null)
    setActiveScan(null)
    setActiveScanId(null)
    setPhase('idle')
    setSelectedFile(event.target.files?.[0] || null)
  }

  const handleStartUpload = async () => {
    if (!selectedFile) return
    if (fileValidation) {
      setError(fileValidation)
      return
    }
    if (!isSupabaseReady) {
      setError('Supabase Storage is not configured for this environment.')
      return
    }

    setError(null)
    setPhase('preparing')

    try {
      const initiation = await initiateScan({
        originalFilename: selectedFile.name,
        mimeType: selectedFile.type,
        fileSizeBytes: selectedFile.size,
        mediaType: 'image',
      })

      setActiveScanId(initiation.scanId)
      setPhase('uploading')

      const uploadResult = await supabase.storage
        .from(initiation.bucket)
        .uploadToSignedUrl(initiation.path, initiation.token, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        })

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message)
      }

      setPhase('submitting')
      await submitScan(initiation.scanId)
      setPhase('processing')
    } catch (uploadError) {
      setPhase('error')
      setError(uploadError.message || 'Upload failed.')
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Upload workspace
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          Submit a file for verification
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          Uploads create a real verification record, move through an async-ready status
          lifecycle, and return a structured image-first report payload while deeper
          signal engines continue to mature.
        </p>

        <div className="mt-7 grid gap-4 rounded-3xl border border-stone-light bg-parchment p-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Select an image
              <input
                type="file"
                accept={ALLOWED_MIME_TYPES.join(',')}
                onChange={handleFileChange}
                className="mt-3 block w-full cursor-pointer rounded-2xl border border-stone-light bg-white-warm px-4 py-3 text-sm text-charcoal"
              />
            </label>
            {selectedFile && (
              <p className="mt-3 text-sm text-charcoal-mid">
                Selected: <span className="font-medium text-charcoal">{selectedFile.name}</span>
              </p>
            )}
            {fileValidation && (
              <p className="mt-3 text-sm text-amber">
                {fileValidation}
              </p>
            )}
            {!isSupabaseReady && (
              <p className="mt-3 text-sm text-amber">
                Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable uploads.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleStartUpload}
            disabled={!selectedFile || Boolean(fileValidation) || !isSupabaseReady || phase !== 'idle'}
            className={`inline-flex items-center justify-center rounded-2xl px-6 py-3 text-sm font-medium transition ${
              !selectedFile || Boolean(fileValidation) || !isSupabaseReady || phase !== 'idle'
                ? 'cursor-not-allowed bg-stone-light text-charcoal-light'
                : 'bg-charcoal text-parchment hover:bg-charcoal-soft'
            }`}
          >
            {phase === 'idle' ? 'Start scan' : 'Scan in progress'}
          </button>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {phase === 'idle' && (
          <AppStatePanel
            label="Ready"
            title="No file is in progress yet"
            description="Select an image to begin. The verification record and upload token are created server-side, then processing starts once the file is stored."
          />
        )}

        {phase === 'preparing' && (
          <AppStatePanel
            label="Preparing"
            title="Creating a verification record"
            description="Generating an upload authorization token and reserving a verification ID."
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
            description="The upload is queued and a processing job is being started."
            variant="loading"
          />
        )}

        {phase === 'processing' && (
          <AppStatePanel
            label="Processing"
            title="Verification is running"
            description="Provance is extracting file fingerprints, metadata, provenance markers, and visual statistics before generating the initial report payload."
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
                  className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                >
                  Open verification report
                </Link>
              ) : null
            }
          />
        )}

        {phase === 'error' && (
          <AppStatePanel
            label="Error"
            title="Verification failed"
            description={error || 'Something went wrong.'}
            variant="error"
          />
        )}

        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <h3 className="font-serif text-2xl text-charcoal">Phase-ready constraints</h3>
          <ul className="mt-5 space-y-4 text-sm leading-relaxed text-charcoal-mid">
            {CONSTRAINTS.map((constraint) => (
              <li key={constraint} className="rounded-2xl border border-stone-light bg-parchment px-4 py-3">
                {constraint}
              </li>
            ))}
          </ul>
          {activeScanId && (
            <div className="mt-6 rounded-2xl border border-stone-light bg-parchment px-4 py-3 text-xs text-charcoal-mid">
              Active verification ID: <span className="font-mono text-charcoal">{activeScanId}</span>
            </div>
          )}
          {activeScan?.status && (
            <div className="mt-3 rounded-2xl border border-stone-light bg-parchment px-4 py-3 text-xs text-charcoal-mid">
              Latest status: <span className="font-mono text-charcoal">{activeScan.status}</span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
