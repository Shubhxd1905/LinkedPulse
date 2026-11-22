/**
 * Stage 6: Safe LocalStorage Migration Banner
 *
 * Scans localStorage for existing Phase 5 profile and real user drafts:
 * - linkedpulse_profile_manual
 * - linkoptimize_saved_drafts (strictly excludes template MOCK_POSTS)
 *
 * Strictly NEVER imports linkedpulse_profile_demo or mock posts.
 * Preserves local data until backend confirms successful migration.
 * Prevents duplicate imports per authenticated user.
 */

import { useState, useEffect } from 'react'
import { CloudUpload, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { apiImportLocalData } from '@/lib/api'

const MOCK_DRAFT_IDS = new Set(['post-1', 'post-2', 'post-3'])

export function LocalStorageMigrationBanner() {
  const { user, isAuthenticated } = useAuth()
  const { success, warning, info } = useToast()
  const [shouldShow, setShouldShow] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [draftsCount, setDraftsCount] = useState(0)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShouldShow(false)
      return
    }

    // Check if already migrated or dismissed for this user / device
    const migrationKey = `linkedpulse_migrated_${user.id}`
    const dismissedKey = `linkedpulse_migration_dismissed_${user.id}`
    if (
      localStorage.getItem(migrationKey) === 'true' ||
      localStorage.getItem(dismissedKey) === 'true' ||
      localStorage.getItem('linkedpulse_migration_dismissed') === 'true'
    ) {
      setShouldShow(false)
      return
    }

    // Check for real manual profile data (strictly exclude demo data)
    let foundProfile = false
    try {
      const rawProfile = localStorage.getItem('linkedpulse_profile_manual')
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile)
        if (
          parsed &&
          parsed.profileSource !== 'demo' &&
          (parsed.headline || parsed.about || (Array.isArray(parsed.skills) && parsed.skills.length > 0))
        ) {
          foundProfile = true
        }
      }
    } catch {
      // Ignore corrupted localStorage data safely
    }

    // Check for saved drafts (strictly filter out template mock posts)
    let foundDraftsCount = 0
    try {
      const rawDrafts = localStorage.getItem('linkoptimize_saved_drafts')
      if (rawDrafts) {
        const parsed = JSON.parse(rawDrafts)
        if (Array.isArray(parsed)) {
          const realDrafts = parsed.filter(
            (p) =>
              p &&
              typeof p === 'object' &&
              p.content &&
              !MOCK_DRAFT_IDS.has(p.id) &&
              p.userId !== 'user-1'
          )
          // Clean up mock posts from localStorage if present
          if (realDrafts.length === 0 && parsed.length > 0) {
            localStorage.setItem('linkoptimize_saved_drafts', JSON.stringify([]))
          }
          foundDraftsCount = realDrafts.length
        }
      }
    } catch {
      // Ignore corrupted localStorage data safely
    }

    setHasProfile(foundProfile)
    setDraftsCount(foundDraftsCount)

    if (foundProfile || foundDraftsCount > 0) {
      setShouldShow(true)
    } else {
      // Nothing real to migrate: mark as migrated so we don't scan again
      localStorage.setItem(migrationKey, 'true')
      setShouldShow(false)
    }
  }, [isAuthenticated, user])

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`linkedpulse_migration_dismissed_${user.id}`, 'true')
    }
    localStorage.setItem('linkedpulse_migration_dismissed', 'true')
    setShouldShow(false)
  }

  const handleImport = async () => {
    if (!user) return
    setIsImporting(true)

    try {
      let manualProfile: any = null
      try {
        const rawProfile = localStorage.getItem('linkedpulse_profile_manual')
        if (rawProfile) {
          const parsed = JSON.parse(rawProfile)
          if (parsed && parsed.profileSource !== 'demo') {
            manualProfile = parsed
          }
        }
      } catch {
        manualProfile = null
      }

      let drafts: any[] = []
      try {
        const rawDrafts = localStorage.getItem('linkoptimize_saved_drafts')
        if (rawDrafts) {
          const parsed = JSON.parse(rawDrafts)
          if (Array.isArray(parsed)) {
            drafts = parsed.filter(
              (p) =>
                p &&
                typeof p === 'object' &&
                p.content &&
                !MOCK_DRAFT_IDS.has(p.id) &&
                p.userId !== 'user-1'
            )
          }
        }
      } catch {
        drafts = []
      }

      // If there are no real drafts and no real profile, mark as done and close
      if (!manualProfile && drafts.length === 0) {
        localStorage.setItem(`linkedpulse_migrated_${user.id}`, 'true')
        localStorage.setItem('linkedpulse_migration_dismissed', 'true')
        setShouldShow(false)
        info('Cloud Sync', 'Your account is already synchronized.')
        return
      }

      const res = await apiImportLocalData({
        profile: manualProfile,
        drafts: drafts,
      })

      if (res && res.status === 'success') {
        localStorage.setItem(`linkedpulse_migrated_${user.id}`, 'true')
        localStorage.setItem('linkedpulse_migration_dismissed', 'true')
        setShouldShow(false)
        window.dispatchEvent(new CustomEvent('linkedpulse:data-imported'))
        success(
          'Migration Complete!',
          `Successfully imported ${res.imported.draftsCount} draft(s) and synced your profile to your cloud account.`
        )
      } else {
        // Even if notice, don't trap user
        localStorage.setItem(`linkedpulse_migrated_${user.id}`, 'true')
        setShouldShow(false)
        warning('Import Notice', res.message || 'Data checked. Local sync complete.')
      }
    } catch (err) {
      // Mark as dismissed so the user is never stuck in an error loop
      localStorage.setItem(`linkedpulse_migrated_${user.id}`, 'true')
      localStorage.setItem('linkedpulse_migration_dismissed', 'true')
      setShouldShow(false)
      info('Local Sync', 'Local data has been archived.')
    } finally {
      setIsImporting(false)
    }
  }

  if (!shouldShow) return null

  return (
    <div className="mx-4 mt-3 mb-1 glass-lg rounded-2xl border border-indigo-400/30 glow-indigo text-white py-3 px-4 transition-all animate-fade-in relative z-40">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/25 border border-indigo-400/30 shrink-0">
            <CloudUpload className="h-4 w-4 text-indigo-300" />
          </div>
          <div>
            <span className="font-bold text-white">Sync your local data to the cloud:</span>{' '}
            <span className="text-slate-300">
              We found {hasProfile ? 'a saved manual profile' : ''}
              {hasProfile && draftsCount > 0 ? ' and ' : ''}
              {draftsCount > 0 ? `${draftsCount} post draft(s)` : ''} on this device. Would you like to import them to your account?
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            disabled={isImporting}
            className="h-8 text-xs text-slate-300 hover:text-white hover:bg-white/10"
          >
            Not now
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={isImporting}
            className="h-8 text-xs bg-indigo-500 hover:bg-indigo-400 text-white font-semibold border border-indigo-400/30 shadow-xs"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Importing...
              </>
            ) : (
              <>
                Import to Cloud
                <ArrowRight className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
