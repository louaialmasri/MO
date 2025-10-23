'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { User } from '../services/api';

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  salonId: string | null;
  // NEU: permissions hinzufügen
  permissions: string[];
  login: (user: User, token: string) => void
  logout: () => void
  selectSalon: (id: string) => void
  // NEU: Funktion zum Prüfen einer Berechtigung
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  salonId: null,
  permissions: [], // NEU: Initial leer
  login: (user: User, token: string) => {},
  logout: () => {},
  selectSalon: (id: string) => {},
  hasPermission: (permission: string) => false, // NEU: Standardmäßig false
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [salonId, setSalonId] = useState<string | null>(null);
  // NEU: State für permissions
  const [permissions, setPermissions] = useState<string[]>([]);

  const login = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser)
    setToken(authToken)
    // NEU: Permissions aus dem User-Objekt setzen
    setPermissions(loggedInUser.permissions || []);
    localStorage.setItem('user', JSON.stringify(loggedInUser))
    localStorage.setItem('token', authToken)
    // Optional: Permissions auch im Local Storage speichern? Eher nicht nötig, da sie im User-Objekt sind.
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setSalonId(null)
    setPermissions([]); // NEU: Permissions zurücksetzen
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('salonId')
  }

  const selectSalon = (id: string) => {
    setSalonId(id)
    localStorage.setItem('salonId', id)
  }

  // NEU: Funktion zum Prüfen einer Berechtigung
  const hasPermission = (permission: string): boolean => {
      // Admins haben immer Zugriff
      if (user?.role === 'admin') {
          return true;
      }
      // Staff braucht die explizite Berechtigung
      if (user?.role === 'staff') {
          return permissions.includes(permission);
      }
      // Normale User haben keine Sonderrechte
      return false;
  };


  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const storedToken = localStorage.getItem('token')
    const storedSalonId = localStorage.getItem('salonId')

    if (storedUser && storedToken) {
      try {
        const parsedUser: User = JSON.parse(storedUser); // Typ User zuweisen
        setUser(parsedUser);
        setToken(storedToken);
        // NEU: Permissions beim Laden aus Local Storage setzen
        setPermissions(parsedUser.permissions || []);
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
    permissions, // NEU: permissions bereitstellen
    login,
    logout,
    selectSalon,
    hasPermission, // NEU: hasPermission bereitstellen
  }), [user, token, loading, salonId, permissions]) // NEU: permissions als Abhängigkeit

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext)
