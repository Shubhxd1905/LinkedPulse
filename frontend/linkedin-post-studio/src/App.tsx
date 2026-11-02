import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from '@/components/landing/LandingPage'
import { LoginForm } from '@/components/auth/LoginForm'
import { SignupForm } from '@/components/auth/SignupForm'
import { AppLayout, type DemoStateMode } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProfileOptimizerPage } from '@/pages/ProfileOptimizerPage'
import { PostStudioPage } from '@/pages/PostStudioPage'
import { DraftsHistoryPage } from '@/pages/DraftsHistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export function App() {
  const [stateMode, setStateMode] = useState<DemoStateMode>('normal')

  return (
    <Routes>
      {/* 1. Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public Auth Pages */}
      <Route path="/login" element={<LoginForm />} />
      <Route path="/signup" element={<SignupForm />} />

      {/* 2. Dashboard */}
      <Route
        path="/dashboard"
        element={
          <AppLayout stateMode={stateMode} onStateModeChange={setStateMode}>
            <DashboardPage stateMode={stateMode} onStateModeChange={setStateMode} />
          </AppLayout>
        }
      />

      {/* 3. LinkedIn Profile Optimizer */}
      <Route
        path="/optimize"
        element={
          <AppLayout stateMode={stateMode} onStateModeChange={setStateMode}>
            <ProfileOptimizerPage stateMode={stateMode} onStateModeChange={setStateMode} />
          </AppLayout>
        }
      />

      {/* 4. Image-to-LinkedIn Post Generator */}
      <Route
        path="/post-studio"
        element={
          <AppLayout stateMode={stateMode} onStateModeChange={setStateMode}>
            <PostStudioPage stateMode={stateMode} onStateModeChange={setStateMode} />
          </AppLayout>
        }
      />

      {/* 5. Saved Drafts and History */}
      <Route
        path="/drafts"
        element={
          <AppLayout stateMode={stateMode} onStateModeChange={setStateMode}>
            <DraftsHistoryPage stateMode={stateMode} onStateModeChange={setStateMode} />
          </AppLayout>
        }
      />
      {/* Route alias for /content */}
      <Route
        path="/content"
        element={
          <AppLayout stateMode={stateMode} onStateModeChange={setStateMode}>
            <DraftsHistoryPage stateMode={stateMode} onStateModeChange={setStateMode} />
          </AppLayout>
        }
      />

      {/* 6. Settings */}
      <Route
        path="/settings"
        element={
          <AppLayout stateMode={stateMode} onStateModeChange={setStateMode}>
            <SettingsPage stateMode={stateMode} onStateModeChange={setStateMode} />
          </AppLayout>
        }
      />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
