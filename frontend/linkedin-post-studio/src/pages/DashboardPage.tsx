import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Award,
  Sparkles,
  UserCheck,
  FolderOpen,
  Clock,
  ArrowUpRight,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  Linkedin,
  CheckCircle2,
  XCircle,
  Target,
  History,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import type { Post } from '@/types'
import {
  apiGetUserProfile,
  apiGetUserAudits,
  getLinkedInStatus,
  type LinkedInStatusResponse,
} from '@/lib/api'
import { fetchDraftsFromCloud } from '@/lib/draftsStore'
import type { DemoStateMode } from '@/components/layout/AppLayout'

interface DashboardPageProps {
  stateMode?: DemoStateMode
  onStateModeChange?: (mode: DemoStateMode) => void
}

export function DashboardPage({ stateMode = 'normal', onStateModeChange }: DashboardPageProps) {
  const { user } = useAuth()
  const { success } = useToast()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Real data states
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [profileData, setProfileData] = useState<any | null>(null)
  const [audits, setAudits] = useState<any[]>([])
  const [drafts, setDrafts] = useState<Post[]>([])
  const [linkedInStatus, setLinkedInStatus] = useState<LinkedInStatusResponse | null>(null)

  // Load real user metrics on mount or when user changes
  const loadDashboardData = async () => {
    setIsLoadingData(true)
    try {
      const [profileRes, auditsRes, cloudDrafts, liStatus] = await Promise.all([
        apiGetUserProfile().catch(() => ({ status: 'error', profile: null })),
        apiGetUserAudits().catch(() => ({ status: 'error', audits: [] })),
        fetchDraftsFromCloud().catch(() => []),
        getLinkedInStatus().catch(() => null),
      ])

      if (profileRes && profileRes.status === 'success') {
        setProfileData(profileRes.profile)
      }
      if (auditsRes && auditsRes.status === 'success' && Array.isArray(auditsRes.audits)) {
        setAudits(auditsRes.audits)
      }
      if (Array.isArray(cloudDrafts)) {
        setDrafts(cloudDrafts)
      }
      if (liStatus) {
        setLinkedInStatus(liStatus)
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [user?.id])

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    success('Copied to clipboard', 'Post content is ready to paste.')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Loading State
  if (stateMode === 'loading' || (isLoadingData && !profileData && audits.length === 0)) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // Empty State (manual trigger)
  if (stateMode === 'empty') {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Performance Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track engagement trends, profile views, and content pipeline.
          </p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              icon="inbox"
              title="No Activity Recorded Yet"
              description="Welcome to LinkedPulse! Run your first AI profile audit or generate a post to populate your reach, target role fit, and activity metrics."
              action={{
                label: 'Reset View',
                onClick: () => onStateModeChange?.('normal'),
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error State (manual trigger)
  if (stateMode === 'error') {
    return (
      <div className="py-12 animate-fade-in">
        <Card className="max-w-xl mx-auto border-red-200 dark:border-red-900/50">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Failed to load dashboard metrics
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
              A simulated network timeout occurred while fetching engagement data and metrics.
            </p>
            {onStateModeChange && (
              <Button variant="primary" onClick={() => onStateModeChange('normal')}>
                Retry Connection
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Extract latest audit information
  const latestAudit = audits.length > 0 ? audits[0] : null
  const auditJson = latestAudit?.audit_json || latestAudit?.auditJson || null
  const latestScore = latestAudit?.overall_score ?? auditJson?.overallScore ?? (audits.length > 0 ? 85 : null)
  const latestRating = auditJson?.overallRating || (latestScore !== null ? (latestScore >= 85 ? 'Excellent' : latestScore >= 70 ? 'Strong' : 'Needs Work') : null)

  // Extract recommendations and strengths from latest audit
  const auditStrengths: string[] = auditJson?.strengths || [
    'Clear alignment with target role competencies',
    'Quantifiable achievements in experience summary',
  ]
  const auditRecommendations: string[] = auditJson?.improvements || auditJson?.recommendations || [
    'Add 3–5 high-volume recruiter keywords to your headline',
    'Include a clear call-to-action in your About section',
  ]

  // Profile details
  const targetRole = profileData?.target_role || 'Data Analyst / Full Stack'
  const careerIntent = profileData?.career_intent || 'continue'
  const careerIntentLabel =
    careerIntent === 'pivot'
      ? 'Transition to a New Career'
      : careerIntent === 'related'
      ? 'Explore a Related Role'
      : 'Continue in My Current Career'
  const profileSource = profileData?.source || 'manual'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {user?.displayName || 'Member'} 👋
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Here is your live profile optimization status, target role alignment, and content pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/optimize">
            <Button variant="outline" size="sm" leftIcon={<UserCheck className="h-4 w-4 text-[#0a66c2]" />}>
              Profile Optimizer
            </Button>
          </Link>
          <Link to="/post-studio">
            <Button size="sm" leftIcon={<Sparkles className="h-4 w-4" />}>
              Generate Post
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Profile Strength / Latest Audit Score */}
        <Card className="hover:border-[#0a66c2]/40 transition-all duration-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Audit Score
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-[#0a66c2] dark:bg-blue-950/40 dark:text-blue-400">
                <Award className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              {latestScore !== null ? (
                <>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{latestScore}</span>
                  <span className="text-xs font-semibold text-slate-400">/ 100</span>
                  <Badge
                    variant={latestScore >= 85 ? 'success' : latestScore >= 70 ? 'info' : 'warning'}
                    size="sm"
                    className="ml-auto"
                  >
                    {latestRating || 'Audited'}
                  </Badge>
                </>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-400">Not Audited</span>
                  <Link to="/optimize" className="ml-auto">
                    <Badge variant="default" size="sm">
                      Run Audit
                    </Badge>
                  </Link>
                </div>
              )}
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${latestScore ?? 0}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {audits.length > 0
                ? `${audits.length} recorded audit${audits.length > 1 ? 's' : ''} in cloud database`
                : 'Run an audit to calculate recruiter match score'}
            </p>
          </CardContent>
        </Card>

        {/* Target Job Role & Intent */}
        <Card className="hover:border-[#0a66c2]/40 transition-all duration-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Target Role
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <Target className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-lg font-bold text-slate-900 dark:text-white truncate" title={targetRole}>
                {targetRole}
              </p>
              <Badge variant="info" size="sm" className="mt-1 text-[10px] truncate max-w-full">
                {careerIntentLabel}
              </Badge>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              Source: <span className="font-semibold uppercase text-slate-700 dark:text-slate-300">{profileSource}</span>
            </p>
          </CardContent>
        </Card>

        {/* Active Saved Drafts */}
        <Card className="hover:border-[#0a66c2]/40 transition-all duration-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Saved Drafts
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <FolderOpen className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{drafts.length}</span>
              <span className="text-xs text-slate-500">posts saved</span>
              <Link to="/drafts" className="ml-auto">
                <Badge variant="default" size="sm">
                  View All
                </Badge>
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              {drafts.length > 0 ? 'Synced with cloud storage' : 'No drafts saved yet'}
            </p>
          </CardContent>
        </Card>

        {/* LinkedIn Connection Status */}
        <Card className="hover:border-[#0a66c2]/40 transition-all duration-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                LinkedIn Account
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a66c2]/10 text-[#0a66c2]">
                <Linkedin className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {linkedInStatus?.isConnected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {linkedInStatus.memberName || 'Connected'}
                    </p>
                    <Badge variant="success" size="sm" className="mt-0.5">
                      OAuth Active
                    </Badge>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Not Connected</p>
                    <Badge variant="default" size="sm" className="mt-0.5">
                      Manual Mode
                    </Badge>
                  </div>
                </>
              )}
            </div>
            <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
              {linkedInStatus?.isConnected
                ? 'Ready for profile sync & direct publishing'
                : 'Connect via OAuth for verified profile data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Row: Latest Audit Breakdown & Optimal Window */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest Audit Recommendations & Breakdown */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0a66c2]" />
                Latest Profile Audit Insights
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {latestAudit
                  ? `Evaluated for "${latestAudit.target_role || targetRole}" • Score: ${latestScore}/100`
                  : 'Actionable keyword & recruiter alignment breakdown'}
              </p>
            </div>
            <Link to="/optimize">
              <Button variant="ghost" size="sm" className="text-xs">
                {latestAudit ? 'Full Analysis →' : 'Start Audit →'}
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-2 space-y-4">
            {latestAudit ? (
              <div className="space-y-4">
                {/* Strengths */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Key Strengths Identified
                  </h4>
                  <div className="space-y-2">
                    {auditStrengths.slice(0, 2).map((strength, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/20 text-xs text-slate-800 dark:text-slate-200"
                      >
                        {strength}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Recommended Improvements
                  </h4>
                  <div className="space-y-2">
                    {auditRecommendations.slice(0, 2).map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-amber-100 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20 text-xs text-slate-800 dark:text-slate-200 flex items-start justify-between gap-3"
                      >
                        <span>{rec}</span>
                        <Link to="/optimize" className="shrink-0">
                          <Button size="sm" variant="secondary" className="text-[11px] h-7 px-2">
                            Optimize
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <UserCheck className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                  No Audit Run for this Profile Yet
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                  Run an instant AI profile audit to receive targeted keyword suggestions, section scores, and career pathway advice.
                </p>
                <Link to="/optimize">
                  <Button size="sm" variant="primary" leftIcon={<Award className="h-4 w-4" />}>
                    Run First Profile Audit
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Algorithm Best Time & Pro Tips */}
        <Card className="shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#0a66c2]" />
                Optimal Posting Window
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-4">
              <div className="rounded-xl bg-blue-50/60 p-4 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#0a66c2] dark:text-blue-400">Next Recommended Slot</span>
                  <Badge variant="linkedin" size="sm">Tomorrow</Badge>
                </div>
                <div className="mt-2">
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                    09:00 AM – 10:30 AM
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Feed engagement increases by 2.4x during this morning commuter window.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Algorithm Optimization Tips
                </span>
                <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>The first 90 minutes determine 80% of your post's algorithmic reach. Respond to all comments quickly.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <Lightbulb className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <span>Keep external links in the comments or at the very end to avoid reach penalty.</span>
                </div>
              </div>
            </CardContent>
          </div>

          <div className="p-5 pt-0">
            <Link to="/post-studio" className="w-full">
              <Button variant="outline" className="w-full" size="sm" rightIcon={<ArrowUpRight className="h-4 w-4" />}>
                Draft a Post for Tomorrow
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Audit History Overview Table (if past audits exist) */}
      {audits.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-[#0a66c2]" />
                Audit History ({audits.length})
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Past evaluations securely stored in your personal database
              </p>
            </div>
            <Link to="/optimize">
              <Button variant="outline" size="sm" className="text-xs">
                New Audit
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Target Role</th>
                    <th className="pb-2">Career Intent</th>
                    <th className="pb-2">Score</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {audits.slice(0, 5).map((a) => {
                    const score = a.overall_score ?? a.overallScore ?? 0
                    const dateStr = a.created_at
                      ? new Date(a.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recent'
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 font-mono text-[11px]">{dateStr}</td>
                        <td className="py-2.5 font-semibold text-slate-900 dark:text-white">
                          {a.target_role || 'General'}
                        </td>
                        <td className="py-2.5 capitalize">{a.career_intent || 'continue'}</td>
                        <td className="py-2.5">
                          <Badge
                            variant={score >= 85 ? 'success' : score >= 70 ? 'info' : 'warning'}
                            size="sm"
                          >
                            {score} / 100
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right">
                          <Link to="/optimize">
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              Review
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Posts & Drafts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Saved Drafts</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Posts saved in your database, ready for export or LinkedIn publishing
            </p>
          </div>
          <Link to="/drafts">
            <Button variant="ghost" size="sm" className="text-xs">
              View All ({drafts.length}) →
            </Button>
          </Link>
        </div>

        {drafts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <FolderOpen className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                No Drafts Saved Yet
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
                Use the Image Post Generator to create engaging, algorithm-optimized LinkedIn posts with images.
              </p>
              <Link to="/post-studio">
                <Button size="sm" variant="primary" leftIcon={<Sparkles className="h-4 w-4" />}>
                  Create New Post
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {drafts.slice(0, 6).map((post) => (
              <Card key={post.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Badge
                        variant={post.status === 'published' ? 'success' : 'default'}
                        size="sm"
                        className="capitalize"
                      >
                        {post.status}
                      </Badge>
                      <span className="text-[11px] text-slate-400">
                        {new Date(post.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                      {post.hook || post.content.slice(0, 60)}
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-4 font-normal leading-relaxed whitespace-pre-line">
                      {post.content}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {(post.hashtags || []).map((tag: string) => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium text-[#0a66c2] dark:text-blue-400"
                        >
                          #{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] capitalize font-semibold text-slate-400">
                      {post.tone || 'engaging'} tone
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => handleCopy(post.content, post.id)}
                        leftIcon={
                          copiedId === post.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )
                        }
                      >
                        {copiedId === post.id ? 'Copied' : 'Copy'}
                      </Button>
                      <Link to="/post-studio">
                        <Button size="sm" variant="secondary" className="h-8 px-2.5 text-xs">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
