import { useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCheck,
  Sparkles,
  FolderOpen,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  PlusCircle,
  Linkedin,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { LocalStorageMigrationBanner } from '@/components/layout/LocalStorageMigrationBanner'
import { cn } from '@/lib/utils'

export type DemoStateMode = 'normal' | 'loading' | 'empty' | 'error'

interface AppLayoutProps {
  children: ReactNode
  stateMode?: DemoStateMode
  onStateModeChange?: (mode: DemoStateMode) => void
}

export function AppLayout({ children, stateMode = 'normal', onStateModeChange }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      label: 'Profile Optimizer',
      path: '/optimize',
      icon: UserCheck,
      badge: 'AI Audit',
    },
    {
      label: 'Image Post Generator',
      path: '/post-studio',
      icon: Sparkles,
      badge: 'Visual AI',
    },
    {
      label: 'Saved Drafts & History',
      path: '/drafts',
      icon: FolderOpen,
      badge: '3',
    },
    {
      label: 'Settings',
      path: '/settings',
      icon: Settings,
      badge: undefined,
    },
  ]

  const isActive = (path: string) => {
    if (path === '/drafts' && location.pathname === '/content') return true
    return location.pathname === path
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top App Bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a66c2] text-white">
              <Linkedin className="h-5 w-5 fill-current" />
            </div>
            <span className="text-base tracking-tight">LinkOptimize</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-600" />}
          </button>
          <Link
            to="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0a66c2]/10 font-semibold text-[#0a66c2] dark:bg-[#0a66c2]/20 dark:text-blue-400"
          >
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform bg-white p-5 shadow-2xl transition-transform duration-300 ease-in-out md:hidden dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-slate-200 dark:border-slate-800">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 font-bold text-slate-900 dark:text-white"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a66c2] text-white shadow-md shadow-[#0a66c2]/20">
                <Linkedin className="h-5 w-5 fill-current" />
              </div>
              <div>
                <span className="text-base tracking-tight font-extrabold block">LinkOptimize</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block -mt-1">
                  AI SaaS Platform
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path)
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-[#0a66c2] text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Mobile View State Switcher */}
          {onStateModeChange && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Simulate View State:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['normal', 'loading', 'empty', 'error'] as DemoStateMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      onStateModeChange(mode)
                      setMobileMenuOpen(false)
                    }}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-semibold capitalize transition-all text-center',
                      stateMode === mode
                        ? 'bg-[#0a66c2] text-white shadow-sm'
                        : 'bg-white text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Card & Logout on Mobile */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0a66c2] text-sm font-bold text-white">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {user?.displayName || 'Alex Rivera'}
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.email || 'demo@linkoptimize.dev'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a66c2] text-white shadow-md shadow-[#0a66c2]/20">
              <Linkedin className="h-5 w-5 fill-current" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white block">
                LinkOptimize
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block -mt-1">
                AI Studio
              </span>
            </div>
          </Link>
          <Badge variant="linkedin" size="sm" className="font-semibold text-[10px]">
            PRO
          </Badge>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Workspace
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path)
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-[#0a66c2] text-white shadow-sm shadow-[#0a66c2]/30'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4 transition-transform group-hover:scale-110', active ? 'text-white' : 'text-slate-400 dark:text-slate-400')} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Quick Action Button */}
          <div className="mt-8 px-1">
            <Link
              to="/post-studio"
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0a66c2] to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0a66c2]/20 hover:opacity-95 transition-opacity"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create New Post</span>
            </Link>
          </div>

          {/* Pro Status Widget */}
          <div className="mt-8 rounded-xl border border-slate-200/80 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 p-4 dark:border-slate-800 dark:from-slate-800/60 dark:to-slate-800/20">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0a66c2] dark:text-blue-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                AI Optimization Quota
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">42 / 50</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div className="h-full rounded-full bg-[#0a66c2]" style={{ width: '84%' }} />
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Renews on 1st of next month • Unlimited draft storage
            </p>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-slate-100 transition-colors dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0a66c2] text-sm font-bold text-white shadow-sm">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                    {user?.displayName || 'Alex Rivera'}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {user?.email || 'demo@linkoptimize.dev'}
                  </p>
                </div>
              </div>
              <ChevronRight className={cn('h-4 w-4 text-slate-400 transition-transform', userMenuOpen && 'rotate-90')} />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-800 animate-slide-up">
                <Link
                  to="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Account Settings
                </Link>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-w-0">
        {/* Desktop Top Navigation Bar */}
        <header className="hidden md:flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
              Overview
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {navItems.find((n) => isActive(n.path))?.label || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Interactive Demo State Controller (allows instant inspection of Loading, Empty, and Error states) */}
            {onStateModeChange && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">View State:</span>
                {(['normal', 'loading', 'empty', 'error'] as DemoStateMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onStateModeChange(mode)}
                    className={cn(
                      'rounded px-2.5 py-1 text-xs font-semibold capitalize transition-all',
                      stateMode === mode
                        ? 'bg-[#0a66c2] text-white shadow-sm ring-1 ring-[#0a66c2]'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </button>

            <Link to="/post-studio">
              <Button size="sm" variant="primary" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
                Generate Post
              </Button>
            </Link>
          </div>
        </header>

        {/* Global Error Banner if stateMode === 'error' */}
        {stateMode === 'error' && (
          <div className="mx-6 mt-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300 animate-slide-up">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-sm font-bold">Simulated Service Warning / Connection Error</p>
                <p className="text-xs text-red-700 dark:text-red-400">
                  This demonstrates how error states and recovery flows are cleanly handled across the UI.
                </p>
              </div>
            </div>
            {onStateModeChange && (
              <Button
                size="sm"
                variant="outline"
                className="bg-white hover:bg-red-50 text-red-700 border-red-300 dark:bg-slate-900 dark:text-red-400 dark:border-red-800"
                onClick={() => onStateModeChange('normal')}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Dismiss & Retry
              </Button>
            )}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <LocalStorageMigrationBanner />
          {children}
        </main>
      </div>
    </div>
  )
}
