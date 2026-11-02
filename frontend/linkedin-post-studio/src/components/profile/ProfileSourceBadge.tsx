/**
 * Phase 5 — ProfileSourceBadge
 *
 * Compact badge displayed in the profile form header to indicate:
 *   - Which data source is active (demo / manual / linkedin)
 *   - For LinkedIn source: which fields were retrieved vs. require manual entry
 *   - For demo source: a clear disclaimer that the data is fictional
 */

import { AlertTriangle, Linkedin, PenLine } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { ProfileSource } from '@/lib/profileOptimizer/types'

interface ProfileSourceBadgeProps {
  source: ProfileSource
  /** LinkedIn fields that were successfully retrieved (e.g. ['fullName', 'email', 'profileUrl']) */
  linkedInAvailableFields?: string[]
  /** Callback to switch to a different source */
  onSwitch?: () => void
}

const LINKEDIN_FIELD_LABELS: Record<string, string> = {
  fullName: 'Name',
  email: 'Email',
  picture: 'Photo',
  profileUrl: 'Profile URL',
}

export function ProfileSourceBadge({
  source,
  linkedInAvailableFields = [],
  onSwitch,
}: ProfileSourceBadgeProps) {
  if (source === 'demo') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          DEMO PROFILE
        </Badge>
        <span className="text-xs text-muted-foreground">
          Fictional data for demonstration only — not your real profile.
        </span>
        {onSwitch && (
          <button
            onClick={onSwitch}
            className="text-xs text-primary underline underline-offset-2 hover:no-underline"
          >
            Switch source
          </button>
        )}
      </div>
    )
  }

  if (source === 'linkedin') {
    const retrievedLabels = linkedInAvailableFields
      .map((f) => LINKEDIN_FIELD_LABELS[f] ?? f)
      .join(', ')
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success" className="flex items-center gap-1">
          <Linkedin className="h-3 w-3" />
          LINKEDIN PROFILE
        </Badge>
        {retrievedLabels && (
          <span className="text-xs text-muted-foreground">
            Retrieved: {retrievedLabels}. Headline, About &amp; Skills require manual entry.
          </span>
        )}
        {onSwitch && (
          <button
            onClick={onSwitch}
            className="text-xs text-primary underline underline-offset-2 hover:no-underline"
          >
            Switch source
          </button>
        )}
      </div>
    )
  }

  // manual
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="info" className="flex items-center gap-1">
        <PenLine className="h-3 w-3" />
        MY PROFILE
      </Badge>
      {onSwitch && (
        <button
          onClick={onSwitch}
          className="text-xs text-primary underline underline-offset-2 hover:no-underline"
        >
          Switch source
        </button>
      )}
    </div>
  )
}
