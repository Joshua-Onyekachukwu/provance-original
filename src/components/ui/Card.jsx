import Skeleton from './Skeleton'
import EmptyState from './EmptyState'
import Button from './Button'

const PADDINGS = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
}

/**
 * Card — unified section card with full state handling.
 *
 * Props:
 *   id — forwarded to the section element (scroll targets, anchors)
 *   eyebrow, title, description, actions — optional header block
 *   padding  — 'none' | 'sm' | 'md' | 'lg'
 *   state    — 'default' | 'loading' | 'empty' | 'error'
 *   loadingRows, emptyTitle, emptyDescription, emptyAction,
 *   errorTitle, errorDescription, onRetry — state content
 */
export default function Card({
  id,
  eyebrow,
  title,
  description,
  actions = null,
  padding = 'md',
  state = 'default',
  loadingRows = 3,
  emptyTitle,
  emptyDescription,
  emptyAction = null,
  errorTitle,
  errorDescription,
  onRetry = null,
  className = '',
  children,
}) {
  const hasHeader = Boolean(eyebrow || title || actions)

  return (
    <section id={id} className={`ui-card ${PADDINGS[padding] || PADDINGS.md} ${className}`}>
      {hasHeader && (
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <p className="ui-eyebrow">{eyebrow}</p>}
            {title && <h3 className="mt-1.5 font-serif text-xl text-charcoal">{title}</h3>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {description && (
        <p className="mb-5 max-w-2xl text-sm leading-relaxed text-charcoal-mid">{description}</p>
      )}

      {state === 'loading' && (
        <div role="status" aria-label="Loading" className="space-y-3">
          {Array.from({ length: loadingRows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {state === 'empty' && (
        <EmptyState
          variant="empty"
          title={emptyTitle || 'Nothing here yet'}
          description={emptyDescription}
          action={emptyAction}
          compact
        />
      )}

      {state === 'error' && (
        <EmptyState
          variant="error"
          title={errorTitle || 'Could not load'}
          description={errorDescription}
          action={
            onRetry ? (
              <Button variant="secondary" size="sm" onClick={onRetry}>
                Retry
              </Button>
            ) : null
          }
          compact
        />
      )}

      {state === 'default' && children}
    </section>
  )
}
