import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@/types'
import { apiLogin, apiRegister, apiLogout, apiGetCurrentUser, apiSupabaseTokenExchange } from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithSupabaseToken: (accessToken: string, email: string, name: string) => Promise<void>
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

    // Listen to Supabase auth state change (e.g. from magic links or token redirects)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if (event === 'SIGNED_OUT') {
        setUser(null)
        return
      }
      // Only exchange token on explicit new SIGNED_IN event (such as magic link click or OAuth redirect)
      if (event === 'SIGNED_IN') {
        if (session?.access_token && session.user?.email) {
          try {
            const email = session.user.email
            const name =
              session.user.user_metadata?.full_name ||
              session.user.user_metadata?.name ||
              email.split('@')[0]
            const res = await apiSupabaseTokenExchange(session.access_token, email, name)
            if (mounted && res?.user) {
              setUser({
                id: res.user.id,
                email: res.user.email,
                displayName: res.user.name,
                avatarUrl: null,
                linkedinConnected: false,
                createdAt: res.user.createdAt,
              })
            }
          } catch {
            // ignore error if exchange fails or token already used
          }
        }
      }
    })

    return () => {
      mounted = false
      authListener?.subscription?.unsubscribe()
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

  const loginWithSupabaseToken = useCallback(
    async (accessToken: string, email: string, name: string) => {
      setIsLoading(true)
      try {
        const res = await apiSupabaseTokenExchange(accessToken, email, name)
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
    },
    []
  )

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
      // Clear both backend session cookie and Supabase client-side session concurrently
      await Promise.allSettled([
        apiLogout(),
        supabase.auth.signOut(),
      ])
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
        loginWithSupabaseToken,
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
