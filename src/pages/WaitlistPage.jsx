import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { submitWaitlistApplication } from '../lib/api'

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
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-amber font-mono text-xs uppercase tracking-[0.2em]"
            >
              Early Access
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl mt-4 text-balance text-charcoal"
            >
              Join the Provance waitlist.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-6 text-lg text-charcoal-mid leading-relaxed"
            >
              Early access opens first for individuals and teams who need reviewable
              evidence, clearer confidence, and a faster verification workflow.
            </motion.p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] items-start">
          <div className="space-y-6">
            <div className="rounded-2xl border border-stone-light bg-white-warm p-8">
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

            <div className="rounded-2xl border border-stone-light bg-parchment p-8">
              <h2 className="font-serif text-2xl text-charcoal">Need a faster path?</h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                If you already have an urgent workflow or want to explore design-partner
                access, use the contact page so we can route you correctly.
              </p>
              <Link
                to="/contact"
                className="mt-5 inline-flex px-5 py-3 border border-stone text-charcoal font-medium text-sm rounded-xl hover:border-charcoal/30 transition-all duration-200"
              >
                Request a demo or design-partner conversation
              </Link>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-stone-light bg-white-warm p-8 shadow-sm"
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
                  className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
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
                  className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
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
                  className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
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
                  className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
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
                className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-6 inline-flex px-6 py-3 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200"
            >
              {isSubmitting ? 'Submitting...' : 'Join waitlist'}
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
              <div className="mt-5 rounded-xl border border-amber/20 bg-amber-subtle/60 p-4">
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
