type SectionHeadingProps = {
  eyebrow: string
  title: string
  description: string
}

export function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#7a715f]">{eyebrow}</p>
      <h2 className="font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[#17181a] md:text-5xl">{title}</h2>
      <p className="max-w-2xl text-base leading-8 text-[#5d6066]">{description}</p>
    </div>
  )
}
