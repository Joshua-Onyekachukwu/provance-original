import { useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../lib/api.js'

export default function RequestPasswordResetPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      await requestPasswordReset({ email })
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Password reset request failed.')
    }
  }

  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment">
        <div className="content-container max-w-3xl">
          <div className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Password reset
            </p>
            <h1 className="mt-3 font-serif text-4xl text-charcoal">
              Request a password reset
            </h1>
            <p className="mt-4 text-base leading-relaxed text-charcoal-mid">
              Enter the email tied to your Provance account and we will send a secure
              recovery link.
            </p>

            {status === 'success' ? (
              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
                <p className="text-sm font-medium text-emerald-700">
                  Recovery instructions were requested successfully.
                </p>
                <p className="mt-2 text-sm text-emerald-700/90">
                  If the email belongs to an active account, a reset link will arrive
                  shortly.
                </p>
                <Link
                  to="/signin"
                  className="mt-4 inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                >
                  Return to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-charcoal">Work email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={status === 'submitting'}
                    className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
                  />
                </label>

                {errorMessage && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft disabled:cursor-not-allowed disabled:bg-stone-light disabled:text-charcoal-light"
                >
                  {status === 'submitting' ? 'Requesting reset...' : 'Send recovery link'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
