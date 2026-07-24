import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AppStatePanel from '../app/AppStatePanel.jsx'

export default function AdminDrawer({
  open,
  onClose,
  title = '',
  loading = false,
  error = '',
  children,
  actions = null,
}) {
  const drawerRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Trap focus
  useEffect(() => {
    if (open && drawerRef.current) {
      drawerRef.current.focus()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-charcoal/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer */}
          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Detail drawer'}
            tabIndex={-1}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-stone-light bg-white-warm shadow-2xl focus:outline-none sm:max-w-xl lg:max-w-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-light px-6 py-5">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
                  Detail view
                </p>
                <h2 className="mt-1 truncate font-serif text-2xl text-charcoal">
                  {title || 'Details'}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {actions && <div className="flex gap-2">{actions}</div>}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-stone-light p-2 text-charcoal-mid transition hover:border-charcoal hover:text-charcoal"
                  aria-label="Close drawer"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading && (
                <AppStatePanel
                  label="Loading"
                  title="Loading details"
                  description="Fetching the latest data for this record."
                  variant="loading"
                />
              )}

              {error && !loading && (
                <AppStatePanel
                  label="Error"
                  title="Could not load details"
                  description={error}
                  variant="error"
                />
              )}

              {!loading && !error && children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
