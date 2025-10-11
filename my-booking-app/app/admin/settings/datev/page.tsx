'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateDatevSettings, getActiveSalon } from '@/services/api';
import { Container, Typography, Paper, Grid, TextField, Button, Snackbar, Alert } from '@mui/material';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';

// KORREKTUR: Definiere einen initialen, leeren Zustand
const initialSettingsState = {
  consultantNumber: '',
  clientNumber: '',
  revenueAccountServices: '',
  revenueAccountProducts: '',
  cashAccount: '',
  cardAccount: '',
};

export default function DatevSettingsPage() {
  const { token } = useAuth();
  const [settings, setSettings] = useState(initialSettingsState);
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

  useEffect(() => {
    const fetchSettings = async () => {
      if (token) {
        try {
          const response = await getActiveSalon(token);
          if (response.salon && response.salon.datevSettings) {
            // KORREKTUR: Fülle die geladenen Daten in den initialen Zustand ein.
            // Das stellt sicher, dass fehlende Felder als leere Strings erhalten bleiben.
            setSettings(prev => ({ ...prev, ...response.salon.datevSettings }));
          }
        } catch (error) {
          console.error("Fehler beim Laden der DATEV-Einstellungen", error);
        }
      }
    };
    fetchSettings();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!token) return;
    try {
      await updateDatevSettings(settings, token);
      setToast({ open: true, msg: 'Einstellungen gespeichert!', sev: 'success' });
    } catch (err) {
      setToast({ open: true, msg: 'Speichern fehlgeschlagen.', sev: 'error' });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Einstellungen' }, { label: 'DATEV' }]} />
      <Typography variant="h4" fontWeight={800} gutterBottom>DATEV-Einstellungen</Typography>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Trage hier die vom Steuerberater vorgegebenen Konten und Nummern ein. Diese werden für den CSV-Export benötigt.
        </Typography>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Beraternummer" name="consultantNumber" value={settings.consultantNumber} onChange={handleChange} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Mandantennummer" name="clientNumber" value={settings.clientNumber} onChange={handleChange} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Erlöskonto Dienstleistungen" name="revenueAccountServices" value={settings.revenueAccountServices} onChange={handleChange} helperText="Standard: 8400 (SKR03)" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Erlöskonto Produkte" name="revenueAccountProducts" value={settings.revenueAccountProducts} onChange={handleChange} helperText="Standard: 8400 (SKR03)" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Kassenkonto" name="cashAccount" value={settings.cashAccount} onChange={handleChange} helperText="Standard: 1000 (SKR03)" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth label="Geldtransitkonto (Karte)" name="cardAccount" value={settings.cardAccount} onChange={handleChange} helperText="Standard: 1360 (SKR03)" />
          </Grid>
        </Grid>
        <Button variant="contained" size="large" onClick={handleSave} sx={{ mt: 3 }}>
          Speichern
        </Button>
      </Paper>
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))}>
        <Alert severity={toast.sev} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Container>
  );
}