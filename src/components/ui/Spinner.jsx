const SIZES = {
  sm: 'h-3.5 w-3.5 border-[1.5px]',
  md: 'h-4 w-4 border-2',
  lg: 'h-5 w-5 border-2',
}

/**
 * Spinner — inline loading indicator (transform-only rotation).
 */
export default function Spinner({ size = 'md', className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${SIZES[size] || SIZES.md} ${className}`}
    />
  )
}
