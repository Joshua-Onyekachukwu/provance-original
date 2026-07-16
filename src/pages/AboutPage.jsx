import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'

const coreValues = [
  {
    title: 'Clarity over theater',
    desc: 'We believe verification tools should explain what they found, not hide behind impressive but opaque language.',
  },
  {
    title: 'Trust through evidence',
    desc: 'Confidence comes from evidence that can be reviewed, questioned, and carried into a real workflow.',
  },
  {
    title: 'Long-term infrastructure thinking',
    desc: 'We are building for a future where authenticity review becomes a normal operational requirement across industries.',
  },
]

const audiences = [
  'Journalists and editorial standards teams',
  'Legal professionals and compliance teams',
  'Government, public-sector, and security teams',
  'Enterprise trust-and-safety and investigation workflows',
]

export default function AboutPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        title="Building a serious company for a trust-critical problem."
        description="Provance exists to help people evaluate suspicious media with more confidence, more transparency, and more operational usefulness than a black-box score can provide."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'About' }]}
      />

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="surface-card relative overflow-hidden p-8 md:p-10">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-trust/8 blur-2xl" />
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Our story</p>
            <h2 className="mt-4 font-serif text-3xl text-charcoal">Why we started Provance</h2>
            <p className="mt-5 text-sm leading-relaxed text-charcoal-mid">
              Synthetic media is improving faster than the systems most organizations use to review it. In many real workflows, the question is not just whether something looks suspicious. The question is whether the result can be trusted enough to inform publication, escalation, policy, or legal review.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
              We started Provance because that gap is becoming operationally important. Teams need verification outputs they can inspect, explain, share, and defend. That means evidence, context, provenance signals, documented uncertainty, and reports that hold up under scrutiny.
            </p>
          </div>

          <div className="space-y-6 pt-2">
            <div className="surface-card-muted p-8">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">
                Who this is for
              </p>
              <h2 className="mt-4 font-serif text-3xl text-charcoal">
                Verification is becoming a real cross-functional workflow.
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-charcoal-mid">
                Provance is built for the people who need to review media together,
                document the evidence clearly, and move forward with a result they can
                explain.
              </p>
            </div>

            <div className="surface-card p-8">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Mission</p>
                  <p className="mt-4 text-base leading-relaxed text-charcoal">
                    Help organizations make better decisions about suspicious media through evidence-first verification and professional reporting.
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Vision</p>
                  <p className="mt-4 text-base leading-relaxed text-charcoal">
                    Become the most trusted, fastest, and most explainable verification platform for AI-generated and manipulated media.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-trust/12 bg-trust-mist p-8 shadow-[0_18px_45px_rgba(47,91,234,0.07)]">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-trust-strong">Why now</p>
              <p className="mt-4 text-base leading-relaxed text-charcoal-mid">
                Authenticity review is shifting from a niche concern to a normal operational need. We are building for that shift now, before trust failures become even harder to manage.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10 grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="surface-card-dark p-8 md:p-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-stone">The problem we are solving</p>
            <h2 className="mt-4 font-serif text-3xl">Trust is getting harder to establish.</h2>
            <p className="mt-5 text-sm leading-relaxed text-stone">
              As synthetic-media quality rises, organizations face increasing pressure to verify what they receive before they publish it, act on it, or preserve it as evidence. That problem affects journalism, law, public institutions, enterprise risk teams, and anyone responsible for high-stakes review.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-stone">
              The market does not need more vague detection claims. It needs better trust infrastructure: clear verdicts, visible evidence, documented limitations, and artifacts that travel with the decision.
            </p>
          </div>

          <div className="grid gap-5">
            <div className="surface-card-dark p-8 md:p-10">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-stone">Why trust matters</p>
              <h2 className="mt-4 font-serif text-3xl">Verification only matters if people can rely on it.</h2>
              <p className="mt-5 text-sm leading-relaxed text-stone">
                In trust-critical environments, a result that cannot be explained is not enough. Reviewers need to understand why the system reached a conclusion, which signals mattered most, where uncertainty remains, and what should happen next.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-stone">
                That is why Provance is designed around defensibility, not novelty. We want the output to be useful in a real workflow, not just impressive in a demo.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-8">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ['Explainable outputs', 'Not just a score'],
                  ['Audit-ready artifacts', 'Reports that travel'],
                  ['Workflow fit', 'Built for real review teams'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-stone">{label}</div>
                    <div className="mt-2 font-serif text-lg text-parchment">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="surface-card p-8 md:p-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Our approach</p>
            <h2 className="mt-4 font-serif text-3xl text-charcoal">Evidence-first verification</h2>
            <p className="mt-5 text-sm leading-relaxed text-charcoal-mid">
              Our approach combines multiple verification signals, transparent confidence framing, professional reporting, and workflow-aware outputs. We are intentionally building the product around explainable evidence instead of a single classifier experience.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
              That philosophy influences how we design the product, how we talk about confidence, how we treat uncertainty, and how we think about long-term defensibility.
            </p>
          </div>

          <div className="surface-card-muted p-8 md:p-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Technology philosophy</p>
            <h2 className="mt-4 font-serif text-3xl text-charcoal">Speed, accuracy, and transparency together</h2>
            <p className="mt-5 text-sm leading-relaxed text-charcoal-mid">
              We want verification to be fast enough for modern workflows, accurate enough to earn trust, and transparent enough to stand up to scrutiny. That means combining modular signals, evidence weighting, explainable outputs, and careful methodology versioning over time.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-charcoal-mid">
              We are also committed to acknowledging system limits clearly. Honest uncertainty is not a weakness. It is part of responsible verification.
            </p>
          </div>
        </div>
      </section>

      <section className="section-padding bg-parchment">
        <div className="content-container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <span className="eyebrow">Core Values</span>
            <h2 className="mt-4 font-serif text-3xl text-balance text-charcoal sm:text-4xl">
              What guides how we build.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {coreValues.map((item) => (
              <div key={item.title} className="surface-card p-6">
                <h3 className="font-serif text-xl text-charcoal">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-parchment-light">
        <div className="content-container grid gap-8 lg:grid-cols-2">
          <div className="surface-card p-8 md:p-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Commitment to transparency</p>
            <h2 className="mt-4 font-serif text-3xl text-charcoal">We want users to understand the result, not just receive it.</h2>
            <p className="mt-5 text-sm leading-relaxed text-charcoal-mid">
              Provance is being built around evidence summaries, report artifacts, methodology visibility, and language that respects the limits of detection. We aim to make it easier for a reviewer to understand how a conclusion was reached and when more review is needed.
            </p>
          </div>

          <div className="surface-card-muted p-8 md:p-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-charcoal-light">Who we build for</p>
            <ul className="feature-list mt-5 text-sm leading-relaxed text-charcoal-mid">
              {audiences.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <span className="eyebrow eyebrow-dark">The Future We Are Working Toward</span>
            <h2 className="mt-4 font-serif text-3xl text-balance sm:text-4xl">
              A platform organizations can rely on when authenticity becomes mission-critical.
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-stone">
              We see Provance evolving into a broader trust layer for image, video, audio, provenance, reporting, and enterprise-grade verification workflows. The long-term goal is not simply to detect AI-generated media. It is to help people make better decisions in a world where authenticity is no longer easy to judge.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/sample-report" className="btn-primary">
                Review the sample report
              </Link>
              <Link to="/resources" className="btn-secondary border-white/12 bg-white/[0.06] text-parchment">
                Explore resources
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
