import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  PenSquare,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Wand2,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Modal } from '@/components/ui/Modal'

export type OverviewFeatureId = 'profile-audit' | 'post-generator'

interface FeatureHighlight {
  icon: typeof Target
  title: string
  detail: string
}

interface FeatureOverviewDefinition {
  buttonLabel: string
  badge: string
  headerIcon: typeof UserCheck
  title: string
  description: string
  overview: string
  highlights: readonly FeatureHighlight[]
}

const FEATURE_OVERVIEWS: Record<OverviewFeatureId, FeatureOverviewDefinition> = {
  'profile-audit': {
    buttonLabel: 'Profile Audit',
    badge: 'AI Optimization',
    headerIcon: UserCheck,
    title: 'Profile Audit Overview',
    description: 'Overview of the LinkedIn Profile Optimizer & Audit workflow.',
    overview:
      'Analyze your LinkedIn headline, about summary, work experience, and skills against hiring benchmarks for your target job role.',
    highlights: [
      {
        icon: Target,
        title: '100+ Role Benchmarks',
        detail:
          'Evaluates headline clarity, keyword alignment, and measurable impact across 10 industry categories.',
      },
      {
        icon: ShieldCheck,
        title: 'Transparent Scoring',
        detail:
          'Provides section-by-section scores and deduction breakdowns without fabricating experience.',
      },
      {
        icon: Sparkles,
        title: 'Side-by-Side Rewrites',
        detail:
          'Generates editable copy across multiple professional tones with cloud-saved audit history.',
      },
    ],
  },
  'post-generator': {
    buttonLabel: 'Post Generator',
    badge: 'Visual AI Studio',
    headerIcon: PenSquare,
    title: 'Post Generator Overview',
    description: 'Overview of the AI Image-to-LinkedIn Post Studio workflow.',
    overview:
      'Turn screenshots, charts, or visual assets into structured LinkedIn posts tailored to your audience and preferred voice.',
    highlights: [
      {
        icon: Wand2,
        title: 'Image-to-Post Copy',
        detail:
          'Extracts visual context from uploaded images and crafts primary copy with targeted hashtags.',
      },
      {
        icon: Sparkles,
        title: '3 Alternative Hooks',
        detail:
          'Provides three opening hooks per generation so you can swap and refine scroll-stopping intros.',
      },
      {
        icon: CheckCircle2,
        title: 'Preview & Direct Publishing',
        detail:
          'Includes a live LinkedIn feed mockup, saved drafts library, scheduling, and OAuth publishing.',
      },
    ],
  },
}

interface FeatureOverviewButtonProps {
  featureId: OverviewFeatureId
  className?: string
}

/**
 * Displays a Feature navbar trigger button and an accessible overview modal
 * strictly for authenticated users. Returns null for unauthenticated visitors.
 */
export function FeatureOverviewButton({
  featureId,
  className,
}: FeatureOverviewButtonProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  const canViewOverview = !isLoading && isAuthenticated && Boolean(user)
  const feature = FEATURE_OVERVIEWS[featureId]
  const HeaderIcon = feature.headerIcon

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Ensure the modal closes immediately if the user signs out or loses auth
  useEffect(() => {
    if (!canViewOverview && isOpen) {
      setIsOpen(false)
    }
  }, [canViewOverview, isOpen])

  if (!canViewOverview) {
    return null
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`View ${feature.buttonLabel} overview`}
        className={
          className ||
          'inline-flex items-center gap-1.5 text-sm font-medium text-slate-200 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded'
        }
      >
        <span>{feature.buttonLabel}</span>
      </button>

      {isOpen && canViewOverview && (
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          title={feature.title}
          description={feature.description}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3.5 rounded-xl border border-indigo-400/25 bg-indigo-500/15 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/30 border border-indigo-400/35 text-indigo-200">
                <HeaderIcon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <span className="inline-block rounded-full border border-indigo-400/30 bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
                  {feature.badge}
                </span>
                <p className="text-sm leading-relaxed text-slate-100">
                  {feature.overview}
                </p>
              </div>
            </div>

            <ul
              className="space-y-2.5"
              aria-label={`${feature.buttonLabel} highlights`}
            >
              {feature.highlights.map((item) => {
                const ItemIcon = item.icon
                return (
                  <li
                    key={item.title}
                    className="flex items-start gap-3 rounded-xl border border-white/15 bg-white/[0.06] p-3.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-indigo-300 mt-0.5">
                      <ItemIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">{item.title}</h3>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-200">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="flex justify-end pt-3 border-t border-white/15">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
