import {
  ArrowRight,
  ChevronRight,
  FileSearch,
  FileText,
  GanttChartSquare,
  Video,
  Activity,
  Binary,
  BadgeCheck,
  Newspaper,
  BriefcaseBusiness,
  ShieldCheck,
  ScanSearch,
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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

/* ── Reusable motion variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.15, 1], delay: i * 0.1 },
  }),
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.15 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.15, 1] },
  },
};

export default function Home() {
  return (
    <main>
      {/* ==============================
           HERO — Trust Infrastructure
      ============================== */}
      <section className="noise-overlay relative overflow-hidden px-6 pb-16 pt-14 lg:px-10 lg:pb-28 lg:pt-20">
        {/* Subtle ambient glow */}
        <div className="pointer-events-none absolute -top-48 right-0 h-[600px] w-[600px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-amber/5 blur-[100px]" />

        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          {/* ── Left column ── */}
          <motion.div
            className="space-y-8"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {/* Pill badge */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/8 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-accent"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Trust Infrastructure
            </motion.div>

            {/* Eyebrow */}
            <motion.p
              variants={fadeUp}
              className="max-w-3xl font-mono text-[11px] uppercase tracking-[0.28em] text-muted"
            >
              {primaryClaim}
            </motion.p>

            {/* Hero headline */}
            <motion.h1
              variants={fadeUp}
              className="max-w-4xl font-display text-5xl leading-[0.95] tracking-[-0.045em] text-[#17181a] md:text-6xl lg:text-[5.3rem]"
            >
              Evidence first.
              <br />
              Confidence second.
              <br />
              <span className="text-accent">Hype never.</span>
            </motion.h1>

            {/* Sub-support */}
            <motion.p
              variants={fadeUp}
              className="max-w-2xl text-lg leading-8 text-muted"
            >
              The fastest path from upload to defensible verdict —{" "}
              <span className="text-[#17181a]">image + video verification</span>{" "}
              with explainable evidence, downloadable forensic reports, and
              enterprise-ready trust workflows.
            </motion.p>

            {/* Trust pills */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap gap-2"
            >
              {trustPills.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-black/8 bg-white/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted"
                >
                  {pill}
                </span>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap gap-3"
            >
              <Link
                to="/signup?intent=demo"
                className="accent-button inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
              >
                Request Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/sample-report"
                className="soft-button inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm text-[#18191b]"
              >
                View Sample Report
                <ChevronRight className="h-4 w-4" />
              </Link>
            </motion.div>

            {/* Social proof micro */}
            <motion.div
              variants={fadeUp}
              className="flex items-center gap-4 text-xs text-muted"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Court-ready reports
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Forensic-grade evidence
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                C2PA-aware
              </span>
            </motion.div>
          </motion.div>

          {/* ── Right column: SignalVisualizer ── */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: [0.25, 0.1, 0.15, 1] }}
          >
            <div className="float-panel">
              <SignalVisualizer />
            </div>
            <motion.div
              className="absolute -top-4 -right-4 z-30"
              initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.8, ease: "backOut" }}
            >
              <VeracitySeal size={72} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ==============================
           TRUST BAR
      ============================== */}
      <motion.section
        className="border-y border-black/6 bg-[rgba(255,250,244,0.55)] px-6 py-5 lg:px-10"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">
            Trusted by teams verifying
          </span>
          {[
            ["Journalism", Newspaper],
            ["Legal", BriefcaseBusiness],
            ["Enterprise", ShieldCheck],
            ["Developers", ScanSearch],
          ].map(([label, Icon]) => (
            <span
              key={label as string}
              className="inline-flex items-center gap-2 text-sm text-[#3d4348]"
            >
              <Icon className="h-3.5 w-3.5 text-accent" />
              {label as string}
            </span>
          ))}
        </div>
      </motion.section>

      {/* ==============================
           WHY PROVANCE — standout claims
      ============================== */}
      <section className="bg-surface px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="max-w-3xl space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.32em] text-accent/70">
              Why Provance
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-display text-4xl leading-[1.02] tracking-[-0.03em] text-sand md:text-5xl"
            >
              Built for defensibility,
              <br />
              not detection theater.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="max-w-2xl text-base leading-8 text-zinc-400"
            >
              Every verdict is paired with signal-level reasoning, visible
              confidence language, and an uncertainty posture designed for
              high-trust decisions — not a black-box score.
            </motion.p>
          </motion.div>

          <motion.div
            className="mt-14 grid gap-5 lg:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {standoutClaims.map((item, index) => (
              <motion.article
                key={item.title}
                variants={fadeUp}
                custom={index}
                className="surface-card group rounded-[1.9rem] p-7 transition duration-300 hover:-translate-y-[2px] hover:border-accent/10 hover:bg-white/[0.04]"
              >
                <item.icon className="h-5 w-5 text-accent transition duration-300 group-hover:scale-110" />
                <h3 className="mt-5 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  {item.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==============================
           HOW IT WORKS
      ============================== */}
      <section className="bg-surface-soft px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="max-w-3xl space-y-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.32em] text-accent/70">
              How It Works
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="font-display text-4xl leading-[1.02] tracking-[-0.03em] text-sand md:text-5xl"
            >
              One calm flow from
              <br />
              upload to report.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="max-w-2xl text-base leading-8 text-zinc-400"
            >
              The interaction should feel composed and deliberate: upload, watch
              the analysis progress, review the reasoning, and move forward with
              a report that actually means something.
            </motion.p>
          </motion.div>

          <motion.div
            className="mt-14 grid gap-5 lg:grid-cols-3"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {howItWorks.map((item, index) => (
              <motion.article
                key={item.title}
                variants={scaleIn}
                className="surface-card rounded-[1.9rem] p-6"
              >
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Step 0{index + 1}
                </p>
                <item.icon className="mt-10 h-5 w-5 text-accent" />
                <h3 className="mt-5 text-2xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-400">
                  {item.description}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==============================
           USE CASES
      ============================== */}
      <section className="bg-surface px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="font-mono text-xs uppercase tracking-[0.32em] text-accent/70">
              Use Cases
            </motion.p>
            <motion.h2
              variants={fadeUp}
              className="mt-4 font-display text-4xl leading-[1.02] tracking-[-0.03em] text-sand md:text-5xl"
            >
              One platform,
              <br />
              different trust-critical workflows.
            </motion.h2>
          </motion.div>

          <motion.div
            className="mt-12 grid gap-5 lg:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {useCases.map((item) => (
              <motion.div key={item.title} variants={fadeUp}>
                <Link
                  to={item.to}
                  className="group surface-card block rounded-[1.9rem] p-7 transition duration-300 hover:-translate-y-[3px] hover:border-accent/10 hover:bg-white/[0.05]"
                >
                  <item.icon className="h-5 w-5 text-accent" />
                  <h3 className="mt-5 text-2xl font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    {item.description}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm text-zinc-300 transition group-hover:text-white">
                    Explore solution
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==============================
           PRICING
      ============================== */}
      <section className="bg-[rgba(255,248,241,0.72)] px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <SectionHeading
              eyebrow="Pricing Direction"
              title="Pricing should feel like product architecture, not a filler section."
              description="This section should tell a buyer exactly how Provance expands from first evaluation to operational adoption."
            />
          </motion.div>

          <motion.div
            className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <div className="grid gap-5 xl:grid-cols-2">
              {pricingTiers.map((tier, index) => (
                <motion.article
                  key={tier.name}
                  variants={fadeUp}
                  custom={index}
                  className={`${
                    tier.name === "Enterprise"
                      ? "surface-panel"
                      : "paper-card"
                  } rounded-[1.9rem] p-6 ${
                    index === 1 ? "ring-1 ring-accent/35" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`font-mono text-xs uppercase tracking-[0.22em] ${
                          tier.name === "Enterprise"
                            ? "text-accent/80"
                            : "text-muted"
                        }`}
                      >
                        {tier.name}
                      </p>
                      <p
                        className={`mt-5 font-display text-4xl ${
                          tier.name === "Enterprise"
                            ? "text-sand"
                            : "text-[#17181a]"
                        }`}
                      >
                        {tier.price}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${
                        tier.name === "Enterprise"
                          ? "border border-accent/20 bg-accent/10 text-accent"
                          : "border border-black/8 bg-white/65 text-muted"
                      }`}
                    >
                      {tier.badge}
                    </span>
                  </div>
                  <p
                    className={`mt-4 min-h-[72px] text-sm leading-7 ${
                      tier.name === "Enterprise"
                        ? "text-zinc-400"
                        : "text-[#5d6066]"
                    }`}
                  >
                    {tier.description}
                  </p>
                  <div className="mt-5 space-y-2">
                    {tier.features.map((feature) => (
                      <div
                        key={feature}
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          tier.name === "Enterprise"
                            ? "border border-white/8 bg-white/[0.04] text-zinc-200"
                            : "border border-black/8 bg-white/55 text-[#2d3338]"
                        }`}
                      >
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Link
                    to={tier.ctaTo}
                    className={`mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition duration-300 ${
                      tier.name === "Enterprise"
                        ? "border border-white/10 bg-white/[0.04] text-sand hover:border-accent/20 hover:bg-white/[0.08]"
                        : "soft-button text-[#17181a]"
                    }`}
                  >
                    {tier.ctaLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.article>
              ))}
            </div>

            <div className="space-y-5">
              <motion.div
                variants={fadeUp}
                className="paper-card rounded-[1.9rem] p-7"
              >
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-muted">
                  Commercial logic
                </p>
                <h3 className="mt-4 font-display text-3xl leading-tight text-[#17181a]">
                  Pricing should mirror how trust workflows actually expand.
                </h3>
                <div className="mt-6 space-y-4">
                  {pricingHighlights.map((item, index) => (
                    <div
                      key={item.title}
                      className="rounded-[1.4rem] border border-black/8 bg-white/60 p-4"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                        0{index + 1}
                      </p>
                      <h4 className="mt-2 text-base font-semibold text-[#17181a]">
                        {item.title}
                      </h4>
                      <p className="mt-2 text-sm leading-7 text-[#5d6066]">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="rounded-[1.9rem] border border-accent/20 bg-[linear-gradient(135deg,rgba(155,180,92,0.15),rgba(255,255,255,0.78))] p-7 shadow-[0_18px_40px_rgba(155,180,92,0.06)]"
              >
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
                  Recommended positioning
                </p>
                <p className="mt-4 text-base leading-8 text-[#3b3c3f]">
                  Lead with Pro as the serious self-serve plan, Team as the
                  operational workspace, and Enterprise as the trust-infrastructure
                  layer for API, governance, and procurement.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ==============================
           C.L.E.A.R. TRUST ANSWERS (FAQ)
      ============================== */}
      <section className="px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            <SectionHeading
              eyebrow={faqFramework.eyebrow}
              title={faqFramework.title}
              description={faqFramework.description}
            />
          </motion.div>

          <motion.div
            className="mt-6 rounded-[1.6rem] border border-accent/20 bg-accent/8 px-5 py-4 text-sm leading-7 text-[#4a5a2e]"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            C.L.E.A.R. stands for{" "}
            <span className="font-semibold text-[#2d3a1c]">
              Clarity, Limits, Evidence, Access, and Reliability
            </span>{" "}
            — a trust memo, not a generic FAQ dump.
          </motion.div>

          <motion.div
            className="mt-12 grid gap-5 lg:grid-cols-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={stagger}
          >
            {faqs.map((item) => (
              <motion.article
                key={item.question}
                variants={fadeUp}
                className="paper-card rounded-[1.9rem] p-6 transition duration-200 hover:shadow-[0_28px_70px_rgba(31,26,18,0.1)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold text-[#17181a]">
                    {item.question}
                  </h3>
                  <span className="shrink-0 rounded-full border border-accent/20 bg-accent/8 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                    {item.tag}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-[#5d6066]">
                  {item.answer}
                </p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ==============================
           FINAL CTA
      ============================== */}
      <motion.section
        className="px-6 pb-28 pt-10 lg:px-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.15, 1] }}
      >
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-accent/10 bg-[linear-gradient(135deg,rgba(155,180,92,0.15),rgba(255,255,255,0.54),rgba(255,248,240,0.7))] p-8 shadow-[0_24px_70px_rgba(31,26,18,0.08)] lg:p-12">
          <p className="font-mono text-xs uppercase tracking-[0.32em] text-muted">
            Final CTA
          </p>
          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-4xl font-display text-4xl leading-tight text-[#17181a] md:text-5xl">
              Move from uncertainty to something your team can actually trust,
              export, and act on.
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/signup?intent=demo"
                className="accent-button inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
              >
                Request Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/docs"
                className="soft-button inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm text-[#17181a]"
              >
                Explore API Path
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  );
}
