import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10 max-w-3xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-amber">
            404
          </p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl lg:text-6xl text-charcoal">
            This page could not be found.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-charcoal-mid">
            The link may be outdated, or the page may have moved while the public site is
            being refined.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/"
              className="inline-flex px-6 py-3 bg-charcoal text-parchment font-medium text-sm rounded-xl hover:bg-charcoal-soft transition-all duration-200"
            >
              Back to homepage
            </Link>
            <Link
              to="/resources"
              className="inline-flex px-6 py-3 border border-stone text-charcoal font-medium text-sm rounded-xl hover:border-charcoal/30 transition-all duration-200"
            >
              View resources
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
