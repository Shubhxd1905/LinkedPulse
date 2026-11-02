/**
 * Phase 5 — Profile Data Management: localStorage persistence utilities.
 *
 * Storage layout (all keys under linkedpulse_profile_*):
 *   linkedpulse_profile_demo    → demo profile form data (SAMPLE_PROFILE snapshot)
 *   linkedpulse_profile_manual  → user-entered manual profile data
 *   linkedpulse_profile_linkedin → data retrieved from LinkedIn OAuth
 *   linkedpulse_profile_source  → which source is currently active ('demo' | 'manual' | 'linkedin' | null)
 *
 * Security note:
 *   - Only profile form data and the selected source identifier are stored locally.
 *   - LinkedIn OAuth access tokens are NEVER stored in localStorage.
 *   - AI analysis results are NOT persisted (ephemeral per-session only).
 */

import type { ProfileSource } from './types'

// ─────────────────────────────────────────────────────────────
// Key constants
// ─────────────────────────────────────────────────────────────
const KEY_PREFIX = 'linkedpulse_profile_'
const SOURCE_KEY = `${KEY_PREFIX}source`

function dataKey(source: ProfileSource): string {
  return `${KEY_PREFIX}${source}`
}

// ─────────────────────────────────────────────────────────────
// Safe JSON helpers
// ─────────────────────────────────────────────────────────────

/** Safely parse a JSON string; returns null on any error. */
function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed as T
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// Active source management
// ─────────────────────────────────────────────────────────────

/**
 * Returns the currently active profile source, or null if no source has been selected yet.
 */
export function getActiveSource(): ProfileSource | null {
  if (typeof window === 'undefined') return null
  const value = localStorage.getItem(SOURCE_KEY)
  if (value === 'demo' || value === 'manual' || value === 'linkedin') return value
  return null
}

/**
 * Persists the selected profile source so it survives page reloads.
 */
export function setActiveSource(source: ProfileSource): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SOURCE_KEY, source)
}

/**
 * Clears the active source selection (returns user to the source selector screen).
 */
export function clearActiveSource(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SOURCE_KEY)
}

// ─────────────────────────────────────────────────────────────
// Per-source data management
// ─────────────────────────────────────────────────────────────

/**
 * Saves profile form data for the given source.
 * Only the specified source's storage key is written; other source keys are untouched.
 */
export function saveProfileData(source: ProfileSource, data: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(dataKey(source), JSON.stringify(data))
  } catch {
    // Silently ignore quota errors; profile data will just not persist.
  }
}

/**
 * Loads previously saved profile data for the given source.
 * Returns null if nothing was previously saved or if the stored data is corrupted.
 */
export function loadProfileData(source: ProfileSource): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(dataKey(source))
  return safeJsonParse<Record<string, unknown>>(raw)
}

/**
 * Clears stored profile data for a specific source.
 * Does NOT affect other sources.
 */
export function clearProfileData(source: ProfileSource): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(dataKey(source))
}

/**
 * Checks whether any profile data has been saved for the given source.
 */
export function hasProfileData(source: ProfileSource): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(dataKey(source)) !== null
}

/**
 * Clears all LinkedPulse profile storage keys (used for factory reset / full clear).
 * Does NOT affect unrelated localStorage keys (e.g. linkoptimize_engine_mode, LinkedIn token status).
 */
export function clearAllProfileData(): void {
  if (typeof window === 'undefined') return
  const sources: ProfileSource[] = ['demo', 'manual', 'linkedin']
  sources.forEach((s) => clearProfileData(s))
  clearActiveSource()
}
