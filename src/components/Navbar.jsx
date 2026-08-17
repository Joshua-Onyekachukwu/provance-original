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

const LUXE = [0.32, 0.72, 0, 1]

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

  useEffect(() => {
    // Lock body scroll while the full-screen menu is open.
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const isActive = (href) => {
    if (href.startsWith('/#')) return false
    return location.pathname === href
  }

  // Over the ink examination hero (home, unscrolled) the pill inverts to
  // dark glass with phosphor text; anywhere else it keeps the light paper
  // pill. The mobile overlay is always light — a paper panel over the dark
  // instrument reads as the printed case file.
  const isHome = location.pathname === '/'
  const darkTop = isHome && !scrolled && !mobileOpen

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex justify-center px-3 pt-3 md:px-6 md:pt-4 ${
        mobileOpen ? '' : 'pointer-events-none'
      }`}
    >
      <div
        className={`pointer-events-auto flex w-full max-w-6xl items-center justify-between rounded-full border px-4 py-2.5 transition-all duration-700 ease-luxe md:px-5 ${
          darkTop
            ? 'border-white/10 bg-ink/60 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.55)] backdrop-blur-xl'
            : scrolled || mobileOpen
              ? 'border-stone-light/80 bg-parchment/85 shadow-[0_18px_50px_-18px_rgba(19,22,29,0.18)] backdrop-blur-xl'
              : 'border-white/60 bg-parchment/40 backdrop-blur-md'
        }`}
      >
        <Link to="/" className="group flex items-center gap-2.5 py-1" aria-label="Provance home">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-500 ease-luxe group-hover:scale-105 ${
              darkTop
                ? 'bg-phosphor shadow-[0_10px_30px_rgba(0,0,0,0.5)]'
                : 'bg-charcoal shadow-[0_10px_30px_rgba(19,22,29,0.2)]'
            }`}
          >
            <span className={`text-sm font-display font-bold ${darkTop ? 'text-ink' : 'text-parchment'}`}>P</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className={`font-display text-[1.3rem] font-semibold tracking-tight ${darkTop ? 'text-phosphor' : 'text-charcoal'}`}>
              Provance
            </span>
            <span className={`hidden sm:block text-[10px] font-mono uppercase tracking-[0.22em] ${darkTop ? 'text-phosphor-faint' : 'text-charcoal-light'}`}>
              Evidence-first verification
            </span>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={`text-sm font-medium tracking-wide transition-colors duration-500 ease-luxe ${
                isActive(item.href)
                  ? darkTop
                    ? 'text-phosphor'
                    : 'text-charcoal'
                  : darkTop
                    ? 'text-phosphor-dim hover:text-phosphor'
                    : 'text-charcoal-mid hover:text-charcoal'
              }`}
            >
              {item.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              <Link
                to="/app"
                className={`text-sm tracking-wide transition-colors duration-500 ease-luxe ${
                  darkTop ? 'text-phosphor-dim hover:text-phosphor' : 'text-charcoal-mid hover:text-charcoal'
                }`}
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
                className={`text-sm tracking-wide transition-colors duration-500 ease-luxe ${
                  darkTop ? 'text-phosphor-dim hover:text-phosphor' : 'text-charcoal-mid hover:text-charcoal'
                }`}
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
          className="lg:hidden flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
        >
          <motion.span
            animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.4, ease: LUXE }}
            className={`block w-5 h-[1.5px] rounded ${darkTop ? 'bg-phosphor' : 'bg-charcoal'}`}
          />
          <motion.span
            animate={mobileOpen ? { opacity: 0, x: -8 } : { opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: LUXE }}
            className={`block w-5 h-[1.5px] rounded ${darkTop ? 'bg-phosphor' : 'bg-charcoal'}`}
          />
          <motion.span
            animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.4, ease: LUXE }}
            className={`block w-5 h-[1.5px] rounded ${darkTop ? 'bg-phosphor' : 'bg-charcoal'}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-navigation"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: LUXE }}
            className="pointer-events-auto absolute inset-x-3 top-[4.6rem] overflow-hidden rounded-[2rem] border border-stone-light/70 bg-parchment/95 shadow-[0_40px_90px_-30px_rgba(19,22,29,0.3)] backdrop-blur-2xl lg:hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-2">
              {NAV_ITEMS.map((item, i) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.05 * i, ease: LUXE }}
                >
                  <Link
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`inline-flex min-h-12 w-full items-center border-b border-stone-light/50 text-left text-lg font-medium transition-colors duration-500 ease-luxe ${
                      isActive(item.href) ? 'text-charcoal' : 'text-charcoal-mid hover:text-charcoal'
                    }`}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05 * NAV_ITEMS.length, ease: LUXE }}
                className="mt-6 flex flex-col gap-3"
              >
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/app"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex min-h-12 items-center text-base text-charcoal-mid hover:text-charcoal transition-colors duration-500 ease-luxe"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={signOut}
                      className="btn-secondary text-center"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/signin"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex min-h-12 items-center text-base text-charcoal-mid hover:text-charcoal transition-colors duration-500 ease-luxe"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/waitlist"
                      onClick={() => setMobileOpen(false)}
                      className="btn-primary text-center"
                    >
                      Join Early Access
                    </Link>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
