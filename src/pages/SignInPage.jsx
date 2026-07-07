import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

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
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-amber font-mono text-xs uppercase tracking-[0.2em]"
              >
                Sign In
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 }}
                className="font-serif text-4xl sm:text-5xl mt-4 text-balance text-charcoal"
              >
                Early-access sign in for approved users.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 }}
                className="mt-6 text-lg text-charcoal-mid leading-relaxed"
              >
                Sign in is available for approved users. If you have not been invited
                yet, join the waitlist and we will route access in cohorts.
              </motion.p>

              <div className="mt-8 rounded-2xl border border-stone-light bg-white-warm p-6">
                <h2 className="font-serif text-2xl text-charcoal">Access model</h2>
                <ul className="mt-4 space-y-3 text-sm text-charcoal-mid">
                  <li>Waitlist and review</li>
                  <li>Invite-based account activation</li>
                  <li>Email verification and secure session handling</li>
                  <li>Future account management and protected app access</li>
                </ul>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-stone-light bg-white-warm p-8 shadow-sm"
            >
              <label className="block">
                <span className="text-sm font-medium text-charcoal">Work email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
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
                  className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
                />
              </label>

              <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                <Link to="/waitlist" className="text-charcoal-mid hover:text-charcoal transition-colors">
                  Need access?
                </Link>
                <Link to="/contact" className="text-charcoal-mid hover:text-charcoal transition-colors">
                  Need account help?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 inline-flex w-full justify-center px-6 py-3 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              <p className="mt-4 text-xs leading-relaxed text-charcoal-light">
                Access is opened by invitation. Approved users are redirected into the
                authenticated workspace after sign-in.
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
