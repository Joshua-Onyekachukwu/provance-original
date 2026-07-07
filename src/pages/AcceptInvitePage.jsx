import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { acceptInvite } from '../lib/api.js'

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const inviteToken = useMemo(
    () => searchParams.get('token') || searchParams.get('invite') || '',
    [searchParams],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage('')

    try {
      await acceptInvite({
        token: inviteToken,
        fullName,
        password,
      })
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error.message || 'Invite activation failed.')
    }
  }

  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment">
        <div className="content-container max-w-3xl">
          <div className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
              Invite activation
            </p>
            <h1 className="mt-3 font-serif text-4xl text-charcoal">
              Activate your Provance access
            </h1>
            <p className="mt-4 text-base leading-relaxed text-charcoal-mid">
              Approved users can activate their account here and continue into the
              verification workspace.
            </p>

            {!inviteToken && (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                No invite token was found in this link. Request a fresh access invite from
                the Provance team.
              </div>
            )}

            {status === 'success' ? (
              <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-5">
                <p className="text-sm font-medium text-emerald-700">
                  Account activated successfully.
                </p>
                <p className="mt-2 text-sm text-emerald-700/90">
                  You can now sign in with your work email and the password you just set.
                </p>
                <Link
                  to="/signin"
                  className="mt-4 inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft"
                >
                  Continue to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-charcoal">Full name</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    disabled={!inviteToken || status === 'submitting'}
                    className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-charcoal">Create password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    disabled={!inviteToken || status === 'submitting'}
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
                  disabled={!inviteToken || status === 'submitting'}
                  className="inline-flex rounded-xl bg-charcoal px-5 py-3 text-sm font-medium text-parchment transition hover:bg-charcoal-soft disabled:cursor-not-allowed disabled:bg-stone-light disabled:text-charcoal-light"
                >
                  {status === 'submitting' ? 'Activating account...' : 'Activate access'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
