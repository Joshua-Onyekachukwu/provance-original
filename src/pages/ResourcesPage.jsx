import { Link } from 'react-router-dom'

const resources = [
  {
    title: 'Methodology',
    desc: 'Understand how Provance thinks about evidence, confidence, and limitations.',
    href: '/methodology',
  },
  {
    title: 'Sample Report',
    desc: 'Review a full example of the report output users can inspect, share, and export.',
    href: '/sample-report',
  },
  {
    title: 'Security',
    desc: 'Read how Provance handles security, access control, and auditability.',
    href: '/security',
  },
  {
    title: 'Docs',
    desc: 'See the developer-facing API shape, verification flow, and integration path.',
    href: '/docs',
  },
]

export default function ResourcesPage() {
  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10 max-w-5xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
            Resources
          </p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl text-charcoal">
            Read the key public materials.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-charcoal-mid">
            This page brings together the public materials that explain the product,
            its trust posture, and how the workflow works in practice.
          </p>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {resources.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-2xl border border-stone-light bg-white-warm p-7 transition hover:border-amber/25 hover:shadow-sm"
              >
                <p className="font-serif text-2xl text-charcoal">{item.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                  {item.desc}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
