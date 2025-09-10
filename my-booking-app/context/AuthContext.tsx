'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@/services/api'; // Importiere den vereinheitlichten User-Typ

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  login: (user: User, token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      } catch (err) {
        console.error('Fehler beim Parsen von localStorage:', err)
        logout()
      }
    }
    setLoading(false)
  }, [])

  const login = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser)
    setToken(authToken)
    localStorage.setItem('user', JSON.stringify(loggedInUser))
    localStorage.setItem('token', authToken)
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