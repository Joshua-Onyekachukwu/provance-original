import { Component } from 'react'
import { captureError } from '../../lib/telemetry.js'

/**
 * ErrorBoundary — global error boundary with a recoverable fallback.
 *
 * Catches render/lifecycle errors in its subtree so a crashing page renders
 * a designed fallback instead of a blank screen. Wired at three levels:
 *   1. top level (last resort, full screen) around <Routes>
 *   2. inside the public layout's <main> around the routed page
 *   3. inside the workspace + admin shells' <main> (location-keyed, so the
 *      shell survives a page crash and navigation resets the boundary)
 *
 * The fallback is deliberately raw token-styled markup — it must never
 * depend on the ui primitives it might be catching a crash from.
 *
 * Every caught crash is forwarded to the pre-Sentry telemetry stub
 * (dev console + localStorage buffer) — see src/lib/telemetry.js.
 *
 * Props:
 *   children            — subtree to guard
 *   onError(error, info) — optional callback (the seam where Sentry slots
 *                          in once the approved monitoring feature lands)
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Separate hasError flag: a thrown null/undefined/0/false must still
    // trigger the fallback (state.error alone would be falsy and fall
    // through to children, looping forever).
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Store the component stack for the dev-only trace; logged here so
    // production loses nothing. The pre-Sentry telemetry stub persists the
    // crash (dev console + localStorage buffer) so reports survive before
    // Sentry lands — Sentry swaps in via the onError prop without touching
    // the boundary contract.
    this.setState({ errorInfo })
    console.error('[ErrorBoundary]', error, errorInfo?.componentStack)
    captureError(error, { componentStack: errorInfo?.componentStack })
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    // Re-mount the subtree. If the crash is deterministic the boundary
    // catches again and the fallback returns — Reload page is the escape.
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { error, errorInfo } = this.state
    const devOnly = import.meta.env.DEV
    const message = error?.message || 'An unknown error occurred'

    return (
      <div role="alert" className="flex min-h-[60vh] items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </span>
          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
            Unexpected error
          </p>
          <h1 className="mt-3 font-serif text-3xl text-charcoal">Something went wrong</h1>
          <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
            The page hit an unexpected error. Try again, or reload to start fresh. Your data is
            safe.
          </p>

          <div className="mt-5 rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3">
            <p className="break-words font-mono text-xs text-rose-700">{message}</p>
          </div>

          {devOnly && errorInfo?.componentStack && (
            <details className="mt-4">
              <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-light transition hover:text-charcoal">
                Stack trace (dev only)
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-2xl bg-charcoal p-4 font-mono text-[11px] leading-relaxed text-parchment">
                {error?.stack || ''}
                {'\n\n'}
                {errorInfo.componentStack}
              </pre>
            </details>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl bg-charcoal px-5 py-2.5 text-sm font-medium text-white-warm transition hover:bg-charcoal/90 focus-visible:ring-2 focus-visible:ring-charcoal"
            >
              Reload page
            </button>
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded-xl border border-stone-light bg-parchment px-5 py-2.5 text-sm font-medium text-charcoal transition hover:bg-white-warm focus-visible:ring-2 focus-visible:ring-charcoal"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }
}
