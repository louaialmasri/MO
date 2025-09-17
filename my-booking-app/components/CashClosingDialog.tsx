'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAllUsers, getCashClosingPreCalculation, createCashClosing, User } from '@/services/api';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Grid, Typography, CircularProgress, Box, Divider, Stack,
  Paper
} from '@mui/material';

type PreCalcData = {
  cashSales: number;
  startPeriod: string;
};

export default function CashClosingDialog({ open, onClose }: { open: boolean, onClose: (submitted: boolean) => void }) {
  const { token } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [preCalcData, setPreCalcData] = useState<PreCalcData | null>(null);
  const [loading, setLoading] = useState(true);

  // Formular-State
  const [employee, setEmployee] = useState('');
  const [cashDeposit, setCashDeposit] = useState('');
  const [cashWithdrawal, setCashWithdrawal] = useState('');
  const [otherWithdrawal, setOtherWithdrawal] = useState('');
  const [actualCashOnHand, setActualCashOnHand] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && token) {
      setLoading(true);
      Promise.all([
        fetchAllUsers(token, 'staff'),
        getCashClosingPreCalculation(token),
      ]).then(([staffData, calcData]) => {
        setStaff(staffData);
        setPreCalcData(calcData);
      }).catch(console.error).finally(() => setLoading(false));
    } else {
        // Reset form on close
        setEmployee('');
        setCashDeposit('');
        setCashWithdrawal('');
        setOtherWithdrawal('');
        setActualCashOnHand('');
        setNotes('');
        setPreCalcData(null);
    }
  }, [open, token]);

  const cashSales = preCalcData?.cashSales ?? 0;
  const numCashDeposit = parseFloat(cashDeposit) || 0;
  const numCashWithdrawal = parseFloat(cashWithdrawal) || 0;
  
  const calculatedCashOnHand = (numCashDeposit + cashSales) - numCashWithdrawal;
  const numActualCash = parseFloat(actualCashOnHand) || 0;
  const difference = numActualCash - calculatedCashOnHand;

  const handleSubmit = async () => {
    if (!employee || !actualCashOnHand) {
        alert("Bitte Mitarbeiter und tatsächlichen Kassenbestand angeben.");
        return;
    }
    try {
        await createCashClosing(token!, {
            employee,
            cashDeposit: numCashDeposit,
            cashWithdrawal: numCashWithdrawal,
            otherWithdrawal: parseFloat(otherWithdrawal) || 0,
            actualCashOnHand: numActualCash,
            notes,
        });
        onClose(true);
    } catch (err) {
        alert("Fehler beim Speichern des Kassenabschlusses.");
        onClose(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} fullWidth maxWidth="sm">
      <DialogTitle>Täglicher Kassenabschluss</DialogTitle>
      <DialogContent>
        {loading ? <CircularProgress /> : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                select
                label="Mitarbeiter"
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                fullWidth
              >
                {staff.map(s => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.firstName} {s.lastName}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider>Kassenbewegungen</Divider>
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField
                label="Kasseneinlage"
                type="number"
                value={cashDeposit}
                onChange={(e) => setCashDeposit(e.target.value)}
                fullWidth
                InputProps={{ endAdornment: '€' }}
              />
            </Grid>

            <Grid size={{ xs: 6 }}>
              <TextField
                label="Kassenentnahme"
                type="number"
                value={cashWithdrawal}
                onChange={(e) => setCashWithdrawal(e.target.value)}
                fullWidth
                InputProps={{ endAdornment: '€' }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Andere Entnahmen (z.B. privat)"
                type="number"
                value={otherWithdrawal}
                onChange={(e) => setOtherWithdrawal(e.target.value)}
                fullWidth
                InputProps={{ endAdornment: '€' }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Divider>Abrechnung</Divider>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>Bareinnahmen (laut System):</Typography>
                  <Typography fontWeight="bold">{cashSales.toFixed(2)} €</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between" mt={1}>
                  <Typography>Soll-Bestand in Kasse:</Typography>
                  <Typography fontWeight="bold">{calculatedCashOnHand.toFixed(2)} €</Typography>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Tatsächlicher Kassenbestand (gezählt)"
                type="number"
                value={actualCashOnHand}
                onChange={(e) => setActualCashOnHand(e.target.value)}
                fullWidth
                InputProps={{ endAdornment: '€' }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Paper
                variant="outlined"
                sx={{ p: 2, borderColor: difference !== 0 ? 'error.main' : undefined }}
              >
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight="bold">Differenz:</Typography>
                  <Typography
                    fontWeight="bold"
                    color={difference === 0 ? 'inherit' : 'error'}
                  >
                    {difference.toFixed(2)} €
                  </Typography>
                </Stack>
              </Paper>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Notizen (optional)"
                multiline
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Abbrechen</Button>
        <Button variant="contained" onClick={handleSubmit}>Abschluss speichern</Button>
      </DialogActions>
    </Dialog>
  );
}