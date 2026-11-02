import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { ToastMessage } from '@/types'
import { generateId } from '@/lib/utils'

interface ToastOptions {
  title: string
  description?: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastContextType {
  toasts: ToastMessage[]
  toast: (options: ToastOptions) => void
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = generateId()
      const newToast = { ...toast, id }
      setToasts((prev) => [...prev, newToast])

      const duration = toast.duration ?? 4000
      setTimeout(() => removeToast(id), duration)
    },
    [removeToast]
  )

  const toast = useCallback(
    ({ title, description, variant = 'info', duration }: ToastOptions) => {
      addToast({ type: variant, title, description, duration })
    },
    [addToast]
  )

  const success = useCallback(
    (title: string, description?: string) => addToast({ type: 'success', title, description }),
    [addToast]
  )

  const error = useCallback(
    (title: string, description?: string) => addToast({ type: 'error', title, description }),
    [addToast]
  )

  const warning = useCallback(
    (title: string, description?: string) => addToast({ type: 'warning', title, description }),
    [addToast]
  )

  const info = useCallback(
    (title: string, description?: string) => addToast({ type: 'info', title, description }),
    [addToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, toast, addToast, removeToast, success, error, warning, info }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
