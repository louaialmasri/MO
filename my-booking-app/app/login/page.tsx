// my-booking-app/app/login/page.tsx

'use client'

import { useState } from 'react'
// NEU: useSearchParams importieren
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { login as loginRequest } from '@/services/api'
import { Box, Button, TextField, Typography } from '@mui/material'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  // NEU: searchParams-Hook initialisieren
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')

    try {
      const { token, user } = await loginRequest(email, password)
      localStorage.setItem('token', token)
      login(user, token)

      // --- HIER DIE ÄNDERUNG ---
      // Prüfen, ob ein 'redirect'-Parameter in der URL vorhanden ist.
      const redirectPath = searchParams.get('redirect');

      if (redirectPath) {
        // Wenn ja, dorthin weiterleiten.
        router.push(redirectPath)
      } else {
        // Ansonsten die bestehende rollenbasierte Weiterleitung nutzen.
        if (user.role === 'admin') {
          router.push('/admin')
        } else if (user.role === 'staff') {
          router.push('/staff-dashboard')
        } else {
          router.push('/dashboard')
        }
      }
      // --- ENDE DER ÄNDERUNG ---

    } catch (err: any) {
      setError(err.response?.data?.message || 'Login fehlgeschlagen')
    }
  }

  // ... (restliche Komponente bleibt unverändert)
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box display="flex" flexDirection="column" maxWidth={400} margin="auto" gap={3} mt={10}>
        <Typography variant="h5">Login</Typography>

        <TextField
          label="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label="Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <Typography color="error">{error}</Typography>}

        <Button variant="contained" onClick={handleLogin}>
          Einloggen
        </Button>

        <Button variant="outlined" onClick={() => router.push('/register')}>
          Noch kein Account? Registrieren
        </Button>
      </Box>
    </motion.div>
  )
}