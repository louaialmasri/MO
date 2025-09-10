'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface AuthUser {
  email: string
  role: 'user' | 'admin' | 'staff'
  firstName?: string,
  lastName?: string,
  name?: string,
  _id?: string
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (user: AuthUser, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {
    throw new Error('login() not implemented')
  },
  logout: () => {
    throw new Error('logout() not implemented')
  },
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')

    if (storedUser && storedToken) {
      try {
        const parsed = JSON.parse(storedUser)
        setUser(parsed)
        setToken(storedToken)
      } catch (err) {
        console.error('Fehler beim Parsen von localStorage:', err)
        logout()
      } finally {
        setLoading(false)
      }
    }

    // Axios 401-Interceptor
    const axios = require('axios').default || require('axios')
    const interceptor = axios.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error.response && error.response.status === 401) {
          logout()
        }
        return Promise.reject(error)
      }
    )
    return () => {
      axios.interceptors.response.eject(interceptor)
    }
  }, [])

  const login = (user: AuthUser, token: string) => {
    setUser(user)
    setToken(token)
    localStorage.setItem('user', JSON.stringify(user))
    localStorage.setItem('token', token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
