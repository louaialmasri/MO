'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { User } from '@/services/api'; // Importiere den vereinheitlichten User-Typ
import { log } from 'console';

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  salonId: string | null;
  login: (user: User, token: string) => void
  logout: () => void
  selectSalon: (id: string) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  salonId: null,
  login: (user: User, token: string) => {},
  logout: () => {},
  selectSalon: (id: string) => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [salonId, setSalonId] = useState<string | null>(null);

  const login = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser)
    setToken(authToken)
    localStorage.setItem('user', JSON.stringify(loggedInUser))
    localStorage.setItem('token', authToken)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setSalonId(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('salonId')
  }

  const selectSalon = (id: string) => {
    setSalonId(id)
    localStorage.setItem('salonId', id)
  }

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    const storedSalonId = localStorage.getItem('salonId')

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser))
        setToken(storedToken)
      } catch (err) {
        console.error('Fehler beim Parsen von localStorage:', err)
        logout()
      }
    }

    if (storedSalonId) {
      setSalonId(storedSalonId)
    }

    setLoading(false)
  }, [])

  const value = useMemo(() => ({
    user,
    token,
    loading,
    salonId,
    login,
    logout,
    selectSalon,
  }), [user, token, loading, salonId])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext)