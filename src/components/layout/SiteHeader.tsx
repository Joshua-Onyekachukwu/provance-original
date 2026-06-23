import { useState } from 'react'
import { Menu, ShieldCheck } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { navigation } from '@/data/siteContent'

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-black/6 bg-[rgba(243,238,228,0.78)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link to="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.18em] text-[#161718]">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/8 bg-black/[0.03] text-[#161718] shadow-[0_10px_30px_rgba(22,24,27,0.06)]">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span>
            PROVANCE
            <span className="mt-1 block font-mono text-[10px] tracking-[0.26em] text-zinc-500">
              TRUST INFRASTRUCTURE
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-zinc-400 lg:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `transition duration-300 hover:text-[#161718] ${isActive ? 'text-[#161718]' : 'text-zinc-500'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/signin"
            className="soft-button rounded-full px-4 py-2 text-sm text-[#161718]"
          >
            Sign In
          </Link>
          <Link
            to="/signup?intent=demo"
            className="accent-button rounded-full px-4 py-2 text-sm font-semibold"
          >
            Request Demo
          </Link>
        </div>

        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8 text-[#161718] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-black/8 px-6 py-4 lg:hidden">
          <nav className="space-y-3 text-sm text-[#161718]">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsOpen(false)}
                className="paper-card block rounded-2xl px-4 py-3 transition duration-300 hover:border-black/12"
              >
                {item.label}
              </NavLink>
            ))}
            <div className="grid gap-3 pt-2">
              <Link
                to="/signin"
                onClick={() => setIsOpen(false)}
                className="soft-button rounded-2xl px-4 py-3 text-center"
              >
                Sign In
              </Link>
              <Link
                to="/signup?intent=demo"
                onClick={() => setIsOpen(false)}
                className="accent-button rounded-2xl px-4 py-3 text-center font-semibold"
              >
                Request Demo
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
