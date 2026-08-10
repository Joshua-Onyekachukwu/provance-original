import { motion } from 'framer-motion'
import PageHero from '../components/PageHero.jsx'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: 0.08 * i, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

// ---------------------------------------------------------------------------
// Real data — sourced from the shipped benchmark assets in /public/benchmark:
// BENCHMARK_REPORT_V0.1.md (metrics) and PROVANCE_1000_CATALOG_GOLD.json
// (catalog distribution). No invented numbers.
// ---------------------------------------------------------------------------

const METRICS = [
  {
    label: 'Trust-Weighted Accuracy',
    standard: 0.79,
    provance: 1.0,
    format: (v) => v.toFixed(2),
    higherIsBetter: true,
    note: 'Correct verdicts, weighted by confidence',
  },
  {
    label: 'False Positive Rate',
    standard: 7.5,
    provance: 0.0,
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: false,
    note: 'Authentic media flagged as synthetic',
  },
  {
    label: 'Confident Wrong Results',
    standard: 4,
    provance: 0,
    format: (v) => `${v}`,
    higherIsBetter: false,
    note: 'High-confidence but incorrect verdicts',
  },
  {
    label: 'Explainability Score',
    standard: 0.0,
    provance: 1.0,
    format: (v) => v.toFixed(1),
    higherIsBetter: true,
    note: 'Signal-based reasoning vs. opaque score',
  },
]

const CATALOG_TYPES = [
  { label: 'Authentic', value: 40, tone: 'bg-emerald-500' },
  { label: 'Synthetic', value: 40, tone: 'bg-amber' },
  { label: 'Manipulated', value: 20, tone: 'bg-rose-500' },
]

const CATALOG_TIERS = [
  {
    label: 'Tier 1 · Standard',
    value: 64,
    desc: 'Clean, unambiguous samples used for baseline calibration.',
  },
  {
    label: 'Tier 2 · Difficult',
    value: 16,
    desc: 'Compression, noise, and occlusion intended to stress detectors.',
  },
  {
    label: 'Tier 3 · Adversarial',
    value: 20,
    desc: 'High-fidelity generator outputs targeting hard negatives.',
  },
]

const CATALOG_SOURCES = [
  { label: 'Pexels / Unsplash', value: 30 },
  { label: 'Research / In-house', value: 20 },
  { label: 'Kling AI', value: 13 },
  { label: 'Unsplash', value: 10 },
  { label: 'DALL-E 3', value: 9 },
  { label: 'Midjourney v6', value: 8 },
  { label: 'Flux.1', value: 5 },
  { label: 'Sora', value: 5 },
]

const CATALOG_FORMATS = [
  { label: 'JPEG', value: 60 },
  { label: 'PNG', value: 40 },
]

const RAW_FILES = [
  { label: 'V0.1 report (md)', href: '/benchmark/gold/BENCHMARK_REPORT_V0.1.md' },
  { label: 'Gold catalog (json)', href: '/benchmark/gold/PROVANCE_1000_CATALOG_GOLD.json' },
  { label: 'Ground truth (csv)', href: '/benchmark/gold/GROUND_TRUTH.csv' },
  { label: 'Dataset README (md)', href: '/benchmark/gold/README_V0.2.md' },
]

// ---------------------------------------------------------------------------
// Chart — grouped comparison bars (self-hosted CSS, no chart library)
// ---------------------------------------------------------------------------

