import { Link } from 'react-router-dom'
import { SectionHeading } from '@/components/marketing/SectionHeading'
import { detailPages, pricingTiers } from '@/data/siteContent'

export default function PricingPage() {
  return (
    <main className="px-6 pb-20 pt-16 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-12">
        <SectionHeading
          eyebrow={detailPages.pricing.eyebrow}
          title={detailPages.pricing.title}
          description={detailPages.pricing.intro}
        />

        <div className="grid gap-5 lg:grid-cols-4">
          {pricingTiers.map((tier) => (
            <article key={tier.name} className="surface-card rounded-[1.75rem] p-6">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-zinc-500">{tier.name}</p>
              <p className="mt-6 font-display text-4xl text-sand">{tier.price}</p>
              <p className="mt-4 min-h-[112px] text-sm leading-7 text-zinc-400">{tier.description}</p>
              <Link
                to={tier.ctaTo}
                className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-zinc-200 transition duration-300 hover:border-lime-300/20 hover:text-white"
              >
                {tier.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
