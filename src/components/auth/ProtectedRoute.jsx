import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-parchment flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-stone-light bg-white-warm p-10 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full border-2 border-stone-light border-t-charcoal animate-spin" />
        <h1 className="mt-6 font-serif text-3xl text-charcoal">Restoring session</h1>
        <p className="mt-3 text-sm leading-relaxed text-charcoal-mid">
          Provance is checking your access and preparing the authenticated workspace.
        </p>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children, requireTeam = false, requireAdmin = false }) {
  const location = useLocation()
  const { isAuthenticated, isLoading, permissions } = useAuth()

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    const redirectTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/signin?redirect=${encodeURIComponent(redirectTo)}`} replace />
  }

  if (requireTeam && !permissions.team) {
    return <Navigate to="/app/access-denied" replace />
  }

  if (requireAdmin && !permissions.admin) {
    return <Navigate to="/app/access-denied" replace />
  }

  return children
}
