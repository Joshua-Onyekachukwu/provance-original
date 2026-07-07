import AppStatePanel from '../../components/app/AppStatePanel.jsx'

const REPORT_AREAS = [
  'Verdict summary and confidence handling',
  'Evidence breakdown and metadata review',
  'Case timeline, identifiers, and export-ready structure',
]

export default function AppReportsPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Reports
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          Report review now has a dedicated destination
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          The application shell includes a stable home for case outputs, downloadable
          report structure, and future evidence drill-down views.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <AppStatePanel
          label="Empty"
          title="No reports are available yet"
          description="Once upload analysis is connected, this area will show verdict-ready records, report IDs, timestamps, and downloadable outputs."
        />

        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <h3 className="font-serif text-2xl text-charcoal">Report structure reserved</h3>
          <div className="mt-5 space-y-4">
            {REPORT_AREAS.map((area, index) => (
              <div
                key={area}
                className="rounded-2xl border border-stone-light bg-parchment px-4 py-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
                  Section {index + 1}
                </p>
                <p className="mt-2 text-sm text-charcoal">{area}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
