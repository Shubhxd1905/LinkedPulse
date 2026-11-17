import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Eye,
  FolderOpen,
  LayoutDashboard,
  Linkedin,
  Lock,
  PenSquare,
  ShieldCheck,
  Sparkles,
  Target,
  UserCheck,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { buildAuthUrl } from '@/lib/authRedirect'
import { APP_NAME } from '@/lib/constants'
import { emitProfileAuditLoaded } from '@/lib/profileAuditEvents'

type PreviewTabId = 'overview' | 'optimize' | 'post-studio' | 'drafts'

interface PreviewTab {
  id: PreviewTabId
  label: string
  icon: typeof LayoutDashboard
  targetPath: string
  ctaText: string
  summary: string
}

const OVERVIEW_TAB: PreviewTab = {
  id: 'overview',
  label: 'Workspace Overview',
  icon: LayoutDashboard,
  targetPath: '/dashboard',
  ctaText: 'Create Account to Open Dashboard',
  summary:
    'Your command center for live profile audit scores, target role alignment, saved content drafts, and LinkedIn publishing status.',
}

const PREVIEW_TABS: PreviewTab[] = [
  OVERVIEW_TAB,
  {
    id: 'optimize',
    label: 'Profile Audit',
    icon: UserCheck,
    targetPath: '/optimize',
    ctaText: 'Create Account to Run Profile Audit',
    summary:
      'Analyze your headline, about section, experience, and skills against 104 target roles and 3 career pathways with honest gap detection.',
  },
  {
    id: 'post-studio',
    label: 'Post Generator',
    icon: PenSquare,
    targetPath: '/post-studio',
    ctaText: 'Create Account to Generate Posts',
    summary:
      'Turn any image or screenshot into an engaging LinkedIn post with AI-crafted primary copy, 3 alternative hooks, and tailored hashtags.',
  },
  {
    id: 'drafts',
    label: 'Smart Drafts & Sync',
    icon: FolderOpen,
    targetPath: '/drafts',
    ctaText: 'Create Account to Save Drafts',
    summary:
      'Store unlimited drafts in your private cloud workspace, swap saved hooks anytime, and publish directly via LinkedIn OAuth.',
  },
]

const SAMPLE_METRICS = [
  {
    label: 'Profile Audit Score',
    value: '86 / 100',
    sub: 'Sample score breakdown across Headline, About & Skills',
    icon: Award,
    accent: 'text-emerald-400 bg-emerald-500/20 border-emerald-400/20',
  },
  {
    label: 'Role Taxonomy',
    value: '104 Roles',
    sub: 'Across 10 industry categories + custom role support',
    icon: Target,
    accent: 'text-indigo-300 bg-indigo-500/20 border-indigo-400/20',
  },
  {
    label: 'AI Post Generation',
    value: '3 Hooks + Post',
    sub: 'Image-to-post vision AI in multiple professional tones',
    icon: Wand2,
    accent: 'text-cyan-300 bg-cyan-500/20 border-cyan-400/20',
  },
  {
    label: 'User Isolation',
    value: 'Private Vault',
    sub: 'Your audits, drafts, and LinkedIn tokens stay account-scoped',
    icon: ShieldCheck,
    accent: 'text-amber-300 bg-amber-500/20 border-amber-400/20',
  },
]

const CAREER_PATHWAYS = [
  {
    title: 'Continue Current Career',
    desc: 'Benchmarks your current experience and elevates seniority keywords without fabricating roles.',
  },
  {
    title: 'Explore a Related Role',
    desc: 'Maps transferable competencies from adjacent experience toward your target role.',
  },
  {
    title: 'Transition to a New Career',
    desc: 'Highlights honest skill gaps and frames your past background into a cohesive pivot story.',
  },
]

