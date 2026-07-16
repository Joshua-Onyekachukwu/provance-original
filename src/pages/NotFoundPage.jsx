import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="pt-20 md:pt-24">
      <section className="section-padding bg-parchment relative overflow-hidden">
        <div className="absolute inset-0 forensic-grid opacity-30" />
        <div className="content-container relative z-10 max-w-3xl text-center">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl text-charcoal">
            This page could not be found.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-charcoal-mid">
            The link may be outdated, or the page may have moved while the public site is
            being refined.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/"
              className="btn-primary"
            >
              Back to homepage
            </Link>
            <Link
              to="/resources"
              className="btn-secondary"
            >
              View resources
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
