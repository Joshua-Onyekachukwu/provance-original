import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function SignInPage() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <main className="px-6 pb-20 pt-16 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px]">
        <section className="surface-panel rounded-[2rem] p-8">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-lime-100/75">Sign In</p>
          <h1 className="mt-6 font-display text-5xl leading-tight text-white">Return to your verification workspace.</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-zinc-400">
            Access scan history, downloadable reports, and your next product steps from one clean dashboard surface.
          </p>
        </section>

        <section className="surface-card rounded-[2rem] p-8">
          {submitted ? (
            <div className="space-y-4">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-lime-100/75">Workspace Access</p>
              <h2 className="text-3xl font-semibold text-white">Sign-in flow staged for product integration.</h2>
              <p className="text-sm leading-7 text-zinc-400">
                This page is ready to connect to Supabase Auth in the next implementation pass.
              </p>
            </div>
          ) : (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault()
                setSubmitted(true)
              }}
            >
              <div>
                <label htmlFor="signin-email" className="mb-2 block text-sm text-zinc-400">
                  Email
                </label>
                <input
                  id="signin-email"
                  className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-lime-300/20"
                  placeholder="name@company.com"
                />
              </div>
              <div>
                <label htmlFor="signin-password" className="mb-2 block text-sm text-zinc-400">
                  Password
                </label>
                <input
                  id="signin-password"
                  type="password"
                  className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-lime-300/20"
                  placeholder="••••••••"
                />
              </div>
              <button type="submit" className="w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-[#151612] transition duration-300 hover:bg-[#f0f4e6]">
                Sign In
              </button>
            </form>
          )}
          <p className="mt-5 text-sm text-zinc-500">
            New to Provance?{' '}
            <Link to="/signup?intent=trial" className="text-zinc-200 transition hover:text-white">
              Create an account
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}
