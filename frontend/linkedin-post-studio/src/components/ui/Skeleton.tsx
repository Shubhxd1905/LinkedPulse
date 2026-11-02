import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({ className, variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  const baseClass = 'skeleton-shimmer rounded bg-slate-200 dark:bg-slate-700'

  const variants = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const style = {
    width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
  }

  if (lines > 1) {
    return (
      <div className={cn('space-y-2.5', className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(baseClass, variants[variant], i === lines - 1 ? 'w-3/4' : 'w-full')}
            style={{ ...style, width: i === lines - 1 ? '75%' : style.width }}
          />
        ))}
      </div>
    )
  }

  return <div className={cn(baseClass, variants[variant], className)} style={style} />
}

// Pre-built skeleton composites
export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton lines={3} />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 border border-border rounded-xl p-5 space-y-3">
      <Skeleton width={120} height={12} />
      <Skeleton width={80} height={28} />
      <Skeleton width="60%" height={10} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton width={40} height={40} variant="rectangular" />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton width={60} height={24} variant="rectangular" />
        </div>
      ))}
    </div>
  )
}
