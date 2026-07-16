import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'

const featuredResources = [
  {
    title: 'Documentation',
    desc: 'API direction, verification flow, and integration surfaces for teams evaluating developer access.',
    href: '/docs',
  },
  {
    title: 'Sample Report',
    desc: 'Review the report artifact users can inspect, circulate, and export as part of a real workflow.',
    href: '/sample-report',
  },
  {
    title: 'Methodology',
    desc: 'Understand how Provance frames evidence, confidence, limitations, and transparency.',
    href: '/methodology',
  },
  {
    title: 'Security',
    desc: 'Read how Provance approaches controlled access, auditability, and enterprise-readiness.',
    href: '/security',
  },
]

const knowledgeAreas = [
  {
    title: 'AI verification guides',
    items: [
      'How to interpret confidence and risk together',
      'What synthetic-media evidence should and should not claim',
      'When a suspicious result should trigger human escalation',
    ],
  },
  {
    title: 'Industry standards',
    items: [
      'Content provenance and C2PA direction',
      'Metadata integrity and chain-of-custody practices',
      'Workflow expectations for auditability and evidence retention',
    ],
  },
  {
    title: 'Research and whitepapers',
    items: [
      'Signal-weighting and multi-model verification direction',
      'Compression, provenance, and watermark detection reference areas',
      'Future Provance benchmark and methodology publications',
    ],
  },
]

const roadmapResources = [
  {
    title: 'Case studies',
    status: 'Planned',
    desc: 'Future examples showing how teams use Provance in editorial, legal, compliance, and enterprise review contexts.',
  },
  {
    title: 'Product updates',
    status: 'Planned',
    desc: 'Public notes on methodology improvements, report quality upgrades, and rollout milestones.',
  },
  {
    title: 'Learning library',
    status: 'Growing',
    desc: 'A destination for explainers, best practices, FAQs, and industry education as the platform expands.',
  },
  {
    title: 'API onboarding resources',
    status: 'Active',
    desc: 'Current API direction is available through the docs page while deeper integration materials mature.',
  },
]

export default function ResourcesPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="A growing knowledge base for trustworthy media verification."
        description="This page brings together the public materials, educational content, and trust-building references that help teams understand how Provance works and where the platform is headed."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Resources' }]}
      />

      <section className="section-padding bg-parchment-light">
        <div className="content-container">
          <div className="mb-12 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Featured resources</p>
            <h2 className="mt-4 font-serif text-3xl text-charcoal sm:text-4xl">
              Start with the core public materials.
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <Link
              to={featuredResources[0].href}
              className="surface-card group relative overflow-hidden p-0 transition hover:-translate-y-1"
            >
              <div className="relative p-8 md:p-10">
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-trust/10 blur-2xl transition-transform duration-300 group-hover:scale-110" />
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-charcoal-light">Featured destination</p>
                <p className="mt-4 font-serif text-3xl text-charcoal">{featuredResources[0].title}</p>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-charcoal-mid">{featuredResources[0].desc}</p>
                <div className="mt-8 inline-flex rounded-full border border-stone-light bg-white px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-charcoal-mid">
                  Explore now
                </div>
              </div>
            </Link>

            <div className="grid gap-5">
              {featuredResources.slice(1).map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="surface-card p-7 transition hover:-translate-y-1"
              >
                <p className="font-serif text-2xl text-charcoal">{item.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">{item.desc}</p>
              </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="eyebrow eyebrow-dark">Knowledge Areas</span>
            <h2 className="mt-4 font-serif text-3xl text-balance sm:text-4xl">
              The topics we want Provance to be known for.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {knowledgeAreas.map((area) => (
              <div key={area.title} className="surface-card-dark p-6">
                <h3 className="font-serif text-xl text-parchment">{area.title}</h3>
                <ul className="feature-list mt-5 text-sm leading-relaxed text-stone">
                  {area.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="surface-card relative overflow-hidden p-8 md:p-10">
            <div className="absolute left-[-2rem] top-[-2rem] h-24 w-24 rounded-full bg-amber/10 blur-2xl" />
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Why this page matters</p>
            <h2 className="mt-4 font-serif text-3xl text-charcoal">Resources should build authority, not fill space.</h2>
            <p className="mt-5 text-sm leading-relaxed text-charcoal-mid">
              The goal of this page is to show that Provance is becoming a serious authority in explainable media verification. That means practical guides, standards awareness, research direction, and product materials that help visitors understand the problem space as well as the product itself.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
              Over time, this section can support search visibility, strengthen trust, and give buyers, evaluators, and design partners more reasons to return even before full product access opens.
            </p>
          </div>

          <div className="grid gap-5">
            <div className="surface-card-muted p-8 md:p-10">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Learning path</p>
              <ul className="feature-list mt-5 text-sm leading-relaxed text-charcoal-mid">
                <li>Start with the methodology page to understand evidence and confidence framing.</li>
                <li>Review the sample report to see how outputs are packaged for serious workflows.</li>
                <li>Use the docs page to understand how API access and integration direction fit into the product.</li>
                <li>Read the security page for the trust and control posture behind the platform.</li>
              </ul>
            </div>

            <div className="surface-card p-8 md:p-10">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">
                Editorial direction
              </p>
              <h2 className="mt-4 font-serif text-3xl text-charcoal">
                A resource library should feel like part of the product story.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-charcoal-mid">
                The goal is to make Provance feel informed, current, and trustworthy
                before a visitor ever enters the application.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-parchment">
        <div className="content-container">
          <div className="mb-12 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">What is coming next</p>
            <h2 className="mt-4 font-serif text-3xl text-charcoal sm:text-4xl">
              Planned resource surfaces
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {roadmapResources.map((item) => (
              <div key={item.title} className="surface-card p-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-serif text-xl text-charcoal">{item.title}</h3>
                  <span className="rounded-full border border-stone-light bg-parchment px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
                    {item.status}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
