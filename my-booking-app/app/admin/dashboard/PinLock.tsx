'use client'

import { useState } from 'react';
import { Box, Typography, TextField, Button, Stack, Alert, Paper } from '@mui/material';
import LockOpenIcon from '@mui/icons-material/LockOpen';

type PinLockProps = {
  onPinVerified: () => void;
  verifyPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
};

export default function PinLock({ onPinVerified, verifyPin }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (pin.length < 4) {
      setError('PIN muss mindestens 4 Ziffern haben.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyPin(pin);
      if (result.success) {
        onPinVerified();
      } else {
        setError(result.message || 'Unbekannter Fehler.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Falsche PIN.');
    } finally {
      setLoading(false);
      setPin('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 200px)', // Passt die Höhe an den verfügbaren Platz an
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 320, textAlign: 'center' }}>
        <Stack spacing={2} alignItems="center">
          <LockOpenIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h6">Dashboard-Zugriff</Typography>
          <Typography variant="body2" color="text.secondary">
            Bitte gib deine PIN ein, um die Finanzdaten einzusehen.
          </Typography>
          <TextField
            label="PIN"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyPress={handleKeyPress}
            inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem' } }}
            autoFocus
          />
          {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
          <Button
            variant="contained"
            onClick={handleVerify}
            disabled={loading}
            fullWidth
          >
            {loading ? 'Prüfe...' : 'Entsperren'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}