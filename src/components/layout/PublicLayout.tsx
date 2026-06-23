import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function PublicLayout() {
  const location = useLocation()

  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'Provance | Trust Infrastructure For Synthetic Media',
      '/product': 'Product | Provance',
      '/solutions': 'Solutions | Provance',
      '/pricing': 'Pricing | Provance',
      '/methodology': 'Methodology | Provance',
      '/sample-report': 'Sample Report | Provance',
      '/docs': 'Docs | Provance',
      '/security': 'Security | Provance',
      '/signin': 'Sign In | Provance',
      '/signup': 'Get Started | Provance',
    }

    if (location.pathname.startsWith('/solutions/')) {
      document.title = 'Solution | Provance'
      return
    }

    document.title = routeTitles[location.pathname] ?? 'Provance'
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-ink text-[#161718]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(155,180,92,0.12),_transparent_22%),radial-gradient(circle_at_84%_12%,_rgba(138,106,67,0.08),_transparent_18%),linear-gradient(180deg,_rgba(255,255,255,0.46),_transparent_24%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.05] [background-image:linear-gradient(rgba(17,17,17,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(17,17,17,0.04)_1px,transparent_1px)] [background-size:92px_92px]" />
      <div className="relative">
        <SiteHeader />
        <Outlet />
        <SiteFooter />
      </div>
    </div>
  )
}