function ComparisonBar({ metric, index }) {
  const max = Math.max(metric.standard, metric.provance, 0.0001)
  const standardPct = (metric.standard / max) * 100
  const provancePct = (metric.provance / max) * 100
  const improved = metric.higherIsBetter
    ? metric.provance > metric.standard
    : metric.provance < metric.standard

  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className="rounded-2xl border border-stone-light bg-white-warm/85 p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-serif text-base text-charcoal">{metric.label}</p>
        {improved && (
          <span className="rounded-full border border-emerald-500/25 bg-emerald-50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-700">
            Improved
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-charcoal-mid">{metric.note}</p>

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-charcoal-mid">Standard detector</span>
            <span className="font-mono tabular-nums text-charcoal-mid">
              {metric.format(metric.standard)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-stone-light/80">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${standardPct}%` }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-2.5 rounded-full bg-stone"
            />
          </div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-charcoal">Provance V0.1</span>
            <span className="font-mono tabular-nums text-trust-strong">
              {metric.format(metric.provance)}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-stone-light/80">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${provancePct}%` }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-2.5 rounded-full bg-gradient-to-r from-trust to-trust-strong"
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Catalog primitives
// ---------------------------------------------------------------------------

function TypeBreakdown() {
  const total = CATALOG_TYPES.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="rounded-2xl border border-stone-light bg-white-warm/85 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
        Ground-truth composition
      </p>
      <p className="mt-2 font-serif text-xl text-charcoal">How the 100 gold assets split.</p>

      <div className="mt-5 flex h-3.5 w-full overflow-hidden rounded-full bg-stone-light/70">
        {CATALOG_TYPES.map((item) => (
          <motion.div
            key={item.label}
            initial={{ width: 0 }}
            whileInView={{ width: `${(item.value / total) * 100}%` }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
            className={`h-3.5 ${item.tone}`}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {CATALOG_TYPES.map((item) => (
          <div key={item.label} className="rounded-xl border border-stone-light bg-parchment/70 p-3">
            <p className="font-serif text-2xl tabular-nums text-charcoal">{item.value}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-charcoal-mid">
              <span className={`h-1.5 w-1.5 rounded-full ${item.tone}`} />
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 border-t border-stone-light pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-charcoal-light">
        Format split · JPEG {CATALOG_FORMATS[0].value} / PNG {CATALOG_FORMATS[1].value}
      </p>
    </div>
  )
}

function SourceBreakdown() {
  const max = Math.max(...CATALOG_SOURCES.map((item) => item.value))

  return (
    <div className="rounded-2xl border border-stone-light bg-white-warm/85 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
        Source distribution
      </p>
      <p className="mt-2 font-serif text-xl text-charcoal">Where the assets came from.</p>

      <div className="mt-5 space-y-3">
        {CATALOG_SOURCES.map((item, index) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-charcoal-mid">{item.label}</span>
              <span className="font-mono tabular-nums text-charcoal">{item.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-stone-light/80">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${(item.value / max) * 100}%` }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8, delay: 0.05 * index, ease: [0.25, 0.1, 0.25, 1] }}
                className="h-2 rounded-full bg-amber/80"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function BenchmarkPage() {
  return (
    <div className="pt-20 md:pt-24">
      <PageHero
        eyebrow="Open Benchmark · Published"
        title="Measured against the status quo — and published."
        description="Every number on this page traces to the Provance-1000 gold dataset shipped with the product. No black boxes, no unverifiable claims: inspect the methodology, the catalog, and the results yourself."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Benchmark' }]}
        meta={[
          { label: 'Baseline', value: 'Standard ResNet / ViT binary detector' },
          { label: 'Dataset', value: 'Provance-1000 · Gold subset · 100 assets' },
          { label: 'Released', value: 'V0.1 · 2026-06-26' },
        ]}
      />

      {/* Executive summary */}
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="content-container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="mx-auto mb-14 max-w-2xl text-center"
          >
            <motion.span variants={fadeUp} className="eyebrow">
              Executive Summary
            </motion.span>
            <motion.h2
              variants={fadeUp}
              className="mt-5 font-serif text-3xl text-balance text-charcoal sm:text-4xl"
            >
              The <span className="italic text-amber">honesty gap</span>, measured.
            </motion.h2>
            <motion.p
              variants={fadeUp}
              className="mt-5 text-base leading-relaxed text-charcoal-mid"
            >
              Standard models forced a binary Real/Fake choice for nearly every asset — and got
              confidently wrong on compressed media and SOTA generators. Provance's weighted
              multi-signal algorithm held Trust-Weighted Accuracy at 1.00 on the gold subset.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric, i) => {
              const improved = metric.higherIsBetter
                ? metric.provance > metric.standard
                : metric.provance < metric.standard
              return (
                <motion.div
                  key={metric.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="surface-card p-5"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                    {metric.label}
                  </p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-serif text-4xl tabular-nums text-charcoal">
                      {metric.format(metric.provance)}
                    </span>
                    {improved && (
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.16em] text-emerald-700"
                        aria-label={`Improved from ${metric.format(metric.standard)}`}
                      >
                        {metric.higherIsBetter ? '▲' : '▼'}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-charcoal-mid">
                    Standard: {metric.format(metric.standard)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Results chart */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <motion.span variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="eyebrow eyebrow-dark">
              Results Chart
            </motion.span>
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-5 font-serif text-3xl text-balance sm:text-4xl">
              Standard detector vs. <span className="italic text-amber">Provance V0.1</span>.
            </motion.h2>
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-5 text-base leading-relaxed text-stone">
              Four headline metrics from the V0.1 report, normalized to the better
              performer per row. Raw values are printed beside each bar.
            </motion.p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {METRICS.map((metric, i) => (
              <ComparisonBar key={metric.label} metric={metric} index={i} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Error analysis */}
      <section className="section-padding bg-parchment-light relative overflow-hidden">
        <div className="content-container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <motion.span variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="eyebrow">
              Error Analysis
            </motion.span>
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-5 font-serif text-3xl text-balance text-charcoal sm:text-4xl">
              Where standard detectors <span className="italic text-rose-600">get it wrong</span>.
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {[
              {
                title: 'Failures on MJ v6 / Flux.1',
                desc: "Standard models missed high-fidelity synthetic textures, calling them real with high confidence. Provance's generative-fingerprint layer catches the model signatures these generators leave behind.",
                tone: 'bg-rose-500',
              },
              {
                title: 'Failures on compressed authentic',
                desc: 'Heavy JPEG artifacts were flagged as generative noise. Provance downgraded these to Authentic or Inconclusive when metadata forensics (20% weight) and C2PA checks (10% weight) found no generative fingerprint.',
                tone: 'bg-amber',
              },
              {
                title: 'Zero forced verdicts',
                desc: 'Standard models committed to Real or Fake for nearly every asset. Provance correctly held 0 assets as Inconclusive when signals disagreed — protecting newsrooms from citing false results.',
                tone: 'bg-emerald-500',
              },
              {
                title: 'Signal convergence, not a single score',
                desc: 'Rather than one pixel-level probability, Provance weighs multiple forensic layers and only commits when signals converge. That is why TWA holds at 1.00 while explainability stays at 1.0.',
                tone: 'bg-trust',
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="surface-card p-6"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${item.tone}`} />
                  <h3 className="font-serif text-lg text-charcoal">{item.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog breakdown */}
      <section id="catalog" className="section-padding bg-parchment relative overflow-hidden">
        <div className="content-container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <motion.span variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="eyebrow">
              Provance-1000 Catalog
            </motion.span>
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-5 font-serif text-3xl text-balance text-charcoal sm:text-4xl">
              The gold subset, <span className="italic text-trust">inspectable</span>.
            </motion.h2>
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-5 text-base leading-relaxed text-charcoal-mid">
              The shipped catalog holds 100 gold assets across three ground-truth types and
              three difficulty tiers. The full breakdown below is computed from the catalog
              JSON shipped with the site.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <TypeBreakdown />

            <div className="grid gap-5">
              <div className="rounded-2xl border border-stone-light bg-white-warm/85 p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-charcoal-light">
                  Difficulty tiers
                </p>
                <div className="mt-4 space-y-3">
                  {CATALOG_TIERS.map((tier, i) => (
                    <motion.div
                      key={tier.label}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.06 }}
                      className="flex items-center gap-4 rounded-xl border border-stone-light bg-parchment/70 px-4 py-3"
                    >
                      <span className="w-10 shrink-0 font-serif text-2xl tabular-nums text-charcoal">
                        {tier.value}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-charcoal">{tier.label}</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-charcoal-mid">
                          {tier.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <SourceBreakdown />
            </div>
          </div>

          {/* V0.2 expansion */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-8 rounded-[1.75rem] border border-amber/20 bg-amber-subtle/60 p-6 md:p-8"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
                  V0.2 Expansion · Documented
                </p>
                <h3 className="mt-3 font-serif text-2xl text-charcoal">
                  The adversarial catalog is expanding toward 500 assets.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
                  The V0.2 dataset plan adds 200 high-fidelity synthetic assets (Flux.1,
                  Kling AI, Sora — ids PROV-G-101 to 300) and 200 difficult authentic assets
                  built from heavy social-media compression, noise, and motion blur
                  (ids PROV-G-301 to 500).
                </p>
              </div>
              <a
                href="/benchmark/gold/README_V0.2.md"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber/25 bg-white-warm px-5 py-3 text-sm font-medium text-charcoal transition hover:border-amber/45"
              >
                Read the V0.2 notes
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Raw data access */}
      <section className="section-padding bg-charcoal text-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-[0.04]" />
        <div className="content-container relative z-10">
          <div className="max-w-2xl">
            <motion.span variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="eyebrow eyebrow-dark">
              Full Transparency
            </motion.span>
            <motion.h2 variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-5 font-serif text-3xl text-balance sm:text-4xl">
              Don't take our word for it.
            </motion.h2>
            <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-5 text-base leading-relaxed text-stone">
              The raw report, catalog, and ground truth ship with the product. Download them
              and run your own evaluation.
            </motion.p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {RAW_FILES.map((file, i) => (
              <motion.a
                key={file.href}
                href={file.href}
                variants={fadeUp}
                custom={i}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 transition hover:border-amber/30 hover:bg-white/[0.07]"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-stone group-hover:text-parchment">
                  {file.label}
                </span>
                <svg className="h-4 w-4 shrink-0 text-stone/70 transition group-hover:text-amber" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </section>
    </div>
  )
}
