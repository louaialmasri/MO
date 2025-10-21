'use client'

import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, 
  Typography, Stack, ToggleButtonGroup, ToggleButton, Box, CircularProgress, Alert 
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { useAuth } from '../context/AuthContext';
import { validateVoucher, redeemVoucher, createInvoice, Invoice, User, Voucher } from '../services/api';

// 1. Die Props für die Komponente erweitern
interface PaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onPaymentSuccess: (invoice: Invoice) => void;
  total: number;
  cart: any[]; // Ggf. genauer typisieren
  customer: User;
  salonId: string | null; // Prop für Salon-ID
  discount: { type: 'percentage' | 'fixed', value: number };
}

export default function PaymentDialog({ open, onClose, onPaymentSuccess, total = 0, cart, customer, salonId, discount }: PaymentDialogProps) {
  const { token } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'voucher'>('cash');
  const [isLoading, setIsLoading] = useState(false);
  
  // State für die Gutschein-Logik
  const [voucherCode, setVoucherCode] = useState('');
  const [validatedVoucher, setValidatedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  
  // State für die Barzahlung
  const [amountGiven, setAmountGiven] = useState('');
  const numAmountGiven = parseFloat(amountGiven) || 0;
  const change = numAmountGiven - total;

  useEffect(() => {
    if (open) {
      setPaymentMethod('cash');
      setVoucherCode('');
      setValidatedVoucher(null);
      setVoucherError(null);
      setIsLoading(false);
      setAmountGiven('');
    }
  }, [open]);

  const handleValidateVoucher = async () => {
    if (!token) return;
    setIsLoading(true);
    setVoucherError(null);
    setValidatedVoucher(null);
    try {
      const result = await validateVoucher(voucherCode, token);
      // Erwartet, dass result direkt das Gutschein-Objekt oder { voucher: {...} } zurückgibt.
      const voucher = result.voucher ?? result;
      if (voucher.currentValue >= total) {
        setValidatedVoucher(voucher);
      } else {
        setVoucherError('Guthaben des Gutscheins reicht nicht aus.');
      }
    } catch (error) {
      setVoucherError('Gültiger Gutschein-Code nicht gefunden.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!token || !salonId || !customer) return;
    setIsLoading(true);

    try {
      
      // Build payload in the correct shape for the backend and call createInvoice(payload, token)
      const payload = {
        customerId: customer._id,
        paymentMethod: paymentMethod,
        items: cart.map(item => ({
          type: item.type,
          id: item.id,
          value: item.type === 'voucher' ? item.price : undefined, 
          staffId: item.staffId 
        })),
        // HIER DIE WICHTIGE ÄNDERUNG:
        // Wir übergeben den Code und den zu zahlenden Betrag, wenn mit Gutschein bezahlt wird.
        discount: discount,
        voucherCode: paymentMethod === 'voucher' ? validatedVoucher?.code : undefined,
        totalAmount: total, // Das Backend muss den Gesamtbetrag für die Gutscheinberechnung kennen
        amountGiven: paymentMethod === 'cash' ? numAmountGiven : undefined,
      };

      const newInvoice = await createInvoice(token, payload, salonId);
      onPaymentSuccess(newInvoice as Invoice);
    } catch (error) {
      console.error("Fehler beim Erstellen der Rechnung:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const isCashConfirmDisabled = numAmountGiven < total;
  const isVoucherConfirmDisabled = !validatedVoucher;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Zahlung abschließen</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="h4" align="center" fontWeight={800}>
            {total.toFixed(2)} €
          </Typography>
          
          <ToggleButtonGroup
            value={paymentMethod}
            exclusive
            onChange={(e, newValue) => { if(newValue) setPaymentMethod(newValue) }}
            fullWidth
          >
            <ToggleButton value="cash"><AccountBalanceWalletIcon sx={{ mr: 1 }} />Bar</ToggleButton>
            <ToggleButton value="voucher"><CardGiftcardIcon sx={{ mr: 1 }} />Gutschein</ToggleButton>
          </ToggleButtonGroup>

          {paymentMethod === 'cash' && (
            <Box>
              <TextField
                fullWidth
                label="Gegebener Betrag"
                type="number"
                value={amountGiven}
                onChange={(e) => setAmountGiven(e.target.value)}
                InputProps={{ endAdornment: '€' }}
                autoFocus
              />
              {amountGiven && (
                <Typography variant="h6" align="center" color={change < 0 ? 'error' : 'primary.main'} sx={{ mt: 1 }}>
                  Rückgeld: {change.toFixed(2)} €
                </Typography>
              )}
            </Box>
          )}

          {paymentMethod === 'voucher' && (
            <Box>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  label="Gutschein-Code"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value)}
                  disabled={!!validatedVoucher}
                />
                <Button variant="outlined" onClick={handleValidateVoucher} disabled={isLoading || !!validatedVoucher}>
                  {isLoading ? <CircularProgress size={24} /> : 'Prüfen'}
                </Button>
              </Stack>
              {voucherError && <Alert severity="error">{voucherError}</Alert>}
              {validatedVoucher && <Alert severity="success">Gutschein gültig! Guthaben: {validatedVoucher.currentValue.toFixed(2)} €</Alert>}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button 
          variant="contained" 
          onClick={handlePayment}
          disabled={isLoading || (paymentMethod === 'cash' && isCashConfirmDisabled) || (paymentMethod === 'voucher' && isVoucherConfirmDisabled)}
        >
          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Zahlung bestätigen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}