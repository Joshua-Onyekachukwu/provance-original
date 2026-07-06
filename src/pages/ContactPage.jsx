import { useState } from 'react'
import { motion } from 'framer-motion'

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
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.span
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-amber font-mono text-xs uppercase tracking-[0.2em]"
            >
              Contact
            </motion.span>
            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="font-serif text-4xl sm:text-5xl lg:text-6xl mt-4 text-balance text-charcoal"
            >
              Tell us what you need to verify.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="mt-6 text-lg text-charcoal-mid leading-relaxed"
            >
              Use this page for demo requests, waitlist questions, API conversations, or
              general product support.
            </motion.p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] items-start">
          <div className="rounded-2xl border border-stone-light bg-white-warm p-8">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
              Best for
            </p>
            <ul className="mt-5 space-y-3 text-sm text-charcoal-mid">
              <li>Newsroom or investigation workflows</li>
              <li>Enterprise trust and safety evaluation</li>
              <li>Developer API interest</li>
              <li>Pilot and onboarding conversations</li>
            </ul>

            <div className="mt-8 rounded-xl border border-stone-light bg-parchment p-5">
              <h2 className="font-serif text-xl text-charcoal">What happens next</h2>
              <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                We review inbound requests, route them by use case, and follow up with
                the correct path for demos, waitlist support, or API conversations.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-stone-light bg-white-warm p-8 shadow-sm"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-charcoal">Name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
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
                  className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-charcoal">Intent</span>
                <select
                  name="intent"
                  value={form.intent}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
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
                className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal outline-none transition focus:border-amber"
              />
            </label>

            <button
              type="submit"
              className="mt-6 inline-flex px-6 py-3 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200"
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
