import { Link } from 'react-router-dom'

const productLinks = [
  { label: 'Product', href: '/product' },
  { label: 'Methodology', href: '/methodology' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Sample Report', href: '/sample-report' },
]

const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'Waitlist', href: '/waitlist' },
  { label: 'Sign In', href: '/signin' },
]

const resourceLinks = [
  { label: 'Docs', href: '/docs' },
  { label: 'Security', href: '/security' },
  { label: 'Resources', href: '/resources' },
]

const legalLinks = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
  { label: 'Cookies Policy', href: '/cookies' },
]

export default function Footer() {
  return (
    <footer className="border-t border-white/8 bg-charcoal text-stone">
      <div className="content-container px-6 py-12 md:py-16">
        <div className="mb-10 rounded-[1.75rem] border border-white/8 bg-white/[0.03] px-6 py-6 md:px-8 md:py-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-trust-soft">
                Ready for early access?
              </p>
              <h2 className="mt-3 font-serif text-2xl text-parchment sm:text-3xl">
                Bring evidence-first verification into your workflow.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone">
                Join the waitlist for controlled rollout access or start a commercial conversation
                if your team needs a faster path.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/waitlist" className="btn-primary">
                Join Early Access
              </Link>
              <Link to="/contact" className="btn-secondary border-white/12 bg-white/[0.06] text-parchment">
                Request Demo
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-parchment shadow-[0_10px_25px_rgba(0,0,0,0.18)]">
                <span className="text-charcoal text-sm font-serif font-semibold">P</span>
              </div>
              <div>
                <span className="font-serif text-xl text-parchment font-medium tracking-tight">Provance</span>
                <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.22em] text-trust-soft">
                  Trust infrastructure for media verification
                </p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-stone">
              Built for teams that need explainable evidence, professional reports, and a
              more defensible path to reviewing suspicious media.
            </p>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-parchment">Product</h4>
            <ul className="space-y-2.5">
              {productLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-stone text-sm hover:text-parchment transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-parchment">Company</h4>
            <ul className="space-y-2.5">
              {companyLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-stone text-sm hover:text-parchment transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-4 text-sm font-semibold text-parchment">Resources</h4>
            <ul className="space-y-2.5">
              {resourceLinks.map((item) => (
                <li key={item.href}>
                  <Link to={item.href} className="text-stone text-sm hover:text-parchment transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-stone/60 sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; 2026 Provance. All rights reserved.</span>
          <div className="flex gap-6">
            {legalLinks.map((item) => (
              <Link key={item.href} to={item.href} className="hover:text-parchment transition-colors">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
