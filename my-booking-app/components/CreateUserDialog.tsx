'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Box,
  Snackbar,
  Alert,
} from '@mui/material'
import { useForm, Controller } from 'react-hook-form'
import { Close as CloseIcon } from '@mui/icons-material'
import { register } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

export type CreateUserFormData = {
  name: string
  address: string
  phone?: string
  email: string
  password: string
  role: 'user' | 'staff' | 'admin'
}

export default function CreateUserDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { token } = useAuth()
  const [successOpen, setSuccessOpen] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormData>()

  const onSubmit = async (data: CreateUserFormData) => {
    try {
      await register(
        data.email,
        data.password,
        data.name,
        data.address,
        data.phone,
        data.role
      )
      setSuccessOpen(true)
      reset()
      onClose()
    } catch (error) {
      console.error('Benutzererstellung fehlgeschlagen:', error)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth>
        <DialogTitle>
          Neuen Benutzer anlegen
          <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} display="flex" flexDirection="column" gap={2}>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Name erforderlich' }}
              render={({ field }) => (
                <TextField {...field} label="Name" fullWidth error={!!errors.name} helperText={errors.name?.message} />
              )}
            />

            <Controller
              name="address"
              control={control}
              rules={{ required: 'Adresse erforderlich' }}
              render={({ field }) => (
                <TextField {...field} label="Adresse" fullWidth error={!!errors.address} helperText={errors.address?.message} />
              )}
            />

            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Telefon (optional)" fullWidth />
              )}
            />

            <Controller
              name="email"
              control={control}
              rules={{ required: 'E-Mail erforderlich' }}
              render={({ field }) => (
                <TextField {...field} label="E-Mail" fullWidth error={!!errors.email} helperText={errors.email?.message} />
              )}
            />

            <Controller
              name="password"
              control={control}
              rules={{ required: 'Passwort erforderlich' }}
              render={({ field }) => (
                <TextField {...field} type="password" label="Passwort" fullWidth error={!!errors.password} helperText={errors.password?.message} />
              )}
            />

            <Controller
              name="role"
              control={control}
              rules={{ required: 'Rolle auswählen' }}
              render={({ field }) => (
                <TextField {...field} select label="Rolle" fullWidth error={!!errors.role} helperText={errors.role?.message}>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="staff">Staff</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                </TextField>
              )}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSubmit(onSubmit)} variant="contained">Speichern</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={successOpen} autoHideDuration={3000} onClose={() => setSuccessOpen(false)}>
        <Alert onClose={() => setSuccessOpen(false)} severity="success" sx={{ width: '100%' }}>
          Benutzer erfolgreich erstellt
        </Alert>
      </Snackbar>
    </>
  )
}
