import AppStatePanel from '../../components/app/AppStatePanel.jsx'

const CONSTRAINTS = [
  'Image-first uploads are the immediate priority for the next workflow phase.',
  'Video handling will follow the same case-driven flow with audio references folded into the review record.',
  'Validation will enforce file type, size, and integrity checks before analysis starts.',
]

export default function AppUploadsPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-stone-light bg-white-warm p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.18em] text-charcoal-light">
          Upload workspace
        </p>
        <h2 className="mt-3 font-serif text-4xl text-charcoal">
          Media intake is staged for the next build step
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-charcoal-mid">
          The shell now reserves a dedicated upload area so the next phase can plug in
          real media handling, validation, storage, and job tracking without another
          navigation refactor.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <AppStatePanel
          label="Empty"
          title="No file is in review yet"
          description="Approved users land in a clear upload zero-state with room for constraints, intake guidance, and future progress tracking."
        />

        <section className="rounded-3xl border border-stone-light bg-white-warm p-6 shadow-sm">
          <h3 className="font-serif text-2xl text-charcoal">Phase-ready constraints</h3>
          <ul className="mt-5 space-y-4 text-sm leading-relaxed text-charcoal-mid">
            {CONSTRAINTS.map((constraint) => (
              <li key={constraint} className="rounded-2xl border border-stone-light bg-parchment px-4 py-3">
                {constraint}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
