import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Product', href: '/product' },
  { label: 'Methodology', href: '/methodology' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'Security', href: '/security' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isActive = (href) => {
    if (href.startsWith('/#')) return false
    return location.pathname === href
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-parchment/85 backdrop-blur-xl border-b border-stone-light'
          : 'bg-transparent'
      }`}
    >
      <div className="content-container flex items-center justify-between h-16 md:h-20 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-md bg-charcoal flex items-center justify-center">
            <span className="text-parchment text-sm font-serif font-bold">P</span>
          </div>
          <span className="font-serif text-xl text-charcoal font-medium tracking-tight">Provance</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`text-sm tracking-wide transition-colors duration-200 ${
                isActive(item.href) ? 'text-charcoal font-medium' : 'text-charcoal-mid hover:text-charcoal'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/#demo"
            className="ml-2 px-5 py-2.5 bg-charcoal text-parchment text-sm font-medium rounded-lg hover:bg-charcoal-soft transition-all duration-200 tracking-wide"
          >
            Request Demo
          </Link>
        </nav>

        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <motion.span animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="block w-5 h-[1.5px] bg-charcoal rounded" />
          <motion.span animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }} className="block w-5 h-[1.5px] bg-charcoal rounded" />
          <motion.span animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="block w-5 h-[1.5px] bg-charcoal rounded" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-parchment/95 backdrop-blur-xl border-b border-stone-light overflow-hidden"
          >
            <div className="px-6 py-6 flex flex-col gap-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`text-base transition-colors ${
                    isActive(item.href) ? 'text-charcoal font-medium' : 'text-charcoal-mid hover:text-charcoal'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/#demo" onClick={() => setMobileOpen(false)} className="mt-2 px-5 py-3 bg-charcoal text-parchment text-sm font-medium rounded-lg text-center">
                Request Demo
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
