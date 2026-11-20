import { type ReactNode } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from '@/components/landing/LandingPage'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'
import { AuthCallback } from '@/components/auth/AuthCallback'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { GuestOverviewPage } from '@/pages/GuestOverviewPage'
import { ProfileOptimizerPage } from '@/pages/ProfileOptimizerPage'
import { PostStudioPage } from '@/pages/PostStudioPage'
import { DraftsHistoryPage } from '@/pages/DraftsHistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ProfileAuditLoader } from '@/components/ui/ProfileAuditLoader'

export function App() {
  const renderProtected = (page: ReactNode) => (
    <AuthGuard>
      <AppLayout>{page}</AppLayout>
    </AuthGuard>
  )

  return (
    <>
      <ProfileAuditLoader />
      <Routes>
      {/* 1. Public Landing & Guest Overview Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/guest" element={<GuestOverviewPage />} />

      {/* Public Auth Pages */}
      <Route path="/login" element={<LoginForm />} />
      <Route path="/signup" element={<SignupForm />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* 2. Dashboard (Protected) */}
      <Route path="/dashboard" element={renderProtected(<DashboardPage />)} />

      {/* 3. LinkedIn Profile Optimizer (Protected) */}
      <Route path="/optimize" element={renderProtected(<ProfileOptimizerPage />)} />

      {/* 4. Image-to-LinkedIn Post Generator (Protected) */}
      <Route path="/post-studio" element={renderProtected(<PostStudioPage />)} />

      {/* 5. Saved Drafts and History (Protected) */}
      <Route path="/drafts" element={renderProtected(<DraftsHistoryPage />)} />
      {/* Route alias for /content */}
      <Route path="/content" element={renderProtected(<DraftsHistoryPage />)} />

      {/* 6. Settings (Protected) */}
      <Route path="/settings" element={renderProtected(<SettingsPage />)} />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  )
}

export default App
