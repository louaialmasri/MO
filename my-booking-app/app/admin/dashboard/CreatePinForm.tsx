// my-booking-app/app/admin/dashboard/CreatePinForm.tsx

'use client'

import { useState } from 'react'
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material'
import KeyIcon from '@mui/icons-material/Key'
import { useAuth } from '../../../context/AuthContext'
import { setDashboardPin } from '../../../services/api' // Diese Funktion müssen wir noch in api.ts erstellen

interface CreatePinFormProps {
  onPinCreated: () => void // Eine Funktion, um die Hauptseite zu benachrichtigen
}

export default function CreatePinForm({ onPinCreated }: CreatePinFormProps) {
  const { token, refreshUser } = useAuth()
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (pin.length < 4 || pin.length > 6) {
      setError('Die PIN muss zwischen 4 und 6 Ziffern lang sein.')
      return
    }
    if (pin !== confirmPin) {
      setError('Die PINs stimmen nicht überein.')
      return
    }
    if (!password) {
      setError('Bitte gib zur Bestätigung dein Passwort ein.')
      return
    }

    setIsSaving(true)
    try {
      if (!token) throw new Error('Nicht authentifiziert')
      await setDashboardPin(password, pin, token)
      setSuccess('PIN erfolgreich erstellt! Du wirst gleich weitergeleitet...')

      // Lade die Benutzerdaten neu, damit `hasDashboardPin` auf `true` wechselt
      await refreshUser()

      // Gib der Hauptseite Bescheid, dass sie den Inhalt anzeigen kann
      setTimeout(() => {
        onPinCreated()
      }, 2000)
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.message || 'Ein Fehler ist aufgetreten.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400, borderRadius: 2 }}>
        <Stack spacing={2} alignItems="center">
          <KeyIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h5" component="h1" gutterBottom>
            Dashboard-PIN erstellen
          </Typography>
          <Typography color="text.secondary" textAlign="center" sx={{ mb: 2 }}>
            Da du zum ersten Mal auf diesen Bereich zugreifst, erstelle bitte eine
            4- bis 6-stellige PIN für den schnellen Zugriff.
          </Typography>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <Stack spacing={2}>
              <TextField
                label="Aktuelles Account-Passwort"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="Neue PIN (4-6 Ziffern)"
                type="password" // Verwendet den Typ "password" um die Ziffern zu verbergen
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} // Erlaubt nur Ziffern
                inputProps={{ maxLength: 6, pattern: '\\d*' }}
                fullWidth
                required
              />
              <TextField
                label="PIN bestätigen"
                type="password"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                inputProps={{ maxLength: 6, pattern: '\\d*' }}
                fullWidth
                required
              />
              {error && <Alert severity="error">{error}</Alert>}
              {success && <Alert severity="success">{success}</Alert>}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSaving}
                sx={{ mt: 2, py: 1.5 }}
              >
                {isSaving ? <CircularProgress size={24} /> : 'PIN festlegen'}
              </Button>
            </Stack>
          </form>
        </Stack>
      </Paper>
    </Box>
  )
}