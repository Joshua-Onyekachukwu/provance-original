import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CommandRegistryContext } from './commandRegistryContext'
import { computeTransformOrigin } from './popoverOrigin'

// ---------------------------------------------------------------------------
// Fuzzy matching — dependency-free subsequence scorer over label + keywords
// ---------------------------------------------------------------------------

function normalize(value) {
  return String(value || '').toLowerCase().trim()
}

/**
 * Score `query` against `haystack` using prefix / word-boundary / contiguous /
 * subsequence heuristics. Returns 0 when no match, positive score otherwise.
 */
function fuzzyScore(query, haystack) {
  const q = normalize(query)
  const h = normalize(haystack)
  if (!q || !h) return 0
  if (h === q) return 1000

  // Prefix match — strongest signal.
  if (h.startsWith(q)) return 900 + (100 - h.length)

  // Word-boundary prefix (e.g. "ver" → "Verification Reports").
  if (h.split(/\s+/).some((word) => word.startsWith(q))) return 700

  // Contiguous substring — strong but not as good as a word start.
  const contiguous = h.indexOf(q)
  if (contiguous !== -1) return 600 - Math.min(contiguous, 50)

  // Subsequence — characters in order, with bonuses for word starts and
  // tight packing.
  let qi = 0
  let lastMatch = -2
  let score = 100
  for (let i = 0; i < h.length && qi < q.length; i += 1) {
    if (h[i] === q[qi]) {
      const prevChar = i === 0 ? ' ' : h[i - 1]
      if (/\s|[-/]/.test(prevChar)) score += 12
      else if (i === lastMatch + 1) score += 4
      else score += 1
      lastMatch = i
      qi += 1
    }
  }
  return qi === q.length ? score : 0
}

function scoreItem(item, query) {
  if (!query.trim()) return 1000
  const sources = [item.label, item.group, ...(item.keywords || [])]
  let best = 0
  for (const source of sources) {
    const score = fuzzyScore(query, source)
    if (score > best) best = score
  }
  return best
}

// ---------------------------------------------------------------------------
// CommandPalette — ⌘K fuzzy navigation across routes and actions.
//
// Kowalski-informed: transform/opacity-only animation, sub-300ms, and the
// panel scales from the trigger element's screen origin (origin-aware) so the
// entrance feels anchored to where the user asked for it. Reduced motion is
// honored globally via MotionConfig reducedMotion="user" in App.jsx.
//
// Props:
//   items    — [{ id, label, group?, keywords?, hint?, icon?, onSelect }]
//   trigger  — optional render prop: ({ open, triggerRef }) => node. Renders
//              the launch control inside the palette so it can track the
//              trigger's screen origin for the origin-aware popover and for
//              focus restoration on close.
//   placeholder, emptyTitle, emptyDescription
//   ariaLabel — accessible name for the dialog
// ---------------------------------------------------------------------------

