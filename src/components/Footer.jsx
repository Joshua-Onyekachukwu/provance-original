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
    <footer className="border-t border-stone-light bg-charcoal text-stone">
      <div className="content-container px-6 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-md bg-parchment flex items-center justify-center">
                <span className="text-charcoal text-sm font-serif font-bold">P</span>
              </div>
              <span className="font-serif text-xl text-parchment font-medium tracking-tight">Provance</span>
            </div>
            <p className="text-stone text-sm leading-relaxed max-w-sm">
              Trust infrastructure for reviewing suspicious media with explainable
              evidence, report-ready outputs, and high-trust workflows.
            </p>
          </div>
          <div>
            <h4 className="text-parchment text-sm font-medium mb-4">Product</h4>
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
            <h4 className="text-parchment text-sm font-medium mb-4">Company</h4>
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
            <h4 className="text-parchment text-sm font-medium mb-4">Resources</h4>
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
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-stone/60">
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
