import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Tabs,
  useRegisterCommands,
  useToast,
} from '../../components/ui'
import { getHelpContent } from '../../lib/api.js'
import { useDemoState, withDemoOverride } from '../../lib/useDemoState.js'
import { useResource } from '../../lib/useResource.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4a2 2 0 0 0-2-2H6.5A2.5 2.5 0 0 0 4 4.5v15Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </svg>
  )
}

function normalize(value) {
  return String(value || '').toLowerCase().trim()
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AppHelpDocsPage({ module = 'help' }) {
  const toast = useToast()
  const navigate = useNavigate()
  const demoState = useDemoState()
  const isDocs = module === 'docs'

  // Both /app/docs and /app/help render this same component, so React Router
  // updates `module` without remounting — `module` must be a resource dep or
  // the content would never refetch when switching routes.
  const resource = useResource(
    () => getHelpContent({ module }).then((r) => r || {}),
    [module],
  )

  // Reset per-module UI state when switching between docs and help.
  useEffect(() => {
    setQuery('')
    setActiveCategory('all')
    setOpenFaqId(null)
    setContactSent(false)
  }, [module])
  const content = withDemoOverride(resource, demoState, {
    emptyData: { categories: [], guides: [], faqs: [], channels: [] },
  })

  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [openFaqId, setOpenFaqId] = useState(null)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactForm, setContactForm] = useState({ subject: '', message: '' })
  const [isSending, setIsSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const sendTimerRef = useRef(null)

  // Clear any in-flight send simulation if the drawer closes/unmounts so the
  // timer cannot fire after the user has left the form.
  useEffect(() => () => window.clearTimeout(sendTimerRef.current), [])

  const status = content.status
  const loading = status === 'loading'
  const failed = status === 'error'

  const categories = useMemo(() => content.data?.categories || [], [content.data])
  const guides = useMemo(() => content.data?.guides || [], [content.data])
  const faqs = useMemo(() => content.data?.faqs || [], [content.data])
  const channels = useMemo(() => content.data?.channels || [], [content.data])

  const searchableGuides = useMemo(
    () =>
      guides.filter((guide) => {
        const matchesCategory = activeCategory === 'all' || guide.category === activeCategory
        if (!matchesCategory) return false
        if (!query.trim()) return true
        const haystack = normalize(`${guide.title} ${guide.summary} ${guide.sections.join(' ')}`)
        return haystack.includes(normalize(query))
      }),
    [guides, activeCategory, query],
  )

  const searchableFaqs = useMemo(
    () =>
      faqs.filter((faq) => {
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory
        if (!matchesCategory) return false
        if (!query.trim()) return true
        return normalize(`${faq.question} ${faq.answer}`).includes(normalize(query))
      }),
    [faqs, activeCategory, query],
  )

  const guideTabs = useMemo(
    () => [
      { value: 'all', label: 'All guides' },
      ...categories.map((cat) => ({ value: cat.value, label: cat.label })),
    ],
    [categories],
  )

  const faqTabs = useMemo(
    () => [
      { value: 'all', label: 'All topics' },
      ...categories.map((cat) => ({ value: cat.value, label: cat.label })),
    ],
    [categories],
  )

  const hasResults = searchableGuides.length > 0 || searchableFaqs.length > 0
  const resultsEmpty = Boolean(query.trim()) && !hasResults

  function submitContact(event) {
    event.preventDefault()
    if (!contactForm.subject.trim() || !contactForm.message.trim()) return
    setIsSending(true)
    // Simulate a submit round-trip; resolves after the mock delay pattern.
    sendTimerRef.current = window.setTimeout(() => {
      setIsSending(false)
      setContactSent(true)
      toast.success('Message sent to the Provance team')
    }, 700)
  }

  const faqCount = searchableFaqs.length

  useRegisterCommands(
    [
      {
        id: isDocs ? 'docs.quickstart' : 'help.quickstart',
        group: isDocs ? 'Documentation' : 'Help',
        label: isDocs ? 'Read the quickstart guide' : 'Open the getting-started guide',
        hint: isDocs ? 'Create your first scan' : 'First-time walkthrough',
        keywords: ['help', 'docs', 'guide', 'quickstart'],
        onSelect: () => {
          if (guides[0]) {
            setActiveCategory(guides[0].category)
            setQuery(guides[0].title)
          }
        },
      },
      {
        id: isDocs ? 'docs.api-reference' : 'help.contact',
        group: isDocs ? 'Documentation' : 'Help',
        label: isDocs ? 'Open the API reference' : 'Contact support',
        hint: isDocs ? 'Endpoints and auth' : 'Reach the Provance team',
        keywords: isDocs ? ['api', 'reference', 'endpoints'] : ['help', 'support', 'contact', 'email'],
        onSelect: isDocs
          ? () => {
              setActiveCategory('api')
              setQuery('')
            }
          : () => setContactOpen(true),
      },
    ],
    [isDocs, guides],
  )

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm sm:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-charcoal-light">
          {isDocs ? 'Documentation' : 'Help & Support'}
        </p>
        <h2 className="mt-3 font-serif text-3xl text-charcoal sm:text-4xl">
          {isDocs ? 'Build on Provance' : 'How can we help?'}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          {isDocs
            ? 'Guides for the verification API, webhooks, and integration surfaces — everything you need to submit media and read reports programmatically.'
            : 'Searchable guides and answers for the most common questions about your workspace, billing, security, and integrations.'}
        </p>

        <label className="relative mt-6 block max-w-xl">
          <span className="sr-only">{isDocs ? 'Search documentation' : 'Search help'}</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-light">
            <SearchIcon />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isDocs ? 'Search guides, endpoints, webhooks…' : 'Search questions and topics…'}
            className="w-full rounded-2xl border border-stone-light bg-parchment py-3.5 pl-11 pr-4 text-sm text-charcoal placeholder:text-charcoal-light focus:border-charcoal focus:outline-none focus:ring-1 focus:ring-charcoal/20"
          />
        </label>
      </section>

      {/* ── Guides (docs) or FAQ (help) ─────────────────────────────────── */}
      {isDocs ? (
        <Card
          eyebrow="Guides"
          title="Documentation"
          description="Searchable walkthroughs and reference material for the verification platform."
          state={failed ? 'error' : loading ? 'loading' : 'default'}
          errorDescription={content.error}
          onRetry={content.reload}
          loadingRows={4}
        >
          {!loading && !failed && categories.length > 0 && (
            <div className="mb-5 border-b border-stone-light pb-1">
              <Tabs
                items={guideTabs}
                value={activeCategory}
                onChange={setActiveCategory}
                ariaLabel="Filter documentation by category"
              />
            </div>
          )}

          {!loading && !failed && resultsEmpty && (
            <EmptyState
              variant="empty"
              title={`No guides match “${query}”`}
              description="Try a different keyword or browse the full category list."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setActiveCategory('all')
                  }}
                >
                  Clear search
                </Button>
              }
              compact
            />
          )}

          {!loading && !failed && !resultsEmpty && searchableGuides.length === 0 && (
            <EmptyState
              variant="empty"
              title="No guides in this category yet"
              description="More documentation is on the way."
              compact
            />
          )}

          {!loading && !failed && searchableGuides.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {searchableGuides.map((guide) => (
                <article
                  key={guide.id}
                  className="group rounded-2xl border border-stone-light bg-parchment p-5 transition hover:border-charcoal/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="info" size="sm">
                      {categories.find((cat) => cat.value === guide.category)?.label || guide.category}
                    </Badge>
                    <span className="text-[11px] tabular-nums text-charcoal-light">
                      {guide.readMinutes} min read
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-xl text-charcoal">{guide.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-charcoal-mid">{guide.summary}</p>
                  <ol className="mt-4 space-y-2">
                    {guide.sections.map((section, index) => (
                      <li key={section} className="flex items-start gap-2.5 text-sm text-charcoal-mid">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-charcoal/10 font-mono text-[10px] font-semibold text-charcoal">
                          {index + 1}
                        </span>
                        <span className="leading-relaxed">{section}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <Card
          eyebrow="Frequently asked questions"
          title="Answers"
          description="Tap a question to expand its answer. Search filters questions and answers as you type."
          state={failed ? 'error' : loading ? 'loading' : 'default'}
          errorDescription={content.error}
          onRetry={content.reload}
          loadingRows={4}
          actions={
            <Button variant="secondary" size="sm" onClick={() => setContactOpen(true)}>
              Contact support
            </Button>
          }
        >
          {!loading && !failed && categories.length > 0 && (
            <div className="mb-5 border-b border-stone-light pb-1">
              <Tabs
                items={faqTabs}
                value={activeCategory}
                onChange={setActiveCategory}
                ariaLabel="Filter help topics by category"
              />
            </div>
          )}

          {!loading && !failed && resultsEmpty && (
            <EmptyState
              variant="empty"
              title={`No answers match “${query}”`}
              description="Try different wording, or contact support for a direct answer."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setActiveCategory('all')
                  }}
                >
                  Clear search
                </Button>
              }
              compact
            />
          )}

          {!loading && !failed && !resultsEmpty && searchableFaqs.length === 0 && (
            <EmptyState
              variant="empty"
              title="No questions in this topic yet"
              description="More help content is on the way."
              compact
            />
          )}

          {!loading && !failed && searchableFaqs.length > 0 && (
            <div className="divide-y divide-stone-light rounded-2xl border border-stone-light">
              {searchableFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id
                return (
                  <div key={faq.id}>
                    <button
                      type="button"
                      id={`faq-question-${faq.id}`}
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      aria-expanded={isOpen}
                      aria-controls={`faq-answer-${faq.id}`}
                      className="ui-focus-ring flex w-full items-center justify-between gap-4 bg-white-warm px-5 py-4 text-left transition hover:bg-parchment/70"
                    >
                      <span className="text-sm font-medium text-charcoal">{faq.question}</span>
                      <span
                        aria-hidden="true"
                        className={`shrink-0 text-charcoal-light transition-transform duration-200 ${
                          isOpen ? 'rotate-45' : ''
                        }`}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div
                        id={`faq-answer-${faq.id}`}
                        role="region"
                        aria-labelledby={`faq-question-${faq.id}`}
                        className="border-t border-stone-light bg-parchment px-5 py-4"
                      >
                        <p className="text-sm leading-relaxed text-charcoal-mid">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {!loading && !failed && faqCount > 0 && (
            <p className="mt-4 text-xs text-charcoal-light">
              Showing {faqCount} of {faqs.length} questions.
            </p>
          )}
        </Card>
      )}

      {/* ── Contact channels (both modules) ─────────────────────────────── */}
      <Card
        eyebrow="Contact"
        title={isDocs ? 'Still have questions?' : 'Reach the team'}
        description="Answers beyond the guides and FAQ are one conversation away."
        state={failed ? 'error' : loading ? 'loading' : 'default'}
        errorDescription={content.error}
        onRetry={content.reload}
        loadingRows={2}
      >
        {!loading && !failed && channels.length === 0 && (
          <EmptyState
            variant="empty"
            title="No contact channels available"
            description="Reach out through another route while support channels are being set up."
            compact
          />
        )}
        {!loading && !failed && channels.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {channels.map((channel) => (
              <a
                key={channel.id}
                href={channel.href}
                onClick={(event) => {
                  if (channel.href.startsWith('mailto:')) return
                  event.preventDefault()
                  if (channel.href.startsWith('/app')) navigate(channel.href)
                }}
                className="group rounded-2xl border border-stone-light bg-parchment p-5 transition hover:border-charcoal/30"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-charcoal/10 text-charcoal transition group-hover:bg-charcoal group-hover:text-parchment">
                  <BookIcon />
                </span>
                <p className="mt-3 text-sm font-medium text-charcoal">{channel.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-charcoal-mid">{channel.description}</p>
                <p className="mt-3 text-xs font-medium text-sky-700">{channel.value}</p>
              </a>
            ))}
          </div>
        )}
      </Card>

      {/* ── Contact drawer ──────────────────────────────────────────────── */}
      <Drawer
        open={contactOpen}
        onClose={() => {
          window.clearTimeout(sendTimerRef.current)
          setContactOpen(false)
          setContactSent(false)
          setIsSending(false)
        }}
        title="Contact the Provance team"
        description="Tell us what you need — we usually reply within one business day."
      >
        {contactSent ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-6 text-center">
            <p className="font-serif text-xl text-charcoal">Message sent</p>
            <p className="mt-2 text-sm text-charcoal-mid">
              Thanks for reaching out. The team will get back to you shortly.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-5"
              onClick={() => {
                setContactOpen(false)
                setContactSent(false)
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submitContact} className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-charcoal">Subject</span>
              <input
                type="text"
                value={contactForm.subject}
                onChange={(event) =>
                  setContactForm((current) => ({ ...current, subject: event.target.value }))
                }
                placeholder="e.g. Billing question"
                required
                className="mt-2 w-full rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-charcoal">Message</span>
              <textarea
                value={contactForm.message}
                onChange={(event) =>
                  setContactForm((current) => ({ ...current, message: event.target.value }))
                }
                rows={5}
                required
                className="mt-2 w-full resize-none rounded-xl border border-stone-light bg-parchment px-4 py-3 text-sm text-charcoal"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setContactOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSending}>
                {isSending ? 'Sending…' : 'Send message'}
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  )
}
