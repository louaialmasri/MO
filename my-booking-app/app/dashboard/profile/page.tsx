'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updateMyProfile, changePassword, User } from '@/services/api';
import {
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
  Box,
  Divider,
  Stack
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import VpnKeyIcon from '@mui/icons-material/VpnKey';

export default function ProfilePage() {
  const { user, token, login } = useAuth();
  const [formData, setFormData] = useState<Partial<User>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      });
      setLoading(false);
    }
  }, [user]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleProfileSave = async () => {
    if (!token) return;
    try {
      const updatedUser = await updateMyProfile(formData, token);
      login(updatedUser, token); // AuthContext mit neuen Daten aktualisieren
      setToast({ open: true, msg: 'Profil erfolgreich gespeichert!', sev: 'success' });
    } catch (err) {
      setToast({ open: true, msg: 'Speichern fehlgeschlagen.', sev: 'error' });
    }
  };

  const handlePasswordSave = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ open: true, msg: 'Die neuen Passwörter stimmen nicht überein.', sev: 'error' });
      return;
    }
    if (!token) return;
    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }, token);
      setToast({ open: true, msg: 'Passwort erfolgreich geändert!', sev: 'success' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setToast({ open: true, msg: err.response?.data?.message || 'Fehler beim Ändern des Passworts.', sev: 'error' });
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Mein Profil
      </Typography>

      {/* Persönliche Daten */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <AccountCircleIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h6">Persönliche Daten</Typography>
        </Stack>
        <Grid container spacing={3}>
          <Grid item xs = {12} sm = {6}>
            <TextField fullWidth label="Vorname" name="firstName" value={formData.firstName} onChange={handleFormChange} />
          </Grid>
          <Grid item xs = {12} sm = {6}>
            <TextField fullWidth label="Nachname" name="lastName" value={formData.lastName} onChange={handleFormChange} />
          </Grid>
          <Grid item xs = {12} sm = {6}>
            <TextField fullWidth label="E-Mail" name="email" value={formData.email} disabled />
          </Grid>
          <Grid item xs = {12} sm = {6}>
            <TextField fullWidth label="Handynummer" name="phone" value={formData.phone} onChange={handleFormChange} />
          </Grid>
          <Grid item xs = {12}>
            <TextField fullWidth label="Adresse (optional)" name="address" value={formData.address} onChange={handleFormChange} />
          </Grid>
        </Grid>
        <Button variant="contained" onClick={handleProfileSave} sx={{ mt: 3 }}>
          Daten speichern
        </Button>
      </Paper>

      {/* Passwort ändern */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <VpnKeyIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h6">Passwort ändern</Typography>
        </Stack>
        <Grid container spacing={3}>
          <Grid item xs = {12}>
            <TextField fullWidth type="password" label="Aktuelles Passwort" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} />
          </Grid>
          <Grid item xs = {12} sm = {6}>
            <TextField fullWidth type="password" label="Neues Passwort" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} />
          </Grid>
          <Grid item xs = {12} sm = {6}>
            <TextField fullWidth type="password" label="Neues Passwort bestätigen" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} />
          </Grid>
        </Grid>
        <Button variant="contained" onClick={handlePasswordSave} sx={{ mt: 3 }}>
          Passwort ändern
        </Button>
      </Paper>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))}>
        <Alert severity={toast.sev} sx={{ width: '100%' }}>{toast.msg}</Alert>
      </Snackbar>
    </Container>
  );
}