import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@/types'
import { apiLogin, apiRegister, apiLogout, apiGetCurrentUser } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiGetCurrentUser()
      if (res && res.user) {
        setUser({
          id: res.user.id,
          email: res.user.email,
          displayName: res.user.name,
          avatarUrl: null,
          linkedinConnected: false,
          createdAt: res.user.createdAt,
        })
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    apiGetCurrentUser()
      .then((res) => {
        if (!mounted) return
        if (res && res.user) {
          setUser({
            id: res.user.id,
            email: res.user.email,
            displayName: res.user.name,
            avatarUrl: null,
            linkedinConnected: false,
            createdAt: res.user.createdAt,
          })
        } else {
          setUser(null)
        }
      })
      .catch(() => {
        if (mounted) setUser(null)
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const res = await apiLogin(email, password)
      if (res && res.user) {
        setUser({
          id: res.user.id,
          email: res.user.email,
          displayName: res.user.name,
          avatarUrl: null,
          linkedinConnected: false,
          createdAt: res.user.createdAt,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(async (arg1: string, arg2: string, arg3: string) => {
    setIsLoading(true)
    try {
      // Support both (displayName, email, password) and (email, password, displayName)
      let name = arg1
      let email = arg2
      let password = arg3
      if (arg1.includes('@')) {
        email = arg1
        password = arg2
        name = arg3
      }
      const res = await apiRegister(name, email, password)
      if (res && res.user) {
        setUser({
          id: res.user.id,
          email: res.user.email,
          displayName: res.user.name,
          avatarUrl: null,
          linkedinConnected: false,
          createdAt: res.user.createdAt,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiLogout()
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
