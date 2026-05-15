import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authApi } from '@/api/services'

interface User {
  user_id: string
  user_name: string
  avatar_seed?: string
}

interface AuthContextValue {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const r = await authApi.me()
      if (r.code === 0 && r.user_id && r.user_name) {
        setUser({
          user_id: r.user_id,
          user_name: r.user_name,
          avatar_seed: r.avatar_seed,
        })
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
