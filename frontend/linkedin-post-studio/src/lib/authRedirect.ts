const FEATURE_LABELS: Array<{ prefix: string; label: string }> = [
  { prefix: '/optimize', label: 'Profile Audit' },
  { prefix: '/post-studio', label: 'Post Generator' },
  { prefix: '/drafts', label: 'Saved Drafts & History' },
  { prefix: '/content', label: 'Saved Drafts & History' },
  { prefix: '/settings', label: 'Account Settings' },
  { prefix: '/dashboard', label: 'Workspace Dashboard' },
]

/**
 * Validates an internal redirect path to prevent open-redirect vulnerabilities.
 * Returns `/dashboard` if the candidate is empty or non-internal.
 */
export function sanitizeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate || typeof candidate !== 'string') {
    return '/dashboard'
  }
  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return '/dashboard'
  }
  // Never redirect right back into auth pages
  if (trimmed.startsWith('/login') || trimmed.startsWith('/signup')) {
    return '/dashboard'
  }
  return trimmed
}

/**
 * Resolves a human-readable feature name for a protected route path.
 */
export function getProtectedFeatureLabel(path: string | null | undefined): string | null {
  if (!path) return null
  const match = FEATURE_LABELS.find((item) => path.startsWith(item.prefix))
  return match ? match.label : null
}

/**
 * Builds an auth URL (/login or /signup) preserving the redirect query string.
 */
export function buildAuthUrl(
  base: '/login' | '/signup',
  redirectPath: string | null | undefined,
  requireAuth = false
): string {
  const safePath = sanitizeRedirectPath(redirectPath)
  const hasExplicitRedirect = Boolean(redirectPath && safePath === redirectPath)
  if (!hasExplicitRedirect && !requireAuth) {
    return base
  }
  const params = new URLSearchParams()
  if (hasExplicitRedirect) {
    params.set('redirect', safePath)
  }
  if (requireAuth) {
    params.set('reason', 'auth_required')
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}
