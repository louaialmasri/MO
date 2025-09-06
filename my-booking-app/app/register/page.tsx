'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { register as registerRequest } from '@/services/api'
import { Box, Button, TextField, Typography } from '@mui/material'
import { motion } from 'framer-motion'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRegister = async () => {
    setError('')
    setSuccess(false)

    try {
      const res = await registerRequest(email, password, name, address, phone)
      if (res.success || res.message === 'Benutzer erfolgreich erstellt') {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box display="flex" flexDirection="column" maxWidth={400} margin="auto" gap={3} mt={10}>
        <Typography variant="h5">Registrieren</Typography>

        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <TextField
          label="Adresse"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
        <TextField
          label="Telefonnummer"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          label="E-Mail"
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
        {success && <Typography color="primary">✅ Erfolgreich registriert</Typography>}

        <Button variant="contained" onClick={handleRegister}>
          Registrieren
        </Button>

        <Button variant="outlined" onClick={() => router.push('/login')}>
          Schon einen Account? Einloggen
        </Button>
      </Box>
    </motion.div>
  )
}