/**
 * Stage 6: Safe LocalStorage Migration Banner
 *
 * Scans localStorage for existing Phase 5 profile and Phase 3 draft data:
 * - linkedpulse_profile_manual
 * - linkoptimize_saved_drafts
 *
 * Strictly NEVER imports linkedpulse_profile_demo.
 * Preserves local data until backend confirms successful migration.
 * Prevents duplicate imports per authenticated user.
 */

import { useState, useEffect } from 'react'
import { CloudUpload, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { apiImportLocalData } from '@/lib/api'

export function LocalStorageMigrationBanner() {
  const { user, isAuthenticated } = useAuth()
  const { success, warning } = useToast()
  const [shouldShow, setShouldShow] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [draftsCount, setDraftsCount] = useState(0)
  const [hasProfile, setHasProfile] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShouldShow(false)
      return
    }

    // Check if already migrated for this user
    const migrationKey = `linkedpulse_migrated_${user.id}`
    const dismissedKey = `linkedpulse_migration_dismissed_${user.id}`
    if (localStorage.getItem(migrationKey) === 'true' || localStorage.getItem(dismissedKey) === 'true') {
      setShouldShow(false)
      return
    }

    // Check for real manual profile data (strictly exclude demo data)
    let foundProfile = false
    try {
      const rawProfile = localStorage.getItem('linkedpulse_profile_manual')
      if (rawProfile) {
        const parsed = JSON.parse(rawProfile)
        if (parsed && parsed.profileSource !== 'demo' && (parsed.headline || parsed.about || (Array.isArray(parsed.skills) && parsed.skills.length > 0))) {
          foundProfile = true
        }
      }
    } catch {
      // Ignore corrupted localStorage data safely
    }

    // Check for saved drafts
    let foundDraftsCount = 0
    try {
      const rawDrafts = localStorage.getItem('linkoptimize_saved_drafts')
      if (rawDrafts) {
        const parsed = JSON.parse(rawDrafts)
        if (Array.isArray(parsed)) {
          // Filter out dummy initial mock posts if they haven't been edited
          const realDrafts = parsed.filter((p) => p && typeof p === 'object' && p.content)
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
      // Nothing to migrate: mark as migrated so we don't scan again
      localStorage.setItem(migrationKey, 'true')
    }
  }, [isAuthenticated, user])

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`linkedpulse_migration_dismissed_${user.id}`, 'true')
    }
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
            drafts = parsed.filter((p) => p && typeof p === 'object' && p.content)
          }
        }
      } catch {
        drafts = []
      }

      const res = await apiImportLocalData({
        profile: manualProfile,
        drafts: drafts,
      })

      if (res && res.status === 'success') {
        // Mark as permanently migrated for this user
        localStorage.setItem(`linkedpulse_migrated_${user.id}`, 'true')
        setShouldShow(false)
        success(
          'Migration Complete!',
          `Successfully imported ${res.imported.draftsCount} draft(s) and synced your profile to your cloud account.`
        )
      } else {
        warning('Import Notice', res.message || 'Could not complete import.')
      }
    } catch (err) {
      warning('Import Failed', err instanceof Error ? err.message : 'Failed to import local data.')
    } finally {
      setIsImporting(false)
    }
  }

  if (!shouldShow) return null

  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white py-3 px-4 shadow-md transition-all animate-fade-in relative z-40">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/20 backdrop-blur-xs shrink-0">
            <CloudUpload className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="font-bold">Sync your local data to the cloud:</span>{' '}
            <span className="text-blue-100">
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
            className="h-7 text-xs text-blue-100 hover:text-white hover:bg-white/10"
          >
            Not now
          </Button>
          <Button
            size="sm"
            onClick={handleImport}
            disabled={isImporting}
            className="h-7 text-xs bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-xs"
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