export default function CommandPalette({
  items,
  trigger = null,
  placeholder = 'Search routes and actions…',
  emptyTitle = 'No matches',
  emptyDescription = 'Nothing matched your search. Try a different keyword or route name.',
  ariaLabel = 'Command palette',
}) {
  const registry = useContext(CommandRegistryContext)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const panelRef = useRef(null)
  const inputRef = useRef(null)
  const triggerRef = useRef(null)
  const originRef = useRef({ x: 50, y: 30 })
  const restoreFocusRef = useRef(null)
  const isOpenRef = useRef(false)
  isOpenRef.current = isOpen

  // ── Merge base items with page-registered commands (registry wins by id) ──
  const allItems = useMemo(() => {
    if (!registry || registry.commands.length === 0) return items
    const registryIds = new Set(registry.commands.map((command) => command.id))
    const base = items.filter((item) => !registryIds.has(item.id))
    return [...base, ...registry.commands]
  }, [items, registry])

  // ── Derive results ────────────────────────────────────────────────────────
  const results = useMemo(() => {
    const scored = allItems
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored.map((entry) => entry.item)
  }, [allItems, query])

  // Reset the cursor whenever the result set changes shape.
  useEffect(() => {
    setActiveIndex(0)
  }, [query, allItems])

  // ── Open / close with trigger-origin tracking ─────────────────────────────
  function openPalette() {
    restoreFocusRef.current = document.activeElement

    if (triggerRef.current) {
      originRef.current = computeTransformOrigin(triggerRef.current.getBoundingClientRect())
    } else {
      originRef.current = { x: 50, y: 30 }
    }

    setQuery('')
    setIsOpen(true)
  }

  function closePalette() {
    setIsOpen(false)
  }

  function runItem(item) {
    closePalette()
    item?.onSelect?.()
  }

  // ── Global shortcut: ⌘K / Ctrl+K ─────────────────────────────────────────
  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (isOpenRef.current) closePalette()
        else openPalette()
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  // ── Focus + scroll lock + Escape while open ───────────────────────────────
  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 60)

    function handleKeyDown(event) {
      if (event.key === 'Escape') closePalette()
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(focusTimer)
      if (restoreFocusRef.current?.focus) restoreFocusRef.current.focus()
    }
  }, [isOpen])

  // ── In-panel keyboard navigation ──────────────────────────────────────────
  function handlePaletteKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((current) => (results.length ? (current + 1) % results.length : 0))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((current) =>
        results.length ? (current - 1 + results.length) % results.length : 0,
      )
    } else if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      setActiveIndex(results.length - 1)
    } else if (event.key === 'Tab') {
      // Modal focus trap: keep Tab cycling inside the combobox input.
      // Options are tabIndex={-1} per the aria-activedescendant pattern,
      // so the input is the only focusable element in the dialog.
      event.preventDefault()
      inputRef.current?.focus()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const selected = results[activeIndex]
      if (selected) runItem(selected)
    }
  }

  const grouped = useMemo(() => {
    const groups = []
    for (const item of results) {
      const label = item.group || 'Results'
      const last = groups[groups.length - 1]
      if (last && last.label === label) last.items.push(item)
      else groups.push({ label, items: [item] })
    }
    return groups
  }, [results])

  const panelMotion = {
    initial: { opacity: 0, scale: 0.97, y: -8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: -6 },
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  }

  return (
    <>
      {trigger && trigger({ open: openPalette, triggerRef })}

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh] sm:px-6">
              <motion.button
                type="button"
                aria-label="Close command palette"
                tabIndex={-1}
                className="absolute inset-0 h-full w-full cursor-default bg-charcoal/45 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                onClick={closePalette}
              />

              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={ariaLabel}
                style={{ transformOrigin: `${originRef.current.x}% ${originRef.current.y}%` }}
                {...panelMotion}
                className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-stone-light bg-white-warm shadow-2xl shadow-charcoal/20 focus:outline-none"
                onKeyDown={handlePaletteKeyDown}
              >
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-stone-light px-5">
                  <svg
                    className="h-[18px] w-[18px] shrink-0 text-charcoal-light"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.8"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                  </svg>
                  <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded="true"
                    aria-controls="command-palette-list"
                    aria-activedescendant={
                      results[activeIndex] ? `command-option-${results[activeIndex].id}` : undefined
                    }
                    aria-autocomplete="list"
                    aria-label={ariaLabel}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={placeholder}
                    className="ui-input h-14 w-full border-0 bg-transparent px-0 text-base text-charcoal placeholder:text-charcoal-light/70 focus:ring-0"
                  />
                  <kbd
                    className="hidden shrink-0 rounded-lg border border-stone-light bg-parchment px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-charcoal-light sm:block"
                    aria-hidden="true"
                  >
                    Esc
                  </kbd>
                </div>

                {/* Results */}
                <div
                  id="command-palette-list"
                  role="listbox"
                  aria-label="Search results"
                  className="max-h-[min(420px,55vh)] overflow-y-auto p-2"
                >
                  {grouped.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-stone-light bg-parchment text-charcoal-light">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                        </svg>
                      </div>
                      <p className="mt-4 font-serif text-lg text-charcoal">{emptyTitle}</p>
                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-charcoal-mid">
                        {emptyDescription}
                      </p>
                    </div>
                  ) : (
                    grouped.map((group) => (
                      <div key={group.label} role="presentation">
                        <p className="px-3 pb-1.5 pt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-charcoal-light">
                          {group.label}
                        </p>
                        <ul role="presentation" className="space-y-0.5">
                          {group.items.map((item) => {
                            const flatIndex = results.indexOf(item)
                            const isActive = flatIndex === activeIndex
                            return (
                              <li key={item.id} role="presentation">
                                <button
                                  type="button"
                                  id={`command-option-${item.id}`}
                                  role="option"
                                  aria-selected={isActive}
                                  tabIndex={-1}
                                  onClick={() => runItem(item)}
                                  onMouseEnter={() => setActiveIndex(flatIndex)}
                                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-100 ${
                                    isActive
                                      ? 'bg-charcoal text-parchment'
                                      : 'text-charcoal-mid hover:bg-parchment hover:text-charcoal'
                                  }`}
                                >
                                  {item.icon && (
                                    <span
                                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                                        isActive
                                          ? 'border-white/10 bg-white/8 text-parchment'
                                          : 'border-stone-light bg-white-warm text-charcoal-mid group-hover:border-charcoal/15'
                                      }`}
                                    >
                                      {item.icon}
                                    </span>
                                  )}
                                  <span className="min-w-0 flex-1">
                                    <span className={`block truncate text-sm font-medium ${isActive ? 'text-parchment' : 'text-charcoal'}`}>
                                      {item.label}
                                    </span>
                                    {item.hint && (
                                      <span className={`block truncate text-xs ${isActive ? 'text-parchment/60' : 'text-charcoal-light'}`}>
                                        {item.hint}
                                      </span>
                                    )}
                                  </span>
                                  {isActive && (
                                    <svg
                                      className="h-4 w-4 shrink-0 text-parchment/70"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth="2"
                                      stroke="currentColor"
                                      aria-hidden="true"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                                    </svg>
                                  )}
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer hints */}
                <div className="flex items-center justify-between gap-3 border-t border-stone-light px-5 py-3">
                  <p className="hidden text-xs text-charcoal-light sm:block">
                    <kbd className="rounded border border-stone-light bg-parchment px-1.5 py-0.5 font-mono text-[10px] text-charcoal-mid">↑↓</kbd>{' '}
                    navigate ·{' '}
                    <kbd className="rounded border border-stone-light bg-parchment px-1.5 py-0.5 font-mono text-[10px] text-charcoal-mid">↵</kbd>{' '}
                    select
                  </p>
                  <p className="text-xs text-charcoal-light">
                    <kbd className="rounded border border-stone-light bg-parchment px-1.5 py-0.5 font-mono text-[10px] text-charcoal-mid">⌘K</kbd>{' '}
                    to open from anywhere
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}
