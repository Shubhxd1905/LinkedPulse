import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Linkedin, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  buildAuthUrl,
  getProtectedFeatureLabel,
  sanitizeRedirectPath,
} from '@/lib/authRedirect'

interface AuthGateHeaderProps {
  mode: 'login' | 'signup'
  title: string
  subtitle: string
}

/**
 * Shared header, guest-gate notice, and tab switcher for Login and Signup forms.
 * Preserves the requested redirect path so guests return to the gated feature after auth.
 */
export function useAuthRedirectTarget(): {
  redirectTo: string
  authRequired: boolean
  featureLabel: string | null
  rawRedirectParam: string | null
} {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const state = (location.state as { from?: string; authRequired?: boolean } | null) || null

  const rawRedirectParam = searchParams.get('redirect') || state?.from || null
  const redirectTo = sanitizeRedirectPath(rawRedirectParam)
  const authRequired =
    searchParams.get('reason') === 'auth_required' || Boolean(state?.authRequired)
  const featureLabel = getProtectedFeatureLabel(rawRedirectParam)

  return { redirectTo, authRequired, featureLabel, rawRedirectParam }
}

export function AuthGateHeader({ mode, title, subtitle }: AuthGateHeaderProps) {
  const { authRequired, featureLabel, rawRedirectParam } = useAuthRedirectTarget()

  const signupHref = buildAuthUrl('/signup', rawRedirectParam, authRequired)
  const loginHref = buildAuthUrl('/login', rawRedirectParam, authRequired)

  return (
    <div className="mb-6">
      {/* Back to home */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to Home
        </Link>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[11px] font-medium text-slate-200">
          <Lock className="h-3 w-3 text-indigo-300" aria-hidden="true" />
          Members Only
        </span>
      </div>

      {/* Logo / Branding */}
      <div className="mb-5 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/80 shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
          <Linkedin className="h-8 w-8 text-white" aria-hidden="true" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
        </div>
      </div>

      {/* Guest-gating notice when redirected from a protected feature */}
      {(authRequired || featureLabel) && (
        <div
          role="status"
          className="mb-5 flex items-start gap-2.5 rounded-xl border border-indigo-400/30 bg-indigo-500/15 px-3.5 py-2.5 text-xs text-indigo-100"
        >
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" aria-hidden="true" />
          <span>
            Please <strong>create a free account</strong> or <strong>sign in</strong> to unlock{' '}
            <span className="font-semibold text-white">
              {featureLabel || 'LinkedPulse Studio'}
            </span>
            .
          </span>
        </div>
      )}

      {/* Glass tab switcher between Create Account and Sign In */}
      <div
        className="grid grid-cols-2 gap-1 rounded-xl border border-white/15 bg-white/5 p-1"
        role="tablist"
        aria-label="Authentication mode"
      >
        <Link
          to={signupHref}
          role="tab"
          aria-selected={mode === 'signup'}
          className={cn(
            'rounded-lg py-2 text-center text-xs font-semibold transition-all',
            mode === 'signup'
              ? 'bg-indigo-500/80 text-white shadow-sm border border-indigo-400/30'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          )}
        >
          Create Account
        </Link>
        <Link
          to={loginHref}
          role="tab"
          aria-selected={mode === 'login'}
          className={cn(
            'rounded-lg py-2 text-center text-xs font-semibold transition-all',
            mode === 'login'
              ? 'bg-indigo-500/80 text-white shadow-sm border border-indigo-400/30'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          )}
        >
          Sign In
        </Link>
      </div>
    </div>
  )
}
