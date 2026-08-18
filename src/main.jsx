import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { initGlobalErrorListeners } from './lib/telemetry.js'
import { applyVerdictPalette } from './components/app/scanPresentation.js'

// ── Sentry error tracking ────────────────────────────────────────────────────
// Only initializes when VITE_SENTRY_DSN is set (production builds on Vercel).
// In dev, errors stay in the console — no external service needed.
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'development',
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    replaysSessionSampleRate: 0, // no automatic replays
    replaysOnErrorSampleRate: 1.0, // 100% of error sessions get a replay
    integrations: [
      Sentry.replayIntegration(),
    ],
    // Don't report errors from the dev server or known noise
    ignoreErrors: [
      'ResizeObserver loop',
      'Non-Error promise rejection',
      'Loading chunk',
    ],
  })
}

// Capture non-React runtime errors (async, timers, event handlers, resource
// loads, unhandled rejections) into the crash buffer — the ErrorBoundary only
// sees render-tree crashes. Idempotent; safe to call before render.
initGlobalErrorListeners()

// Export the verdict palette (scanPresentation.js VERDICT_PALETTE) as CSS
// custom properties (--color-verdict-*, --color-tone-*) so charts, Badge
// dots, and StatCard accents share one source of truth for verdict colors.
// Runs before the first paint; no-op in non-browser environments.
applyVerdictPalette()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<div>Something went wrong.</div>}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          {/* Vercel Web Analytics — no-op in dev, auto-injects in production
              builds; data shows up in the Vercel project dashboard. */}
          <Analytics />
        </AuthProvider>
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
