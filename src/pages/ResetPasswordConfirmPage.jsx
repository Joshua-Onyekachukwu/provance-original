import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmPasswordReset } from '../lib/api.js'

export default function ResetPasswordConfirmPage() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const resetToken = useMemo(
    () => searchParams.get('token') || searchParams.get('token_hash') || '',
    [searchParams],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      await confirmPasswordReset({
        token: resetToken,
        password,
      })
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Password reset failed.')
    }
  }

  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10 max-w-3xl">
          <div className="surface-card p-8 md:p-10">
            <h1 className="font-serif text-4xl text-charcoal text-balance">
              Set a new password
            </h1>
            <p className="mt-4 text-base leading-relaxed text-charcoal-mid">
              Complete the password reset using the secure link from your recovery email.
            </p>

            {!resetToken && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                No recovery token was found in this link. Request a fresh reset link to
                continue.
              </div>
            )}

            {status === 'success' ? (
              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
                <p className="text-sm font-medium text-emerald-700">
                  Password updated successfully.
                </p>
                <p className="mt-2 text-sm text-emerald-700/90">
                  You can now sign in using your new password.
                </p>
                <Link
                  to="/signin"
                  className="btn-primary mt-4"
                >
                  Continue to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-charcoal">New password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    disabled={!resetToken || status === 'submitting'}
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
                  disabled={!resetToken || status === 'submitting'}
                  className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'submitting' ? 'Updating password...' : 'Update password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
