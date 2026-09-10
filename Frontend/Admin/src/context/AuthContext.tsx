import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { applyAccent, getUserAccent } from '@/utils/themeUtils'
import { apiRequest } from '@/services/apiClient'

export interface UserProfile {
  _id: string
  name: string
  email: string
  type: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'CUSTOMER'
  status: 'ACTIVE' | 'INACTIVE'
  roles?: any[]
  avatar?: string
  accentColor?: string
}

interface AuthContextType {
  user: UserProfile | null
  permissions: string[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, pass: string) => Promise<boolean>
  logout: () => Promise<void>
  hasPermission: (perm: string) => boolean
  hasAnyPermission: (perms: string[]) => boolean
  fetchMe: () => Promise<void>
  updateUser: (data: Partial<UserProfile>) => void
  updateProfileApi: (name: string, email: string, accentColor?: string, avatar?: string) => Promise<UserProfile>
  changePasswordApi: (currentPassword: string, newPassword: string) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    if (user?.email) {
      applyAccent(getUserAccent(user.email), user.email)
    }
  }, [user?.email])

  const updateUser = useCallback((data: Partial<UserProfile>) => {
    setUser(prev => {
      const base: UserProfile = prev || {
        _id: '1',
        name: 'Super Admin',
        email: 'admin@livwee.com',
        type: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
      const updated = { ...base, ...data }
      localStorage.setItem('medikit-user-profile', JSON.stringify(updated))
      return updated
    })
  }, [])

  const updateProfileApi = useCallback(async (name: string, email: string, accentColor?: string, avatar?: string) => {
    const data = await apiRequest<{ success: boolean; user: UserProfile }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, email, accentColor, avatar })
    })

    if (!data.success || !data.user) {
      throw new Error('Failed to update profile in database')
    }

    if (data.user?.accentColor) {
      applyAccent(getUserAccent(data.user.email), data.user.email)
    }

    setUser(data.user)
    localStorage.setItem('medikit-user-profile', JSON.stringify(data.user))
    return data.user
  }, [])

  const changePasswordApi = useCallback(async (currentPassword: string, newPassword: string) => {
    const data = await apiRequest<{ success: boolean }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    })

    if (!data.success) {
      throw new Error('Failed to change password')
    }

    return true
  }, [])

  const fetchMe = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await apiRequest<{ success: boolean; user: UserProfile; permissions?: string[] }>('/auth/me')
      if (data.success && data.user) {
        setUser(data.user)
        setPermissions(data.permissions || [])
        localStorage.setItem('medikit-user-profile', JSON.stringify(data.user))
      } else {
        const savedProfile = localStorage.getItem('medikit-user-profile')
        if (savedProfile) {
          try {
            setUser(JSON.parse(savedProfile))
          } catch {
            setUser(null)
          }
        } else {
          setUser(null)
        }
        setPermissions([])
      }
    } catch (err) {
      console.error('Failed to fetch me session:', err)
      const savedProfile = localStorage.getItem('medikit-user-profile')
      if (savedProfile) {
        try {
          setUser(JSON.parse(savedProfile))
        } catch {
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setPermissions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMe()
  }, [fetchMe])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiRequest<{ success: boolean; user: UserProfile; token?: string; permissions?: string[] }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })

      if (!data.success || !data.user) {
        throw new Error('Login failed')
      }

      if (data.token) {
        localStorage.setItem('livwee-token', data.token)
        localStorage.setItem('medikit-token', data.token)
      }

      setUser(data.user)
      setPermissions(data.permissions || [])
      localStorage.setItem('medikit-user-profile', JSON.stringify(data.user))
      return true
    } catch (err) {
      throw err
    }
  }

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      localStorage.removeItem('livwee-token')
      localStorage.removeItem('medikit-token')
      localStorage.removeItem('medikit-user-profile')
      setUser(null)
      setPermissions([])
    }
  }

  const hasPermission = (perm: string): boolean => {
    if (!user) return false
    if (user.type === 'SUPER_ADMIN') return true
    return permissions.includes(perm)
  }

  const hasAnyPermission = (perms: string[]): boolean => {
    if (!user) return false
    if (user.type === 'SUPER_ADMIN') return true
    return perms.some(p => permissions.includes(p))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
        hasAnyPermission,
        fetchMe,
        updateUser,
        updateProfileApi,
        changePasswordApi
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
