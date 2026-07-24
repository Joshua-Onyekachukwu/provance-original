import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const VARIANT_STYLES = {
  danger: {
    confirmBg: 'bg-rose-600 hover:bg-rose-700',
    confirmText: 'text-white',
    border: 'border-rose-200',
  },
  warning: {
    confirmBg: 'bg-amber-500 hover:bg-amber-400',
    confirmText: 'text-charcoal',
    border: 'border-amber-200',
  },
  default: {
    confirmBg: 'bg-charcoal hover:bg-charcoal-soft',
    confirmText: 'text-parchment',
    border: 'border-stone-light',
  },
}

export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Confirm action',
  description = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onCancel?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus()
    }
  }, [open])

  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.default

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            aria-hidden="true"
          />

          {/* Dialog */}
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            className={`relative z-10 w-full max-w-md rounded-3xl border ${styles.border} bg-white-warm p-6 shadow-2xl sm:p-8`}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <h2
              id="confirm-dialog-title"
              className="font-serif text-2xl text-charcoal"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-description"
              className="mt-3 text-sm leading-relaxed text-charcoal-mid"
            >
              {description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-xl border border-stone-light px-4 py-3 text-sm text-charcoal transition hover:border-charcoal disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`rounded-xl px-4 py-3 text-sm font-medium transition disabled:opacity-50 ${styles.confirmBg} ${styles.confirmText}`}
              >
                {loading ? 'Processing…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
