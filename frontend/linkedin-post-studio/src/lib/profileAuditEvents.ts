/**
 * Custom DOM event bus for the non-blocking Profile Audit loading animation.
 * Connects Profile Audit button/link clicks to ProfileAuditLoader and notifies
 * the loader as soon as the Profile Audit view or analysis finishes loading.
 */

export const PROFILE_AUDIT_START_EVENT = 'profile-audit:start'
export const PROFILE_AUDIT_STEP_EVENT = 'profile-audit:step'
export const PROFILE_AUDIT_LOADED_EVENT = 'profile-audit:loaded'
export const PROFILE_AUDIT_TRIGGER_ATTR = 'data-profile-audit-trigger'

export interface ProfileAuditStartDetail {
  label?: string
  step?: string
}

export interface ProfileAuditStepDetail {
  step: string
}

export function emitProfileAuditStart(detail: ProfileAuditStartDetail = {}): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ProfileAuditStartDetail>(PROFILE_AUDIT_START_EVENT, { detail }))
}

export function emitProfileAuditStep(step: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ProfileAuditStepDetail>(PROFILE_AUDIT_STEP_EVENT, { detail: { step } }))
}

export function emitProfileAuditLoaded(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PROFILE_AUDIT_LOADED_EVENT))
}
