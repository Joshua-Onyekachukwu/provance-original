import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

/**
 * Drawer — accessible slide-over panel (portal, focus trap, Esc to close,
 * body scroll lock, transform-only animation).
 *
 * Props:
 *   open, onClose, title, description, children, footer
 *   size     — 'sm' | 'md' | 'lg' | 'xl'
 *   position — 'right' | 'left'
 *   id       — id used for aria-labelledby
 */
export default function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer = null,
  size = 'md',
  position = 'right',
  id = 'drawer-title',
}) {
  const panelRef = useRef(null)
  const restoreFocusRef = useRef(null)
  // Stabilize `onClose` so the effect only re-runs when `open` changes
  // (inline callbacks otherwise re-trigger focus + scroll-lock churn).
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    restoreFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleKeyDown)

    const focusTimer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (first) first.focus()
    }, 60)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(focusTimer)
      if (restoreFocusRef.current?.focus) restoreFocusRef.current.focus()
    }
  }, [open])

  const trapFocus = (event) => {
    if (event.key !== 'Tab') return
    const focusables = panelRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]">
          <motion.button
            type="button"
            aria-label="Close drawer"
            tabIndex={-1}
            className="absolute inset-0 h-full w-full cursor-default bg-charcoal/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            onKeyDown={trapFocus}
            initial={{ x: position === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: position === 'left' ? '-100%' : '100%' }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            className={`absolute inset-y-0 z-10 ${position === 'left' ? 'left-0' : 'right-0'} flex w-full ${SIZES[size] || SIZES.md} flex-col bg-white-warm shadow-2xl`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-stone-light px-6 py-5">
              <div className="min-w-0">
                <h2 id={id} className="font-serif text-2xl text-charcoal">
                  {title}
                </h2>
                {description && (
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-charcoal-mid">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="ui-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-light bg-parchment text-charcoal-mid transition hover:bg-white-warm hover:text-charcoal"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-stone-light px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
