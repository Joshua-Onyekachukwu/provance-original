import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const intentHeadlines: Record<string, string> = {
  demo: 'Request a guided walkthrough tailored to your workflow.',
  trial: 'Start a trial and move from marketing claim to live product path.',
  pro: 'Create a professional account for repeat verification work.',
  team: 'Tell us about your team and the workflow you need to support.',
  enterprise: 'Start an enterprise conversation around API and trust operations.',
}

export default function SignUpPage() {
  const [params] = useSearchParams()
  const intent = params.get('intent') ?? 'trial'
  const [submitted, setSubmitted] = useState(false)

  const heroTitle = useMemo(() => intentHeadlines[intent] ?? intentHeadlines.trial, [intent])

  return (
    <main className="px-6 pb-20 pt-16 lg:px-10">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px]">
        <section className="surface-panel rounded-[2rem] p-8">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-lime-100/75">Get Started</p>
          <h1 className="mt-6 font-display text-5xl leading-tight text-white">{heroTitle}</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-zinc-400">
            This signup surface is designed to route trial users, demo requests, and enterprise prospects into the right next step while keeping the experience clean and premium.
          </p>
        </section>

        <section className="surface-card rounded-[2rem] p-8">
          {submitted ? (
            <div className="space-y-4">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-lime-100/75">Captured</p>
              <h2 className="text-3xl font-semibold text-white">Thanks. Your request has been staged.</h2>
              <p className="text-sm leading-7 text-zinc-400">
                This is the first version of the lead-capture flow. It can be connected to Supabase or a CRM in the next implementation pass.
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
              {['Name', 'Email', 'Company', 'Role'].map((field) => (
                <div key={field}>
                  <label htmlFor={field.toLowerCase()} className="mb-2 block text-sm text-zinc-400">
                    {field}
                  </label>
                  <input
                    id={field.toLowerCase()}
                    required={field === 'Name' || field === 'Email'}
                    className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-lime-300/20"
                    placeholder={field}
                  />
                </div>
              ))}
              <div>
                <label htmlFor="verification-need" className="mb-2 block text-sm text-zinc-400">
                  What are you trying to verify?
                </label>
                <textarea
                  id="verification-need"
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-lime-300/20"
                  placeholder="Tell us about your workflow, media type, or integration need."
                />
              </div>
              <button type="submit" className="w-full rounded-full bg-lime-300 px-5 py-3 text-sm font-semibold text-[#151612] transition duration-300 hover:bg-[#f0f4e6]">
                Continue
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  )
}