function LockedFeatureGate({
  featureName,
  targetPath,
  ctaText,
  isAuthenticated,
}: {
  featureName: string
  targetPath: string
  ctaText: string
  isAuthenticated: boolean
}) {
  const signupUrl = buildAuthUrl('/signup', targetPath, true)
  const loginUrl = buildAuthUrl('/login', targetPath, true)

  return (
    <div className="mt-6 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/25 border border-indigo-400/30 text-indigo-200">
          <Lock className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {isAuthenticated
              ? `Ready to use ${featureName}`
              : `Account required to access ${featureName}`}
          </p>
          <p className="text-xs text-slate-200 mt-0.5">
            {isAuthenticated
              ? 'You are signed in and can open the live workspace right away.'
              : 'Guest mode is read-only. Create a free account or sign in to run live AI tools and save your data.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {isAuthenticated ? (
          <Link
            to={targetPath}
            data-profile-audit-trigger={targetPath === '/optimize' ? 'true' : undefined}
            data-audit-label={targetPath === '/optimize' ? 'Loading Profile Audit...' : undefined}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/80 border border-indigo-400/30 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
          >
            Open Live Tool
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        ) : (
          <>
            <Link
              to={loginUrl}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              to={signupUrl}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-500/85 border border-indigo-400/30 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500"
            >
              {ctaText}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

const VALID_TABS: PreviewTabId[] = ['overview', 'optimize', 'post-studio', 'drafts']

const DEMO_SAMPLE_HOOKS = [
  '“We cut query latency by 62% without adding a single server.”',
  '“Most engineers scale hardware first. Here is what profiling showed us instead:”',
  '“3 indexing mistakes we removed to speed up recruiter-facing APIs by 62%:”',
]

function parseTabParam(raw: string | null): PreviewTabId {
  if (raw && (VALID_TABS as string[]).includes(raw)) {
    return raw as PreviewTabId
  }
  return 'overview'
}

export function GuestOverviewPage() {
  const { isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<PreviewTabId>(() =>
    parseTabParam(searchParams.get('tab'))
  )
  const [selectedHookIndex, setSelectedHookIndex] = useState(0)

  useEffect(() => {
    setActiveTab(parseTabParam(searchParams.get('tab')))
  }, [searchParams])

  // Signal load completion for Profile Audit demo tab after paint
  useEffect(() => {
    if (activeTab !== 'optimize') return
    const rafId = requestAnimationFrame(() => {
      emitProfileAuditLoaded()
    })
    return () => cancelAnimationFrame(rafId)
  }, [activeTab])

  const handleSelectTab = (tabId: PreviewTabId) => {
    setActiveTab(tabId)
    if (tabId === 'overview') {
      setSearchParams({})
    } else {
      setSearchParams({ tab: tabId })
    }
  }

  const currentTab = PREVIEW_TABS.find((t) => t.id === activeTab) ?? OVERVIEW_TAB
  const activeDemoHook = DEMO_SAMPLE_HOOKS[selectedHookIndex] ?? DEMO_SAMPLE_HOOKS[0]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Guest Top Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-base font-bold text-white"
              aria-label={`${APP_NAME} home`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
                <Linkedin className="h-5 w-5 fill-current" />
              </div>
              <span className="font-extrabold tracking-tight hidden sm:inline">LinkedPulse</span>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-200">
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Guest Overview (Read-Only)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Home
            </Link>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/80 border border-indigo-400/30 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-indigo-500"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="rounded-lg bg-indigo-500/85 border border-indigo-400/30 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
                >
                  Create Free Account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* Intro Card */}
        <section className="rounded-3xl glass-lg border border-white/15 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Guest Account Preview
              </span>
              <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
                Explore LinkedPulse Features Before You Sign Up
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-slate-200 leading-relaxed">
                Browse this interactive overview to see how our Profile Optimizer, AI Image-to-Post
                Studio, and Draft Library work. To protect your personal career data and AI quota,
                running tools requires creating a free account.
              </p>
            </div>

            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500/85 border border-indigo-400/30 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500"
                >
                  Create Free Account
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Already registered? Sign In
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Feature Overview Tab Switcher */}
        <section aria-label="Feature overview tabs" className="space-y-6">
          <div className="flex flex-wrap gap-2 rounded-2xl glass p-2 border border-white/10">
            {PREVIEW_TABS.map((tab) => {
              const Icon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  data-profile-audit-trigger={tab.id === 'optimize' ? 'true' : undefined}
                  data-audit-label={tab.id === 'optimize' ? 'Loading Profile Audit Demo...' : undefined}
                  data-audit-step={tab.id === 'optimize' ? 'Rendering sample Profile Audit preview...' : undefined}
                  className={cn(
                    'flex-1 min-w-[150px] flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all',
                    isSelected
                      ? 'bg-indigo-500/85 text-white shadow-sm border border-indigo-400/30'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Active Tab Preview Panel */}
          <div className="rounded-3xl glass-lg border border-white/15 p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-white/10">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  <currentTab.icon className="h-5 w-5 text-indigo-300" aria-hidden="true" />
                  {currentTab.label}
                </h2>
                <p className="mt-1 text-sm text-slate-200">{currentTab.summary}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100">
                <Lock className="h-3 w-3 text-amber-300" aria-hidden="true" />
                Preview Mode
              </span>
            </div>

            {activeTab === 'overview' && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {SAMPLE_METRICS.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                          {item.label}
                        </span>
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', item.accent)}>
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                      </div>
                      <p className="text-2xl font-extrabold text-white">{item.value}</p>
                      <p className="text-xs text-slate-200 leading-relaxed">{item.sub}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {activeTab === 'optimize' && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-200">
                    3 Career Pathways Supported
                  </h3>
                  <div className="space-y-2.5">
                    {CAREER_PATHWAYS.map((pathway) => (
                      <div
                        key={pathway.title}
                        className="rounded-xl border border-white/15 bg-slate-950/35 p-3.5"
                      >
                        <p className="text-sm font-semibold text-white">{pathway.title}</p>
                        <p className="text-xs text-slate-200 mt-1 leading-relaxed">{pathway.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                    Sample Audit Output (Read-Only)
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Headline Alignment', score: 92 },
                      { label: 'About Section Impact', score: 84 },
                      { label: 'Target Role Keywords', score: 79 },
                    ].map((row) => (
                      <div key={row.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-100">{row.label}</span>
                          <span className="text-white font-bold">{row.score}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400"
                            style={{ width: `${row.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-200">
                    Includes side-by-side rewrite suggestions without altering your original profile history.
                  </p>
                  <div className="rounded-xl border border-white/15 bg-slate-950/45 p-3.5 space-y-2 text-xs">
                    <div className="text-slate-300">
                      <span className="font-semibold text-rose-300">Before:</span>{' '}
                      Software Engineer at Acme Corp
                    </div>
                    <div className="text-slate-100">
                      <span className="font-semibold text-emerald-300">Demo Suggestion:</span>{' '}
                      Senior Backend Engineer | Python, Distributed Systems &amp; High-Throughput APIs
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'post-studio' && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-200">
                    How Image-to-Post Works
                  </h3>
                  {[
                    '1. Upload a project screenshot, chart, certificate, or event photo (PNG/JPG/WEBP).',
                    '2. Choose your preferred tone (Storytelling, Insightful, Casual, Thought Leader) and length.',
                    '3. Receive a ready-to-publish LinkedIn post, 3 alternative opening hooks, and relevant hashtags.',
                  ].map((step) => (
                    <div key={step} className="flex items-start gap-2.5 text-xs text-slate-100 rounded-xl border border-white/15 bg-slate-950/35 p-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300 mt-0.5" aria-hidden="true" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-200">
                      Sample Generated Post Preview (Demo)
                    </h3>
                    <div className="flex items-center gap-1">
                      {DEMO_SAMPLE_HOOKS.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedHookIndex(idx)}
                          className={cn(
                            'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors border',
                            selectedHookIndex === idx
                              ? 'bg-indigo-500/80 border-indigo-400/40 text-white'
                              : 'bg-white/10 border-white/15 text-slate-200 hover:text-white'
                          )}
                        >
                          Hook {idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-slate-950/45 p-4 text-xs text-slate-100 space-y-2 leading-relaxed">
                    <p className="font-semibold text-white">
                      {activeDemoHook}
                    </p>
                    <p>
                      Instead of scaling hardware, we profiled our top 3 slow endpoints and indexed
                      the exact filter paths recruiters and customers hit most...
                    </p>
                    <p className="text-indigo-200 font-medium">
                      #SoftwareEngineering #Performance #SystemDesign
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'drafts' && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    title: 'Isolated Cloud Storage',
                    body: 'Every saved draft, hook variation, and profile snapshot is tied strictly to your user account.',
                  },
                  {
                    title: '1-Click Hook Swapping',
                    body: 'Restore any saved draft back into Post Studio with all 3 alternative hooks preserved.',
                  },
                  {
                    title: 'Direct LinkedIn Publishing',
                    body: 'Connect your LinkedIn profile via OAuth in Settings to publish posts right from the studio.',
                  },
                ].map((card) => (
                  <div
                    key={card.title}
                    className="rounded-2xl border border-white/15 bg-white/[0.07] p-5 space-y-2"
                  >
                    <h3 className="text-sm font-bold text-white">{card.title}</h3>
                    <p className="text-xs text-slate-200 leading-relaxed">{card.body}</p>
                  </div>
                ))}
              </div>
            )}

            <LockedFeatureGate
              featureName={currentTab.label}
              targetPath={currentTab.targetPath}
              ctaText={currentTab.ctaText}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
