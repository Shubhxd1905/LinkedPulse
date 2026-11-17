import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, ShieldCheck } from 'lucide-react'
import { buildAuthUrl } from '@/lib/authRedirect'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-lg rounded-2xl border border-white/15 px-8 py-6 flex flex-col items-center gap-3 shadow-2xl">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium text-white/80">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>Verifying your session…</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    const requestedPath = `${location.pathname}${location.search}`
    const targetUrl = buildAuthUrl('/signup', requestedPath, true)
    return (
      <Navigate
        to={targetUrl}
        replace
        state={{ from: requestedPath, authRequired: true }}
      />
    )
  }

  return <>{children}</>
}
