import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const TEST_ACCOUNTS = [
  { id: 'admin', email: 'founder.admin@provance.local', label: 'Admin account' },
  { id: 'member', email: 'founder.test@provance.local', label: 'Member account' },
]
const TEST_ACCOUNT_PASSWORD = 'test-password-123'

/**
 * Dev-only test-account quick fill (inert in production builds). Lets
 * reviewers jump into either permission level with one click instead of
 * typing credentials — matches the ?state= / ?demo= dev affordances used
 * elsewhere in the app.
 */
function DevTestAccounts({ onFill }) {
  if (!import.meta.env.DEV) return null
  return (
    <div className="mt-6 rounded-2xl border border-dashed border-amber/40 bg-amber/[0.04] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
        Dev test accounts
      </p>
      <p className="mt-1 text-xs text-charcoal-light">
        One click to fill a credential set. Visible only in development builds.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {TEST_ACCOUNTS.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => onFill(account.email)}
            className="inline-flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber/10 px-3 py-1.5 text-xs font-medium text-amber transition hover:border-amber hover:bg-amber/20"
          >
            {account.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const redirectTo =
    new URLSearchParams(location.search).get('redirect') || '/app'

  const fillTestAccount = (email) => {
    setEmail(email)
    setPassword(TEST_ACCOUNT_PASSWORD)
    setErrorMessage('')
  }

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectTo])

  const handleSubmit = async (event) => {
    event.preventDefault()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await signIn({ email, password })
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not complete sign-in right now. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] items-start max-w-5xl mx-auto">
            <div className="max-w-xl">
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="font-serif text-4xl sm:text-5xl text-balance text-charcoal"
              >
                Sign in to your Provance workspace.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="mt-6 text-lg text-charcoal-mid leading-relaxed"
              >
              Access is currently enabled through invite-based onboarding. If your
              organization has not been approved yet, join the waitlist and we will open
              access in controlled cohorts.
              </motion.p>

              <div className="surface-card mt-8 p-6">
                <h2 className="font-serif text-2xl text-charcoal">Access model</h2>
                <ul className="feature-list mt-4 text-sm text-charcoal-mid">
                  <li>Waitlist review and approvals</li>
                  <li>Invite-based account activation</li>
                  <li>Email verification and secure session handling</li>
                  <li>Protected access to the verification workspace</li>
                </ul>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="surface-card p-8"
            >
              <label className="block">
                <span className="text-sm font-medium text-charcoal">Work email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isSubmitting}
                  className="field-input mt-2 text-sm"
                />
              </label>

              <label className="block mt-5">
                <span className="text-sm font-medium text-charcoal">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isSubmitting}
                  className="field-input mt-2 text-sm"
                />
              </label>

              <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                <Link to="/waitlist" className="text-charcoal-mid hover:text-charcoal transition-colors">
                  Need access?
                </Link>
                <Link
                  to="/reset-password"
                  className="text-charcoal-mid hover:text-charcoal transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="mt-3 text-sm">
                <Link to="/accept-invite" className="text-charcoal-mid hover:text-charcoal transition-colors">
                  Already have an invite link?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary mt-6 w-full"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              <DevTestAccounts onFill={fillTestAccount} />

              <p className="mt-4 text-xs leading-relaxed text-charcoal-light">
                Access is opened by invitation. Approved users are redirected into the
                verification workspace after sign-in.
              </p>

              {errorMessage && (
                <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/80 p-4">
                  <p className="text-sm text-rose-700">{errorMessage}</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}
