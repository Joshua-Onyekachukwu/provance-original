import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ToastContext } from './useToast'

const TONES = {
  success: { ring: 'border-emerald-200', iconBg: 'bg-emerald-100 text-emerald-700' },
  info: { ring: 'border-sky-200', iconBg: 'bg-sky-100 text-sky-700' },
  warning: { ring: 'border-amber-200', iconBg: 'bg-amber-100 text-amber-700' },
  error: { ring: 'border-rose-200', iconBg: 'bg-rose-100 text-rose-700' },
}

const ICONS = {
  success: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  ),
  warning: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
  error: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm7.5 0a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
    </svg>
  ),
}

const POSITIONS = {
  'bottom-right': 'bottom-4 right-4',
  'top-right': 'top-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-left': 'top-4 left-4',
}

/**
 * ToastProvider — global toast system.
 *
 * Usage:
 *   const { success, error, info, warning, dismiss } = useToast()
 *   success('Scan complete', { description: 'Report PV-… is ready' })
 */
export function ToastProvider({ children, duration = 4500, position = 'bottom-right' }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type, title, description, options = {}) => {
      idRef.current += 1
      const id = idRef.current
      setToasts((current) => [...current, { id, type, title, description }])
      const ms = options.duration ?? duration
      if (ms) window.setTimeout(() => dismiss(id), ms)
    },
    [duration, dismiss],
  )

  const api = useMemo(
    () => ({
      toast: (title, options = {}) => push(options.type || 'info', title, options.description, options),
      success: (title, options = {}) => push('success', title, options.description, options),
      info: (title, options = {}) => push('info', title, options.description, options),
      warning: (title, options = {}) => push('warning', title, options.description, options),
      error: (title, options = {}) => push('error', title, options.description, options),
      dismiss,
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          aria-atomic="false"
          className={`pointer-events-none fixed z-[90] flex w-full max-w-sm flex-col gap-2 px-4 print:hidden ${POSITIONS[position] || POSITIONS['bottom-right']}`}
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                role={t.type === 'error' ? 'alert' : 'status'}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white-warm p-4 shadow-xl ${TONES[t.type]?.ring || TONES.info.ring}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONES[t.type]?.iconBg || TONES.info.iconBg}`}>
                  {ICONS[t.type] || ICONS.info}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal">{t.title}</p>
                  {t.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-charcoal-mid">{t.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="ui-focus-ring shrink-0 rounded-lg p-1 text-charcoal-light transition hover:bg-parchment hover:text-charcoal"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}
