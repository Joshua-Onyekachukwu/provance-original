import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { InfoPage } from '@/components/marketing/InfoPage'
import { useCases } from '@/data/siteContent'

const solutionCopy = {
  journalism: 'Designed for newsroom teams and fact-checkers that need fast confidence without sacrificing the defensibility of their result.',
  legal: 'Built for disputed-media review, expert workflows, and teams that need clearer evidence than a score-only detector can provide.',
  enterprise: 'Shaped for trust, fraud, and risk operations that need a path from public media review into productized workflow automation.',
  developers: 'Created for teams that need a usable API story, report artifacts, and a product they can embed into a broader trust stack.',
}

export default function SolutionDetailPage() {
  const { slug = 'journalism' } = useParams()

  const content = useMemo(() => {
    const item = useCases.find((entry) => entry.to.endsWith(slug)) ?? useCases[0]

    return {
      eyebrow: 'Solution Detail',
      title: item.title,
      intro: solutionCopy[slug as keyof typeof solutionCopy] ?? solutionCopy.journalism,
      highlights: [
        {
          title: 'High-Trust Decisions',
          description: 'This segment benefits from clear evidence, stronger language around uncertainty, and repeatable output structures.',
          icon: item.icon,
        },
        {
          title: 'Report-Centric Workflow',
          description: 'Provance should turn every completed scan into a workflow-ready artifact rather than leaving users with an orphaned score.',
          icon: item.icon,
        },
        {
          title: 'Future Expansion Path',
          description: 'The same segment can later grow into collaboration, API, policy routing, and team review flows.',
          icon: item.icon,
        },
      ],
    }
  }, [slug])

  return <InfoPage {...content} />
}
