import { useState } from 'react'
import { Link } from 'react-router-dom'
import { submitWaitlistApplication } from '../lib/api'
import PageHero from '../components/PageHero.jsx'

const initialForm = {
  name: '',
  email: '',
  company: '',
  role: '',
  useCase: '',
}

export default function WaitlistPage() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const response = await submitWaitlistApplication(form)
      setSubmitted(true)
      setSuccessMessage(
        response?.message ||
          'Your request has been received. We will reach out by email if your workflow matches the next available access cohort.',
      )
      setForm(initialForm)
    } catch (error) {
      setSubmitted(false)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'We could not send your request right now. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Join the Provance waitlist."
        description="Early access opens first for professionals and teams who need reviewable evidence, clearer confidence, and a faster path to defensible verification."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Waitlist' }]}
      />

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] items-start">
          <div className="space-y-6">
            <div className="surface-card p-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
                What to expect
              </p>
              <ul className="mt-5 space-y-3 text-sm text-charcoal-mid">
                <li>Priority for high-trust professional workflows</li>
                <li>Invite-based access in controlled cohorts</li>
                <li>Future email verification and approval routing</li>
                <li>Account activation and onboarding after approval</li>
              </ul>
            </div>

            <div className="surface-card-muted p-8">
              <h2 className="font-serif text-2xl text-charcoal">Need a faster path?</h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                If you already have an urgent workflow or want to explore design-partner
                access, use the contact page so we can route you correctly.
              </p>
              <Link
                to="/contact"
                className="btn-secondary mt-5"
              >
                Request a demo or design-partner conversation
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="surface-card p-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-charcoal">Full name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  className="field-input mt-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-charcoal">Role</span>
                <input
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  placeholder="Reporter, investigator, analyst, counsel"
                  disabled={isSubmitting}
                  className="field-input mt-2 text-sm"
                />
              </label>
            </div>

            <label className="block mt-5">
              <span className="text-sm font-medium text-charcoal">Primary use case</span>
              <textarea
                name="useCase"
                rows="5"
                value={form.useCase}
                onChange={handleChange}
                placeholder="Tell us how you expect to use Provance and what kind of media review matters most to your team."
                disabled={isSubmitting}
                className="field-input mt-2 text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary mt-6"
            >
              {isSubmitting ? 'Submitting...' : 'Join early access'}
            </button>

            <p className="mt-4 text-xs leading-relaxed text-charcoal-light">
              We review each request, follow up by email, and route access based on
              workflow fit, rollout timing, and current cohort capacity.
            </p>

            {errorMessage && (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50/80 p-4">
                <p className="text-sm text-rose-700">{errorMessage}</p>
              </div>
            )}

            {submitted && (
              <div className="mt-5 rounded-xl border border-trust/14 bg-trust-soft/70 p-4">
                <p className="text-sm text-charcoal">
                  {successMessage}
                </p>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  )
}
