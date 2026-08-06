import { useId, useRef, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * Tabs — accessible tablist (roving tabindex, arrow-key navigation,
 * animated active indicator using transform-only layout animation).
 *
 * Props:
 *   items     — [{ value, label, badge?, disabled? }]
 *   value     — controlled value; omit for uncontrolled
 *   onChange  — (value) => void
 *   variant   — 'underline' | 'pill'
 *   ariaLabel — accessible name for the tablist
 *
 * Panels are rendered by the parent keyed on the active value.
 */
export default function Tabs({
  items,
  value,
  onChange,
  variant = 'underline',
  ariaLabel = 'Tabs',
  id = null,
  className = '',
}) {
  const isControlled = value !== undefined
  const [internal, setInternal] = useState(items[0]?.value ?? null)
  const active = isControlled ? value : internal
  const fallbackUid = useId()
  const uid = id || fallbackUid
  const refs = useRef({})

  const select = (next) => {
    if (!isControlled) setInternal(next)
    if (onChange) onChange(next)
  }

  const onKeyDown = (event, index) => {
    const last = items.length - 1
    let next = null
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
    if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = last
    if (next !== null) {
      event.preventDefault()
      const el = refs.current[items[next].value]
      if (el) el.focus()
      select(items[next].value)
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex flex-wrap ${variant === 'pill' ? 'gap-1 rounded-2xl border border-stone-light bg-parchment p-1' : 'gap-1 border-b border-stone-light'} ${className}`}
    >
      {items.map((item, index) => {
        const isActive = item.value === active
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[item.value] = el
            }}
            type="button"
            role="tab"
            id={`${uid}-tab-${item.value}`}
            aria-selected={isActive}
            aria-controls={`${uid}-panel-${item.value}`}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            onClick={() => select(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`ui-focus-ring relative inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 ${
              variant === 'pill' ? 'rounded-xl px-4 py-2' : 'px-4 py-2.5'
            } ${isActive ? 'text-charcoal' : 'text-charcoal-mid hover:text-charcoal'}`}
          >
            {isActive && (
              <motion.span
                layoutId={`${uid}-indicator`}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className={`absolute ${
                  variant === 'pill' ? 'inset-0 rounded-xl bg-white-warm shadow-sm' : 'inset-x-2 bottom-0 h-0.5 rounded-full bg-charcoal'
                }`}
              />
            )}
            <span className="relative z-10">{item.label}</span>
            {item.badge != null && (
              <span
                className={`relative z-10 rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                  isActive ? 'bg-charcoal/10 text-charcoal' : 'bg-parchment text-charcoal-mid'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
