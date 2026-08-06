/**
 * Skeleton — reusable loading placeholder primitive.
 * Renders a pulsing block; used across all stateful primitives.
 */
export default function Skeleton({ className = '', ...rest }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-stone-light/70 ${className}`}
      {...rest}
    />
  )
}
