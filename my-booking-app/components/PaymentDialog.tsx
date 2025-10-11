'use client'

import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Typography, Stack } from '@mui/material';

interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (amountGiven: number) => void;
  totalAmount: number;
}

export default function PaymentDialog({ open, onClose, onConfirm, totalAmount }: PaymentDialogProps) {
  const [amountGiven, setAmountGiven] = useState('');

  // Dieser useEffect sorgt dafür, dass der State zurückgesetzt wird, wenn der Dialog sich öffnet.
  useEffect(() => {
    if (open) {
      setAmountGiven('');
    }
  }, [open]);

  const numAmountGiven = parseFloat(amountGiven) || 0;
  const change = numAmountGiven - totalAmount;
  const isConfirmDisabled = numAmountGiven < totalAmount;

  const handleConfirm = () => {
    onConfirm(numAmountGiven);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isConfirmDisabled) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle fontWeight={700}>Zahlung bearbeiten</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <Typography variant="h4" align="center" fontWeight={800}>
            {totalAmount.toFixed(2)} €
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mt: -2 }}>
            Zu zahlender Betrag
          </Typography>
          <TextField
            fullWidth
            label="Gegebener Betrag"
            type="number"
            value={amountGiven}
            onChange={(e) => setAmountGiven(e.target.value)}
            onKeyPress={handleKeyPress}
            InputProps={{ endAdornment: '€', sx: { fontSize: '1.2rem' } }}
            autoFocus
            variant="outlined"
          />
          
          {/* KORREKTUR: Das Rückgeld wird nur angezeigt, wenn eine Eingabe erfolgt ist. */}
          {amountGiven && (
            <Typography variant="h5" align="center" color={change < 0 ? 'error' : 'primary.main'} fontWeight={700}>
              Rückgeld: {change.toFixed(2)} €
            </Typography>
          )}

        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} sx={{ mr: 1 }}>Abbrechen</Button>
        <Button 
          variant="contained" 
          onClick={handleConfirm} 
          disabled={isConfirmDisabled}
        >
          Zahlung bestätigen
        </Button>
      </DialogActions>
    </Dialog>
  );
}