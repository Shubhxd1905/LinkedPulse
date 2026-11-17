import { useState, useEffect, useRef, type ReactNode } from 'react'
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
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { resolvedTheme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!userMenuOpen) return
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [userMenuOpen])

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
    <div className="min-h-screen text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Top App Bar */}
      <header className="md:hidden sticky top-0 z-40 flex h-16 items-center justify-between px-4 glass border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-white">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30">
              <Linkedin className="h-5 w-5 fill-current" />
            </div>
            <span className="text-base tracking-tight">LinkedPulse</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-white/80" />}
          </button>
          <Link
            to="/settings"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/30 font-semibold text-white border border-indigo-400/30"
          >
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 transform glass-lg p-5 shadow-2xl transition-transform duration-300 ease-in-out md:hidden border-r border-white/10 flex flex-col justify-between',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div>
          <div className="flex items-center justify-between pb-5 border-b border-white/10">
            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 font-bold text-white"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30">
                <Linkedin className="h-5 w-5 fill-current" />
              </div>
              <div>
                <span className="text-base tracking-tight font-extrabold block text-white">LinkedPulse</span>
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-300 block -mt-1">
                  AI SaaS Platform
                </span>
              </div>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
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
                  data-profile-audit-trigger={item.path === '/optimize' ? 'true' : undefined}
                  data-audit-label={item.path === '/optimize' ? 'Loading Profile Audit...' : undefined}
                  data-audit-step={item.path === '/optimize' ? 'Loading Profile Audit workspace...' : undefined}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-indigo-500/80 text-white shadow-sm shadow-indigo-500/30 border border-indigo-400/30'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
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
                          : 'bg-white/12 text-slate-200'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Card & Logout on Mobile */}
        <div className="pt-4 border-t border-white/15">
          <div className="flex items-center gap-3 rounded-xl bg-white/8 border border-white/15 p-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/60 text-sm font-bold text-white shadow-sm border border-indigo-400/30">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {user?.displayName || 'Alex Rivera'}
              </p>
              <p className="truncate text-xs text-slate-300">
                {user?.email || 'demo@linkedpulse.dev'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30 border-r border-white/10 glass-lg">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-white/10">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30">
              <Linkedin className="h-5 w-5 fill-current" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block">
                LinkedPulse
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-slate-300 uppercase block -mt-1">
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
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
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
                  data-profile-audit-trigger={item.path === '/optimize' ? 'true' : undefined}
                  data-audit-label={item.path === '/optimize' ? 'Loading Profile Audit...' : undefined}
                  data-audit-step={item.path === '/optimize' ? 'Loading Profile Audit workspace...' : undefined}
                  className={cn(
                    'group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                    active
                      ? 'bg-indigo-500/80 text-white shadow-sm shadow-indigo-500/30 border border-indigo-400/30'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4 transition-transform group-hover:scale-110', active ? 'text-white' : 'text-slate-300')} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-white/12 text-slate-200'
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
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500/80 to-cyan-500/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-cyan-500 transition-all border border-white/10"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create New Post</span>
            </Link>
          </div>

          {/* AI Quota Widget */}
          <div className="mt-6 rounded-xl border border-white/15 bg-white/8 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-200 min-w-0 truncate">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">AI Quota</span>
              </span>
              <span className="text-xs font-bold text-white whitespace-nowrap shrink-0">
                42 / 50
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400" style={{ width: '84%' }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-300">
              Renews on 1st of next month • Unlimited draft storage
            </p>
          </div>
        </div>

        {/* User Footer Profile */}
        <div className="border-t border-white/15 p-4">
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/60 text-sm font-bold text-white shadow-sm border border-indigo-400/30">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">
                    {user?.displayName || 'Alex Rivera'}
                  </p>
                  <p className="truncate text-[11px] text-slate-300">
                    {user?.email || 'demo@linkedpulse.dev'}
                  </p>
                </div>
              </div>
              <ChevronRight className={cn('h-4 w-4 shrink-0 text-slate-300 transition-transform', userMenuOpen && '-rotate-90')} />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div
                role="menu"
                className="absolute bottom-full left-0 z-50 mb-2 w-full rounded-xl glass-overlay p-1.5 animate-slide-up"
              >
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Settings className="h-3.5 w-3.5 text-indigo-300" />
                  Account Settings
                </Link>
                <div className="my-1 h-px bg-white/10" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleLogout()
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
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
        <header className="hidden md:flex h-16 items-center justify-between border-b border-white/15 glass px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
              Overview
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-sm font-semibold text-white">
              {navItems.find((n) => isActive(n.path))?.label || 'Overview'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-slate-200 transition-colors hover:bg-white/15 hover:text-white"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-300" />
              ) : (
                <Moon className="h-4 w-4 text-slate-200" />
              )}
            </button>

            <Link to="/post-studio">
              <Button size="sm" variant="primary" leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
                Generate Post
              </Button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <LocalStorageMigrationBanner />
          {children}
        </main>
      </div>
    </div>
  )
}
