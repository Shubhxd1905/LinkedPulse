import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'linkedin'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  const variants = {
    default: 'bg-white/12 text-slate-100 border border-white/15',
    success: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
    warning: 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
    error: 'bg-rose-500/20 text-rose-200 border border-rose-400/30',
    info: 'bg-indigo-500/25 text-indigo-200 border border-indigo-400/30',
    linkedin: 'bg-sky-500/20 text-sky-200 border border-sky-400/30',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}

