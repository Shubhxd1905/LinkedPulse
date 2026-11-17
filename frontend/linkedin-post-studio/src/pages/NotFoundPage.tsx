import { Link } from 'react-router-dom'
import { Home, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center space-y-6 glass-lg rounded-3xl p-8">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-extrabold text-3xl shadow-sm">
          404
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-200">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link to="/">
            <Button variant="outline" size="sm" leftIcon={<Home className="h-4 w-4" />}>
              Landing Page
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="sm" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
              Open Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

