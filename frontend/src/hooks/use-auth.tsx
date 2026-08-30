import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import apiClient from '@/lib/api-client'

export interface AuthUser {
  id: number
  username: string
  email?: string
  phone?: string
  role: 'admin' | 'operator'
  display_name?: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  isAdmin: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await apiClient.post('/auth/me', {})
      if (data.success) setUser(data.data)
      else {
        localStorage.removeItem('auth_token')
        setUser(null)
      }
    } catch {
      localStorage.removeItem('auth_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const login = (token: string, u: AuthUser) => {
    localStorage.setItem('auth_token', token)
    setUser(u)
  }
  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin: user?.role === 'admin', login, logout, refresh }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
