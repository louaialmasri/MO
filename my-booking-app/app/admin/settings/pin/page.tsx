'use client'

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { setDashboardPin } from '@/services/api';
import {
  Container,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  Snackbar,
  Alert
} from '@mui/material';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

export default function PinSettingsPage() {
  const { token } = useAuth();
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' | 'info' }>({ open: false, msg: '', sev: 'success' });

  const handleSavePin = async () => {
    if (pin.length < 4 || pin.length > 6) {
      setToast({ open: true, msg: 'Die PIN muss zwischen 4 und 6 Ziffern lang sein.', sev: 'error' });
      return;
    }
    if (pin !== confirmPin) {
      setToast({ open: true, msg: 'Die PINs stimmen nicht überein.', sev: 'error' });
      return;
    }
    if (!password) {
      setToast({ open: true, msg: 'Bitte gib dein Passwort zur Bestätigung ein.', sev: 'error' });
      return;
    }

    try {
      if (token) {
        await setDashboardPin(password, pin, token);
        setToast({ open: true, msg: 'Dashboard-PIN erfolgreich gespeichert!', sev: 'success' });
        setPassword('');
        setPin('');
        setConfirmPin('');
      }
    } catch (err: any) {
      setToast({ open: true, msg: err.response?.data?.message || 'Ein Fehler ist aufgetreten.', sev: 'error' });
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Einstellungen' }, { label: 'PIN-Verwaltung' }]} />
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Dashboard-PIN verwalten
      </Typography>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={3}>
          <Typography color="text.secondary">
            Lege hier eine 4- bis 6-stellige PIN fest, um den Zugriff auf dein Dashboard mit Finanzdaten zusätzlich abzusichern.
          </Typography>
          <TextField
            label="Neue PIN"
            type="password"
            inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <TextField
            label="Neue PIN bestätigen"
            type="password"
            inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <TextField
            label="Aktuelles Login-Passwort (zur Bestätigung)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button
            variant="contained"
            size="large"
            startIcon={<VpnKeyIcon />}
            onClick={handleSavePin}
          >
            PIN Speichern
          </Button>
        </Stack>
      </Paper>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))}>
        <Alert onClose={() => setToast(p => ({ ...p, open: false }))} severity={toast.sev} sx={{ width: '100%' }}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Container>
  );
}