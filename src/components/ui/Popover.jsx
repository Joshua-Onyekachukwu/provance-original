import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { computeTransformOrigin } from './popoverOrigin'

/**
 * Popover — origin-aware anchored panel primitive (the "Kowalski" treatment).
 *
 * Encapsulates the popover behaviour previously hand-rolled in the app shell
 * (notification bell + avatar menu) and the CommandPalette:
 *
 *   - trigger render-prop with open/close/toggle + triggerRef
 *   - transform-origin computed from the trigger element's screen position, so
 *     the panel scales from where the user asked for it (clamped to safe % so
 *     it never scales off-screen)
 *   - sub-300ms opacity/scale/y entrance — 160ms with the standard ease
 *     [0.22, 1, 0.36, 1]
 *   - reduced-motion aware via framer-motion's useReducedMotion: when the user
 *     prefers reduced motion the panel renders without animation
 *   - dismiss on outside pointer-down and Escape
 *   - focus moves into the panel on open and returns to the trigger on close
 *
 * Positioning is fully controlled by the caller through mobileClassName /
 * desktopClassName (desktop classes carry `sm:` prefixes, mirroring the
 * shell's responsive bottom-sheet → anchored-panel pattern). Defaults match
 * the header dropdowns: a mobile sheet under the top bar, an end-aligned
 * panel below the trigger on sm+.
 *
 * Props:
 *   trigger   — render prop ({ open, close, toggle, isOpen, triggerRef }) => node
 *   children  — panel content; render prop ({ close }) => node or static node
 *   role      — accessibility role for the panel (dialog | menu | tooltip | …)
 *   ariaLabel — accessible name for the panel
 *   mobileClassName  — mobile positioning (default: fixed inset-x-4 top-[6rem])
 *   desktopClassName — sm+ anchored positioning + width
 *   className — extra classes appended to the panel
 *   onOpenChange — optional (nextOpen) => void callback
 */
export default function Popover({
  trigger,
  children,
  role = 'dialog',
  ariaLabel,
  mobileClassName = 'fixed inset-x-4 top-[6rem]',
  desktopClassName = 'sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2',
  className = '',
  onOpenChange = null,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const wrapperRef = useRef(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const originRef = useRef({ x: 50, y: 30 })
  const restoreFocusRef = useRef(null)
  const hadPanelFocusRef = useRef(false)
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange
  const isOpenRef = useRef(false)
  isOpenRef.current = isOpen

  function setOpen(next) {
    setIsOpen(next)
    onOpenChangeRef.current?.(next)
  }

  function open() {
    restoreFocusRef.current = document.activeElement

    if (triggerRef.current) {
      originRef.current = computeTransformOrigin(triggerRef.current.getBoundingClientRect())
    }

    setOpen(true)
  }

  function close() {
    // Snapshot whether focus is in the panel now — under reduced motion the
    // panel unmounts synchronously, so the post-close effect can't inspect it.
    hadPanelFocusRef.current = Boolean(panelRef.current?.contains(document.activeElement))
    setOpen(false)
  }

  function toggle() {
    if (isOpenRef.current) close()
    else open()
  }

  // Dismiss on outside pointer-down and Escape.
  useEffect(() => {
    if (!isOpen) return undefined

    function handlePointerDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        close()
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Move focus into the panel when opened; restore it to the trigger on close.
  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => panelRef.current?.focus(), 50)
      return () => window.clearTimeout(id)
    }

    if (hadPanelFocusRef.current) {
      triggerRef.current?.focus()
    }
    return undefined
  }, [isOpen])

  const panelMotion = {
    initial: { opacity: 0, y: -6, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -6, scale: 0.98 },
    transition: { duration: 0.16, ease: [0.22, 1, 0.36, 1] },
  }

  const panelClassName = [
    'z-50 overflow-hidden rounded-2xl border border-stone-light bg-white-warm shadow-2xl shadow-charcoal/10 focus:outline-none',
    mobileClassName,
    desktopClassName,
    className,
  ].join(' ')

  const originStyle = { transformOrigin: `${originRef.current.x}% ${originRef.current.y}%` }
  const panelContent = isOpen ? (typeof children === 'function' ? children({ close }) : children) : null

  return (
    <div className="relative" ref={wrapperRef}>
      {trigger({ open, close, toggle, isOpen, triggerRef })}

      {prefersReducedMotion ? (
        // Reduced motion: render the panel as a plain element so open/close is
        // instant and never depends on animation frames (framer's exit would
        // wait on requestAnimationFrame, which can stall).
        isOpen && (
          <div
            ref={panelRef}
            role={role}
            aria-label={ariaLabel}
            tabIndex={-1}
            style={originStyle}
            className={panelClassName}
          >
            {panelContent}
          </div>
        )
      ) : (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              role={role}
              aria-label={ariaLabel}
              tabIndex={-1}
              style={originStyle}
              {...panelMotion}
              className={panelClassName}
            >
              {panelContent}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
