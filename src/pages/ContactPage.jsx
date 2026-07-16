import { useState } from 'react'
import PageHero from '../components/PageHero.jsx'

const initialForm = {
  name: '',
  email: '',
  company: '',
  intent: 'demo',
  message: '',
}

export default function ContactPage() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Tell us what you need to verify."
        description="Use this page for demo requests, enterprise conversations, API interest, or product and access questions."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Contact' }]}
      />

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] items-start">
          <div className="surface-card p-8">
            <div className="surface-card-muted mb-8 rounded-[1.5rem] p-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">
                Start the conversation
              </p>
              <h2 className="mt-4 font-serif text-2xl text-charcoal">
                Bring us the workflow, the risk, and the review context.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
                This page is for teams that need a serious conversation about how
                verification fits into editorial, enterprise, or investigative
                decision-making.
              </p>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
              Best for
            </p>
            <ul className="mt-5 space-y-3 text-sm text-charcoal-mid">
              <li>Newsroom or investigation workflows</li>
              <li>Enterprise trust and safety evaluation</li>
              <li>Developer API interest</li>
              <li>Pilot and onboarding conversations</li>
            </ul>

            <div className="surface-card-muted mt-8 rounded-xl p-5">
              <h2 className="font-serif text-xl text-charcoal">What happens next</h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                We review inbound requests, route them by use case, and follow up with the
                right next step for demos, pilots, waitlist support, or API conversations.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="surface-card p-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-charcoal">Name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="field-input mt-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-charcoal">Work email</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="field-input mt-2 text-sm"
                />
              </label>
            </div>

            <div className="grid gap-5 md:grid-cols-2 mt-5">
              <label className="block">
                <span className="text-sm font-medium text-charcoal">Company</span>
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="field-input mt-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-charcoal">Intent</span>
                <select
                  name="intent"
                  value={form.intent}
                  onChange={handleChange}
                  className="field-input mt-2 text-sm"
                >
                  <option value="demo">Request a demo</option>
                  <option value="waitlist">Join the waitlist</option>
                  <option value="pilot">Discuss a pilot</option>
                  <option value="api">Ask about API access</option>
                </select>
              </label>
            </div>

            <label className="block mt-5">
              <span className="text-sm font-medium text-charcoal">Message</span>
              <textarea
                name="message"
                rows="5"
                value={form.message}
                onChange={handleChange}
                placeholder="Tell us about your workflow, team, or what kind of media you need to review."
                className="field-input mt-2 text-sm"
              />
            </label>

            <button
              type="submit"
              className="btn-primary mt-6"
            >
              Send request
            </button>

            {submitted && (
              <p className="mt-4 text-sm text-charcoal-mid">
                Thanks. Your message has been received. We will follow up by email with
                the appropriate response for your request.
              </p>
            )}
          </form>
        </div>
      </section>
    </div>
  )
}
