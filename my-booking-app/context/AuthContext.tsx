'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import api, { User } from '../services/api';

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  salonId: string | null;
  permissions: string[];
  login: (user: User, token: string) => void
  logout: () => void
  selectSalon: (id: string) => void
  // Funktion zum Prüfen einer Berechtigung
  hasPermission: (permission: string) => boolean;
  refreshUser: () => Promise<void>;
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
  refreshUser: async () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [salonId, setSalonId] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);

  const login = (loggedInUser: User, authToken: string) => {
    setUser(loggedInUser)
    setToken(authToken)
    setPermissions(loggedInUser.permissions || []);
    localStorage.setItem('user', JSON.stringify(loggedInUser))
    localStorage.setItem('token', authToken)
    // Optional: Permissions auch im Local Storage speichern? Eher nicht nötig, da sie im User-Objekt sind.
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    setSalonId(null)
    setPermissions([]);
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    localStorage.removeItem('salonId')
  }

  const selectSalon = (id: string) => {
    setSalonId(id)
    localStorage.setItem('salonId', id)
  }

  // Funktion zum Prüfen einer Berechtigung
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

    const refreshUser = async () => {
    if (token) {
      try {
        // Wir verwenden den axios-Client 'api'
        const response = await api.get('/users/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.data.success && response.data.user) {
          const updatedUser = response.data.user;
          setUser(updatedUser);
          setPermissions(updatedUser.permissions || []);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } else {
           throw new Error('Invalid user data received');
        }
      } catch (error) {
        console.error("Fehler beim Aktualisieren der Benutzerdaten:", error);
        logout(); // Bei Fehler ausloggen
      }
    }
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
    permissions,
    login,
    logout,
    selectSalon,
    hasPermission,
    refreshUser,
  }), [user, token, loading, salonId, permissions]) // NEU: permissions als Abhängigkeit

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext)
