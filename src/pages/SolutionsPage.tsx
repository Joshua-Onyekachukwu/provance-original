import { Link } from 'react-router-dom'
import { SectionHeading } from '@/components/marketing/SectionHeading'
import { detailPages, useCases } from '@/data/siteContent'

export default function SolutionsPage() {
  return (
    <main className="px-6 pb-20 pt-16 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-12">
        <SectionHeading
          eyebrow={detailPages.solutions.eyebrow}
          title={detailPages.solutions.title}
          description={detailPages.solutions.intro}
        />

        <div className="grid gap-5 lg:grid-cols-2">
          {useCases.map((item) => (
            <Link key={item.title} to={item.to} className="surface-card rounded-[1.75rem] p-6 transition duration-300 hover:border-lime-300/20 hover:bg-white/[0.05]">
              <item.icon className="h-5 w-5 text-lime-100" />
              <h2 className="mt-6 text-2xl font-semibold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
