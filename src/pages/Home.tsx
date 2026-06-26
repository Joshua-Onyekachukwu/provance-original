import { ArrowRight, ChevronRight, Cpu, DatabaseZap, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import SignalVisualizer from "@/components/forensic/SignalVisualizer";
import VeracitySeal from "@/components/forensic/VeracitySeal";
import { SectionHeading } from "@/components/marketing/SectionHeading";
import {
  faqs,
  faqFramework,
  howItWorks,
  pricingHighlights,
  pricingTiers,
  primaryClaim,
  standoutClaims,
  trustPills,
  useCases,
} from "@/data/siteContent";

export default function Home() {
  return (
    <main>
      {/* ── Hero: Trust Engine ── */}
      <section className="noise-overlay px-6 pb-16 pt-14 lg:px-10 lg:pb-24 lg:pt-20">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="section-fade space-y-8">
            <div className="paper-card inline-flex rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-[#6f6658]">
              Premium trust infrastructure
            </div>
            <div className="space-y-6">
              <p className="max-w-3xl font-mono text-[11px] uppercase tracking-[0.28em] text-[#7b7569]">
                {primaryClaim}
              </p>
              <h1 className="max-w-4xl font-display text-5xl leading-[0.98] tracking-[-0.045em] text-[#17181a] md:text-6xl lg:text-[5.3rem]">
                Evidence first. Confidence second. Hype never.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#555a61]">
                Provance gives high-trust teams a cleaner way to verify image and video, understand why a result was reached, and move forward with a report that feels credible enough to be shared.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-[#5c6066]">
                <span className="rounded-full border border-orange-200/60 bg-orange-100/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8b5d2e]">
                  forensic-grade
                </span>
                <span className="rounded-full border border-black/8 bg-white/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em]">
                  report-grade outputs
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup?intent=demo"
                className="accent-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
              >
                Request Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sample-report"
                className="soft-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm text-[#18191b]"
              >
                View Sample Report
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustPills.map((pill, index) => (
                <div
                  key={pill}
                  className={`paper-card section-fade rounded-[1.4rem] px-4 py-4 text-sm text-[#3d4348] ${index > 1 ? "section-fade-delay-1" : ""}`}
                >
                  {pill}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Signal Visualizer */}
          <div className="section-fade section-fade-delay-1 relative">
            <SignalVisualizer />
            <div className="absolute -top-3 -right-3 z-30">
              <VeracitySeal size={72} />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-black/6 bg-[rgba(255,250,244,0.55)] px-6 py-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-3">
          {trustPills.map((pill) => (
            <span
              key={pill}
              className="rounded-full border border-black/8 bg-white/55 px-4 py-2 font-mono text-xs uppercase tracking-[0.22em] text-[#4b5257]"
            >
              {pill}
            </span>
          ))}
        </div>
      </section>

      <section className="px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Why It Lands"
            title="Built to read like a premium product, not a synthetic-media gimmick."
            description="The visual story needs to signal taste, restraint, and seriousness before the buyer even reads the technical details."
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {standoutClaims.map((item, index) => (
              <article
                key={item.title}
                className={`surface-card section-fade rounded-[1.9rem] p-7 ${index % 2 === 1 ? "section-fade-delay-1" : ""}`}
              >
                <item.icon className="h-5 w-5 text-lime-100" />
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#181a1e] px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.32em] text-lime-100/70">How It Works</p>
            <h2 className="font-display text-4xl leading-[1.02] tracking-[-0.03em] text-[#f2ede3] md:text-5xl">
              One calm flow from upload to report.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-zinc-400">
              The interaction should feel composed and deliberate: upload, watch the analysis progress, review the reasoning, and move forward with a report that actually means something.
            </p>
          </div>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {howItWorks.map((item, index) => (
              <article key={item.title} className="surface-card rounded-[1.9rem] p-6">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">Step 0{index + 1}</p>
                <item.icon className="mt-10 h-5 w-5 text-lime-100" />
                <h3 className="mt-5 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── All remaining sections unchanged ── */}
      <section className="px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Use Cases"
            title="One platform, different trust-critical workflows."
            description="Each buyer should see their world reflected back to them, not be forced through generic AI platform copy."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {useCases.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="group surface-card rounded-[1.9rem] p-7 transition duration-300 hover:-translate-y-[3px] hover:border-lime-300/20 hover:bg-white/[0.05]"
              >
                <item.icon className="h-5 w-5 text-lime-100" />
                <h3 className="mt-5 text-2xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">{item.description}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-300 transition group-hover:text-white">
                  Explore solution
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[rgba(255,248,241,0.72)] px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Pricing Direction"
            title="Pricing should feel like product architecture, not a filler section."
            description="This section should tell a buyer exactly how Provance expands from first evaluation to operational adoption."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-5 xl:grid-cols-2">
              {pricingTiers.map((tier, index) => (
                <article
                  key={tier.name}
                  className={`${tier.name === "Enterprise" ? "surface-panel" : "paper-card"} rounded-[1.9rem] p-6 ${index === 1 ? "ring-1 ring-orange-300/35" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`font-mono text-xs uppercase tracking-[0.22em] ${tier.name === "Enterprise" ? "text-orange-200/80" : "text-[#7b7569]"}`}>
                        {tier.name}
                      </p>
                      <p className={`mt-5 font-display text-4xl ${tier.name === "Enterprise" ? "text-sand" : "text-[#17181a]"}`}>{tier.price}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${tier.name === "Enterprise" ? "border border-orange-300/20 bg-orange-300/10 text-orange-100" : "border border-black/8 bg-white/65 text-[#7b7569]"}`}>
                      {tier.badge}
                    </span>
                  </div>
                  <p className={`mt-4 min-h-[72px] text-sm leading-7 ${tier.name === "Enterprise" ? "text-zinc-400" : "text-[#5d6066]"}`}>
                    {tier.description}
                  </p>
                  <div className="mt-5 space-y-2">
                    {tier.features.map((feature) => (
                      <div key={feature} className={`rounded-2xl px-4 py-3 text-sm ${tier.name === "Enterprise" ? "border border-white/8 bg-white/[0.04] text-zinc-200" : "border border-black/8 bg-white/55 text-[#2d3338]"}`}>
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Link
                    to={tier.ctaTo}
                    className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition duration-300 ${tier.name === "Enterprise" ? "border border-white/10 bg-white/[0.04] text-[#f2ede3] hover:border-orange-300/20 hover:bg-white/[0.08]" : "soft-button text-[#17181a]"}`}
                  >
                    {tier.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </article>
              ))}
            </div>
            <div className="space-y-5">
              <div className="paper-card rounded-[1.9rem] p-7">
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#7b7569]">Commercial logic</p>
                <h3 className="mt-4 font-display text-3xl leading-tight text-[#17181a]">Pricing should mirror how trust workflows actually expand.</h3>
                <div className="mt-6 space-y-4">
                  {pricingHighlights.map((item, index) => (
                    <div key={item.title} className="rounded-[1.4rem] border border-black/8 bg-white/60 p-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#a0642f]">0{index + 1}</p>
                      <h4 className="mt-2 text-base font-semibold text-[#17181a]">{item.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-[#5d6066]">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[1.9rem] border border-orange-200/60 bg-[linear-gradient(135deg,rgba(247,174,88,0.18),rgba(255,255,255,0.78))] p-7 shadow-[0_18px_40px_rgba(214,137,56,0.08)]">
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#a0642f]">Recommended positioning</p>
                <p className="mt-4 text-base leading-8 text-[#3b3c3f]">
                  Lead with Pro as the serious self-serve plan, Team as the operational workspace, and Enterprise as the trust-infrastructure layer for API, governance, and procurement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow={faqFramework.eyebrow}
            title={faqFramework.title}
            description={faqFramework.description}
          />
          <div className="mt-6 rounded-[1.6rem] border border-orange-200/60 bg-orange-100/50 px-5 py-4 text-sm leading-7 text-[#6f5737]">
            C.L.E.A.R. stands for <span className="font-semibold text-[#3e3122]">Clarity, Limits, Evidence, Access, and Reliability</span> so the section feels like a trust memo instead of a generic FAQ dump.
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {faqs.map((item) => (
              <article key={item.question} className="paper-card rounded-[1.9rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-[#17181a]">{item.question}</h3>
                  <span className="rounded-full border border-orange-200/60 bg-orange-100/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#9a6330]">
                    {item.tag}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#5d6066]">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-10 lg:px-10">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-black/8 bg-[linear-gradient(135deg,rgba(155,180,92,0.18),rgba(255,255,255,0.54),rgba(255,248,240,0.7))] p-8 shadow-[0_24px_70px_rgba(31,26,18,0.08)] lg:p-12">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#6e6659]">Final CTA</p>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-4xl font-display text-4xl leading-tight text-[#17181a] md:text-5xl">
              Move from uncertainty to something your team can actually trust, export, and act on.
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link to="/signup?intent=demo" className="accent-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold">
                Request Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/docs" className="soft-button inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm text-[#17181a]">
                Explore API Path
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
