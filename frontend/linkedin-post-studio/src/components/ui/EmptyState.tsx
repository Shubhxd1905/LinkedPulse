import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { FileX, Inbox, Search } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: 'inbox' | 'search' | 'file' | ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon = 'inbox', title, description, action, className }: EmptyStateProps) {
  const icons: Record<'inbox' | 'search' | 'file', ReactNode> = {
    inbox: <Inbox className="h-12 w-12 text-slate-300 dark:text-slate-600" />,
    search: <Search className="h-12 w-12 text-slate-300 dark:text-slate-600" />,
    file: <FileX className="h-12 w-12 text-slate-300 dark:text-slate-600" />,
  }

  const iconElement =
    typeof icon === 'string' && icon in icons
      ? icons[icon as keyof typeof icons]
      : icon

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="mb-4">{iconElement}</div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">{description}</p>
      )}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
