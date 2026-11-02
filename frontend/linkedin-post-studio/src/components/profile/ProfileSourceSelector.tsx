/**
 * Phase 5 — ProfileSourceSelector
 *
 * Shown to new users (or when no source has been selected yet).
 * Presents three mutually exclusive cards for choosing how to populate profile data:
 *   1. Try Demo Profile    — fictional sample data
 *   2. Enter Manually      — user types or pastes their own information
 *   3. Connect LinkedIn    — pull authorized OAuth identity fields
 */

import { Sparkles, PenLine, Linkedin, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { ProfileSource } from '@/lib/profileOptimizer/types'

interface ProfileSourceSelectorProps {
  /** Called when the user picks a source. */
  onSelect: (source: ProfileSource) => void
  /** Whether LinkedIn OAuth is already connected (shows as active vs. inactive). */
  isLinkedInConnected: boolean
  /** While LinkedIn connection status is being checked. */
  isCheckingLinkedIn?: boolean
}

interface SourceCard {
  source: ProfileSource
  icon: React.ReactNode
  title: string
  description: string
  badge?: string
  badgeVariant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'linkedin'
}

export function ProfileSourceSelector({
  onSelect,
  isLinkedInConnected,
  isCheckingLinkedIn = false,
}: ProfileSourceSelectorProps) {
  const cards: SourceCard[] = [
    {
      source: 'demo',
      icon: <Sparkles className="h-8 w-8 text-amber-500" />,
      title: 'Try Demo Profile',
      description:
        'Explore the platform with a fictional sample profile. No real information required — great for a quick tour.',
      badge: 'Fictional Data',
      badgeVariant: 'warning',
    },
    {
      source: 'manual',
      icon: <PenLine className="h-8 w-8 text-blue-500" />,
      title: 'Enter Profile Manually',
      description:
        'Type or paste your LinkedIn headline, About section, skills, and experience to generate a personalized audit.',
    },
    {
      source: 'linkedin',
      icon: <Linkedin className="h-8 w-8 text-linkedin" />,
      title: 'Connect LinkedIn',
      description: isLinkedInConnected
        ? 'Your LinkedIn account is connected. Retrieve your authorized identity information to pre-fill the form.'
        : 'Authorize with LinkedIn to retrieve your name, email, and profile URL. Additional fields require manual entry due to API restrictions.',
      badge: isLinkedInConnected ? 'Connected' : undefined,
      badgeVariant: 'success',
    },
  ]

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          How would you like to set up your profile?
        </h2>
        <p className="text-muted-foreground text-sm max-w-xl mx-auto">
          Choose a source to get started. You can switch or update your profile information at any
          time.
        </p>
      </div>

      {/* Source Cards Grid */}
      <div
        role="radiogroup"
        aria-label="Profile data source"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {cards.map(({ source, icon, title, description, badge, badgeVariant }) => {
          const isDisabled = source === 'linkedin' && isCheckingLinkedIn
          return (
            <button
              key={source}
              role="radio"
              aria-checked={false}
              aria-label={title}
              disabled={isDisabled}
              onClick={() => onSelect(source)}
              className={[
                'text-left rounded-xl border-2 p-0 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isDisabled
                  ? 'opacity-50 cursor-not-allowed border-border'
                  : 'cursor-pointer border-border hover:border-primary/60 hover:shadow-md active:scale-[0.98]',
              ].join(' ')}
            >
              <Card className="h-full border-0 shadow-none bg-transparent">
                <CardContent className="p-6 flex flex-col gap-4 h-full">
                  {/* Icon row */}
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-muted">{icon}</div>
                    {isCheckingLinkedIn && source === 'linkedin' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mt-1" />
                    ) : badge ? (
                      <Badge variant={badgeVariant}>{badge}</Badge>
                    ) : null}
                  </div>

                  {/* Text */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                  </div>

                  {/* CTA hint */}
                  <p className="text-xs font-medium text-primary">
                    {source === 'demo'
                      ? 'Load sample →'
                      : source === 'manual'
                      ? 'Start entering →'
                      : isLinkedInConnected
                      ? 'Load LinkedIn info →'
                      : 'Connect & continue →'}
                  </p>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
