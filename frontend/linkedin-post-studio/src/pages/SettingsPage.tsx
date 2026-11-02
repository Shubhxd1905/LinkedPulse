import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  User,
  Moon,
  Sun,
  Laptop,
  Linkedin,
  Download,
  AlertCircle,
  Save,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Key,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/hooks/useToast'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import {
  getLinkedInStatus,
  getLinkedInAuthUrl,
  disconnectLinkedIn,
  type LinkedInStatusResponse,
} from '@/lib/api'
import type { Theme, PostTone, PostLength } from '@/types'
import type { DemoStateMode } from '@/components/layout/AppLayout'

interface SettingsPageProps {
  stateMode?: DemoStateMode
  onStateModeChange?: (mode: DemoStateMode) => void
}

export function SettingsPage({ stateMode = 'normal', onStateModeChange }: SettingsPageProps) {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const { success, error } = useToast()

  // Profile Settings
  const [displayName, setDisplayName] = useState(user?.displayName || 'Alex Rivera')
  const [email, setEmail] = useState(user?.email || 'demo@linkoptimize.dev')
  const [headline, setHeadline] = useState('Senior Full-Stack Engineer | React & Cloud Systems')
  const [vanityName, setVanityName] = useState('alexrivera-tech')

  // LinkedIn OAuth 2.0 Integration State
  const [linkedinStatus, setLinkedinStatus] = useState<LinkedInStatusResponse | null>(null)
  const [isLoadingLinkedIn, setIsLoadingLinkedIn] = useState(true)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  // AI Defaults
  const [defaultTone, setDefaultTone] = useState<PostTone>('storytelling')
  const [defaultLength, setDefaultLength] = useState<PostLength>('medium')
  const [autoHashtags, setAutoHashtags] = useState(true)

  // Load live LinkedIn status & check for OAuth callback URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authStatus = params.get('linkedin_auth')
    const authMessage = params.get('message')

    if (authStatus === 'success') {
      success('LinkedIn Connected!', 'Your account has been authorized with official post publishing permissions.')
      window.history.replaceState({}, document.title, window.location.pathname)
    } else if (authStatus === 'error') {
      error('LinkedIn Authorization Failed', authMessage || 'Could not complete LinkedIn authorization.')
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    loadLinkedInStatus()
  }, [])

  const loadLinkedInStatus = async () => {
    setIsLoadingLinkedIn(true)
    try {
      const res = await getLinkedInStatus()
      setLinkedinStatus(res)
    } catch (err: any) {
      console.error('Failed to load LinkedIn status:', err)
    } finally {
      setIsLoadingLinkedIn(false)
    }
  }

  const handleConnectLinkedIn = async () => {
    setIsConnecting(true)
    try {
      const res = await getLinkedInAuthUrl()
      if (res.status === 'success' && res.authUrl) {
        window.location.href = res.authUrl
      } else {
        error(
          'Configuration Needed',
          res.message || 'LinkedIn credentials are not configured in your server environment (.env).'
        )
      }
    } catch (err: any) {
      error('Connection Error', err?.message || 'Failed to initiate LinkedIn authorization.')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnectLinkedIn = async () => {
    setIsDisconnecting(true)
    try {
      await disconnectLinkedIn()
      success('Account Disconnected', 'Your LinkedIn account has been disconnected.')
      await loadLinkedInStatus()
    } catch (err: any) {
      error('Disconnect Failed', err?.message || 'Could not disconnect account.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    success('Settings Updated', 'Your profile preferences have been successfully saved.')
  }

  const handleExportData = () => {
    const data = {
      profile: { displayName, email, headline, vanityName },
      preferences: { defaultTone, defaultLength, autoHashtags, theme },
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'linkoptimize-export.json'
    a.click()
    URL.revokeObjectURL(url)
    success('Data Exported', 'Downloaded linkoptimize-export.json.')
  }

  // Loading State
  if (stateMode === 'loading') {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  // Error State
  if (stateMode === 'error') {
    return (
      <div className="py-12 animate-fade-in max-w-xl mx-auto">
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Failed to load settings
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
              Could not retrieve user configuration and integration tokens.
            </p>
            {onStateModeChange && (
              <Button variant="primary" onClick={() => onStateModeChange('normal')}>
                Retry Loading
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty State
  if (stateMode === 'empty') {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Workspace Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Customize your profile identity, appearance themes, and AI parameters.
          </p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              icon="file"
              title="No Saved Settings Found"
              description="No custom workspace configuration or connected profiles detected in local storage."
              action={{
                label: 'Initialize Default Settings',
                onClick: () => onStateModeChange?.('normal'),
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Normal populated state
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Workspace Settings
          </h1>
          <Badge variant="linkedin" size="sm">
            Preferences
          </Badge>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize your profile identity, appearance themes, and AI generation parameters.
        </p>
      </div>

      {/* 1. Account & Profile Identity */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <User className="h-4 w-4 text-[#0a66c2]" />
            Profile & Account Identity
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Personalize the name and headline associated with your generated content
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Display Name
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Professional Headline
                </label>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  LinkedIn Vanity URL Identifier
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-500">
                    in/
                  </span>
                  <Input
                    value={vanityName}
                    onChange={(e) => setVanityName(e.target.value)}
                    className="rounded-l-none"
                    placeholder="username"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" size="sm" leftIcon={<Save className="h-3.5 w-3.5" />}>
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Theme & Appearance */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            Appearance & Theme
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select your preferred visual style for the dashboard and post preview studio
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Light Mode', icon: Sun, desc: 'Clean white background' },
              { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Deep slate background' },
              { id: 'system', label: 'System Match', icon: Laptop, desc: 'Follows OS preference' },
            ].map((item) => {
              const Icon = item.icon
              const isSelected = theme === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setTheme(item.id as Theme)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'border-[#0a66c2] bg-blue-50/60 dark:bg-blue-950/40 text-[#0a66c2] dark:text-blue-400 ring-2 ring-[#0a66c2]/20'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-2" />
                  <span className="text-xs font-bold">{item.label}</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. Official LinkedIn Account Integration (OAuth 2.0) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-[#0a66c2]" />
                LinkedIn Account Authorization (OAuth 2.0)
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Connect your official LinkedIn profile for direct one-click post publishing from Post Studio
              </p>
            </div>
            {linkedinStatus && (
              <Badge
                variant={linkedinStatus.isConnected ? 'success' : (linkedinStatus.isConfigured ? 'default' : 'warning')}
                size="sm"
              >
                {linkedinStatus.isConnected
                  ? 'Connected'
                  : linkedinStatus.isExpired
                  ? 'Authorization Expired'
                  : linkedinStatus.isConfigured
                  ? 'Disconnected'
                  : 'Setup Needed'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          {isLoadingLinkedIn ? (
            <div className="p-6 text-center">
              <RefreshCw className="h-6 w-6 animate-spin text-[#0a66c2] mx-auto mb-2" />
              <p className="text-xs text-slate-500">Checking LinkedIn authorization status...</p>
            </div>
          ) : linkedinStatus?.isConnected ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-200/70 bg-emerald-50/40 dark:border-emerald-950/60 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  {linkedinStatus.memberPicture ? (
                    <img
                      src={linkedinStatus.memberPicture}
                      alt={linkedinStatus.memberName}
                      className="h-12 w-12 rounded-xl object-cover border border-emerald-300 dark:border-emerald-700 shadow-sm"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-[#0a66c2] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                      {linkedinStatus.memberName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {linkedinStatus.memberName}
                      </span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active Token
                      </span>
                    </div>
                    {linkedinStatus.memberEmail && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {linkedinStatus.memberEmail}
                      </p>
                    )}
                    {linkedinStatus.memberUrn && (
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Author URN: {linkedinStatus.memberUrn}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectLinkedIn}
                    isLoading={isDisconnecting}
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>

              {/* Scope details */}
              <div className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300 mb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Approved Permissions (OAuth 2.0 Scopes):</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(linkedinStatus.scopes || ['openid', 'profile', 'email', 'w_member_social']).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Tokens are stored exclusively in the server-side token store and are never exposed to browser storage.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">
                    <Linkedin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        No LinkedIn Account Connected
                      </span>
                      <Badge variant="default" size="sm">
                        Offline
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Authorize LinkedIn with <code className="text-[#0a66c2]">w_member_social</code> and OpenID Connect to enable direct publishing.
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConnectLinkedIn}
                  isLoading={isConnecting}
                  leftIcon={<Linkedin className="h-4 w-4" />}
                >
                  Connect LinkedIn
                </Button>
              </div>

              {!linkedinStatus?.isConfigured && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                    <Key className="h-4 w-4" /> Server Environment Configuration Required:
                  </p>
                  <p className="leading-relaxed">
                    To enable live OAuth authorization, add your LinkedIn Developer App credentials to your server <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">linkedin-optimizer/.env</code> file:
                  </p>
                  <pre className="p-2.5 rounded bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 font-mono text-[11px] overflow-x-auto text-slate-800 dark:text-slate-200">
                    LINKEDIN_CLIENT_ID=your_client_id_here{'\n'}
                    LINKEDIN_CLIENT_SECRET=your_client_secret_here{'\n'}
                    LINKEDIN_REDIRECT_URI={typeof window !== 'undefined' ? `${window.location.origin}/api/linkedin/callback` : 'https://your-domain.com/api/linkedin/callback'}
                  </pre>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Required Products on LinkedIn Developer Portal: <strong>Sign In with LinkedIn using OpenID Connect</strong> and <strong>Share on LinkedIn</strong>.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. AI & Generation Defaults */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-[#0a66c2]" />
            AI & Studio Defaults
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure default settings preloaded whenever you generate new posts
          </p>
        </CardHeader>
        <CardContent className="pt-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Default Tone of Voice
              </label>
              <select
                value={defaultTone}
                onChange={(e) => setDefaultTone(e.target.value as PostTone)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="storytelling">Storytelling & Narrative</option>
                <option value="educational">Educational & Frameworks</option>
                <option value="professional">Professional & Polished</option>
                <option value="personal-branding">Personal Branding</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Default Post Length
              </label>
              <select
                value={defaultLength}
                onChange={(e) => setDefaultLength(e.target.value as PostLength)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="short">Short (~100 words)</option>
                <option value="medium">Medium (~250 words)</option>
                <option value="long">Long (~400 words)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Auto-inject high-ranking hashtags
              </p>
              <p className="text-[11px] text-slate-500">
                Automatically append 3–5 trending industry hashtags to post drafts
              </p>
            </div>
            <input
              type="checkbox"
              checked={autoHashtags}
              onChange={(e) => setAutoHashtags(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0a66c2] focus:ring-[#0a66c2]"
            />
          </div>
        </CardContent>
      </Card>

      {/* 5. Data & Export */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-600" />
            Data Backup & Privacy
          </CardTitle>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Export your workspace content or manage stored browser state
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Export Stored Drafts & Audits
              </p>
              <p className="text-[11px] text-slate-500">
                Download a JSON backup of all generated posts and profile optimization versions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportData}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Export JSON
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
