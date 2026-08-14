import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { initGlobalErrorListeners } from './lib/telemetry.js'
import { applyVerdictPalette } from './components/app/scanPresentation.js'

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
    <BrowserRouter>
      <AuthProvider>
        <App />
        {/* Vercel Web Analytics — no-op in dev, auto-injects in production
            builds; data shows up in the Vercel project dashboard. */}
        <Analytics />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
