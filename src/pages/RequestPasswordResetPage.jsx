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
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10 max-w-3xl">
          <div className="surface-card p-8 md:p-10">
            <h1 className="font-serif text-4xl text-charcoal text-balance">
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
                  className="btn-primary mt-4"
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
                    className="field-input mt-2 text-sm"
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
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
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
