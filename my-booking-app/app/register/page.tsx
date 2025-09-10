'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { register as registerRequest } from '@/services/api'
import { Box, Button, TextField, Typography, Stack } from '@mui/material'
import { motion } from 'framer-motion'

export default function RegisterPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    setError('')
    setSuccess(false)

    if (!firstName || !lastName) {
      setError('Bitte Vor- und Nachnamen eingeben.');
      return;
    }

    try {
      const res = await registerRequest(email, password, firstName, lastName) // Angepasst an die neue API-Funktion
      if (res.user) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } else {
        setError(res.message)
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registrierung fehlgeschlagen')
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Box display="flex" flexDirection="column" maxWidth={400} margin="auto" gap={2} mt={10} p={2}>
        <Typography variant="h5">Registrieren</Typography>

        <Stack direction="row" spacing={2}>
          <TextField
            label="Vorname"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Nachname"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            fullWidth
          />
        </Stack>
        
        <TextField
          label="E-Mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <TextField
          label="Passwort"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <Typography color="error">{error}</Typography>}
        {success && <Typography color="primary">✅ Erfolgreich registriert. Du wirst weitergeleitet...</Typography>}

        <Button variant="contained" onClick={handleRegister}>
          Konto erstellen
        </Button>

        <Button variant="text" onClick={() => router.push('/login')}>
          Schon einen Account? Einloggen
        </Button>
      </Box>
    </motion.div>
  )
}