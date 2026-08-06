import { Link } from 'react-router-dom'
import Spinner from './Spinner'

const VARIANTS = {
  primary: 'bg-charcoal text-parchment hover:bg-charcoal-soft shadow-sm',
  secondary: 'border border-stone-light bg-white-warm text-charcoal hover:border-charcoal/25 hover:bg-parchment',
  ghost: 'text-charcoal-mid hover:bg-parchment hover:text-charcoal',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
  warning: 'bg-amber-500 text-charcoal hover:bg-amber-400 shadow-sm',
}

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2 rounded-xl',
}

/**
 * Button — core action primitive (Phase 2 foundation).
 *
 * Kowalski-informed: fast 150ms transitions, scale(0.97) press feedback,
 * transform/opacity only, explicit focus-visible ring, spinner + disabled
 * loading state.
 *
 * Props:
 *   variant    — 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
 *   size       — 'sm' | 'md' | 'lg'
 *   loading    — shows a spinner and disables the button
 *   disabled   — disables the button
 *   iconLeft   — leading icon node
 *   iconRight  — trailing icon node
 *   fullWidth  — stretches to container width
 *   to         — when set, renders as a react-router <Link> to that route,
 *                giving real href / middle-click / cmd-click semantics while
 *                keeping the exact same visual class string. All other props
 *                (variant, size, loading, icons…) behave identically.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  fullWidth = false,
  to = null,
  className = '',
  children,
  ...rest
}) {
  const isDisabled = disabled || loading

  const classString = `ui-focus-ring inline-flex items-center justify-center font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${fullWidth ? 'w-full' : ''} ${className}`

  const content = (
    <>
      {loading ? <Spinner size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'} /> : iconLeft}
      {children}
      {!loading && iconRight}
    </>
  )

  if (to) {
    const { onClick, type: _type, ...linkRest } = rest
    return (
      <Link
        to={to}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={(event) => {
          if (isDisabled) {
            event.preventDefault()
            return
          }
          if (onClick) onClick(event)
        }}
        className={`${classString}${isDisabled ? ' pointer-events-none opacity-50' : ''}`}
        {...linkRest}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      disabled={isDisabled}
      className={classString}
      {...rest}
    >
      {content}
    </button>
  )
}
