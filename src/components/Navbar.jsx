import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Product', href: '/product' },
  { label: 'Methodology', href: '/methodology' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Sample Report', href: '/sample-report' },
  { label: 'Security', href: '/security' },
  { label: 'Contact', href: '/contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { isAuthenticated, signOut } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const isActive = (href) => {
    if (href.startsWith('/#')) return false
    return location.pathname === href
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-parchment/85 backdrop-blur-xl border-b border-stone-light shadow-[0_10px_35px_rgba(19,22,29,0.06)]'
          : 'bg-transparent'
      }`}
    >
      <div className="content-container flex items-center justify-between h-16 md:h-20 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-charcoal shadow-[0_10px_30px_rgba(19,22,29,0.18)]">
            <span className="text-parchment text-sm font-serif font-semibold">P</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-serif text-[1.3rem] text-charcoal font-semibold tracking-tight">Provance</span>
            <span className="hidden sm:block text-[10px] font-mono uppercase tracking-[0.22em] text-charcoal-light">
              Evidence-first verification
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                isActive(item.href) ? 'text-charcoal' : 'text-charcoal-mid hover:text-charcoal'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                to="/app"
                className="text-sm tracking-wide text-charcoal-mid hover:text-charcoal transition-colors duration-200"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="btn-secondary ml-1 px-5 py-2.5"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="text-sm tracking-wide text-charcoal-mid hover:text-charcoal transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/waitlist"
                className="btn-primary ml-1 px-5 py-2.5"
              >
                Join Early Access
              </Link>
            </>
          )}
        </nav>

        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <motion.span animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }} className="block w-5 h-[1.5px] bg-charcoal rounded" />
          <motion.span animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }} className="block w-5 h-[1.5px] bg-charcoal rounded" />
          <motion.span animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }} className="block w-5 h-[1.5px] bg-charcoal rounded" />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-navigation"
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
                  className={`text-base font-medium transition-colors ${
                    isActive(item.href) ? 'text-charcoal' : 'text-charcoal-mid hover:text-charcoal'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <>
                  <Link
                    to="/app"
                    className="text-base text-charcoal-mid hover:text-charcoal transition-colors"
                  >
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="btn-secondary mt-2 text-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/signin"
                    className="text-base text-charcoal-mid hover:text-charcoal transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/waitlist"
                    className="btn-primary mt-2 text-center"
                  >
                    Join Early Access
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
