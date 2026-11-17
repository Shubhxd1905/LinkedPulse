import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Loader2, Sparkles } from 'lucide-react'
import {
  PROFILE_AUDIT_LOADED_EVENT,
  PROFILE_AUDIT_START_EVENT,
  PROFILE_AUDIT_STEP_EVENT,
  PROFILE_AUDIT_TRIGGER_ATTR,
  emitProfileAuditLoaded,
  type ProfileAuditStartDetail,
  type ProfileAuditStepDetail,
} from '@/lib/profileAuditEvents'

const DEFAULT_TITLE = 'Analyzing Your LinkedIn Profile...'
const DEFAULT_STEP = 'Evaluating headline keywords, recruiter ranking, and tailored rewrites...'
const MAX_ACTIVE_DURATION_MS = 15000

/**
 * Non-blocking, event-driven loading indicator for Profile Audit actions.
 *
 * - Trigger: starts immediately on click of any `[data-profile-audit-trigger="true"]`
 *   element or `profile-audit:start` CustomEvent.
 * - Hide: listens for `profile-audit:loaded` (and non-audit route transitions), then
 *   unmounts the animation immediately and tears down load/step listeners cleanly.
 */
export function ProfileAuditLoader() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const [title, setTitle] = useState(DEFAULT_TITLE)
  const [step, setStep] = useState(DEFAULT_STEP)
  const triggerPathRef = useRef<string>(location.pathname + location.search)

  const hideAnimation = useCallback(() => {
    setVisible(false)
  }, [])

  const showAnimation = useCallback(
    (detail?: ProfileAuditStartDetail) => {
      triggerPathRef.current = location.pathname + location.search
      setTitle(detail?.label || DEFAULT_TITLE)
      setStep(detail?.step || DEFAULT_STEP)
      setVisible(true)
    },
    [location.pathname, location.search]
  )

  // Always-on lightweight trigger listeners (delegated click + explicit start event)
  useEffect(() => {
    let sameRouteRafId: number | undefined

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null
      const triggerEl = target?.closest(`[${PROFILE_AUDIT_TRIGGER_ATTR}="true"]`)
      if (!triggerEl) return

      const customLabel = triggerEl.getAttribute('data-audit-label') || undefined
      const customStep = triggerEl.getAttribute('data-audit-step') || undefined
      showAnimation({ label: customLabel, step: customStep })

      // If this trigger is an anchor link pointing to the exact view already open,
      // signal load completion on the next animation frame so it never waits idly.
      const anchor = triggerEl.closest('a[href]') as HTMLAnchorElement | null
      if (anchor) {
        try {
          const targetUrl = new URL(anchor.href, window.location.origin)
          if (targetUrl.pathname + targetUrl.search === window.location.pathname + window.location.search) {
            if (sameRouteRafId !== undefined) cancelAnimationFrame(sameRouteRafId)
            sameRouteRafId = requestAnimationFrame(() => emitProfileAuditLoaded())
          }
        } catch {
          // Ignore malformed URLs
        }
      }
    }

    const handleStartEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ProfileAuditStartDetail>
      showAnimation(customEvent.detail)
    }

    document.addEventListener('click', handleDocumentClick, { capture: true })
    window.addEventListener(PROFILE_AUDIT_START_EVENT, handleStartEvent)

    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true })
      window.removeEventListener(PROFILE_AUDIT_START_EVENT, handleStartEvent)
      if (sameRouteRafId !== undefined) cancelAnimationFrame(sameRouteRafId)
    }
  }, [showAnimation])

  // Load-complete & step listeners attached ONLY while animation is active;
  // automatically cleaned up the instant the animation hides to avoid memory leaks.
  useEffect(() => {
    if (!visible) return

    let rafId: number | undefined

    const handleLoadComplete = () => {
      if (rafId !== undefined) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        hideAnimation()
      })
    }

    const handleStepEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ProfileAuditStepDetail>
      if (customEvent.detail?.step) {
        setStep(customEvent.detail.step)
      }
    }

    window.addEventListener(PROFILE_AUDIT_LOADED_EVENT, handleLoadComplete)
    window.addEventListener(PROFILE_AUDIT_STEP_EVENT, handleStepEvent)
    window.addEventListener('load', handleLoadComplete)

    // Safety failsafe so an interrupted transition never leaves the animation stuck
    const failsafeTimer = window.setTimeout(hideAnimation, MAX_ACTIVE_DURATION_MS)

    return () => {
      window.removeEventListener(PROFILE_AUDIT_LOADED_EVENT, handleLoadComplete)
      window.removeEventListener(PROFILE_AUDIT_STEP_EVENT, handleStepEvent)
      window.removeEventListener('load', handleLoadComplete)
      window.clearTimeout(failsafeTimer)
      if (rafId !== undefined) cancelAnimationFrame(rafId)
    }
  }, [visible, hideAnimation])

  // If navigation resolves to a route other than Profile Audit (/optimize or /guest?tab=optimize),
  // clear any navigation loader as soon as the destination route paints.
  useEffect(() => {
    if (!visible) return
    const currentKey = location.pathname + location.search
    if (currentKey === triggerPathRef.current) return

    const isAuditView =
      location.pathname === '/optimize' ||
      (location.pathname === '/guest' && location.search.includes('tab=optimize'))

    if (!isAuditView) {
      const rafId = requestAnimationFrame(() => hideAnimation())
      return () => cancelAnimationFrame(rafId)
    }
  }, [visible, location.pathname, location.search, hideAnimation])

  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      className="fixed top-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none select-none animate-fade-in"
    >
      <div className="glass-overlay rounded-2xl px-5 py-4 max-w-md w-full border border-indigo-400/35 glow-indigo shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/25 border border-indigo-400/35 text-indigo-200">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-300/70" aria-hidden="true" />
            <Sparkles className="h-3.5 w-3.5 text-white absolute animate-pulse" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white truncate">{title}</p>
            <p className="text-xs text-slate-200 mt-0.5 line-clamp-2 leading-snug">{step}</p>
          </div>
        </div>

        <div className="mt-3 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-400 via-sky-400 to-indigo-400 animate-audit-progress" />
        </div>
      </div>
    </div>
  )
}
