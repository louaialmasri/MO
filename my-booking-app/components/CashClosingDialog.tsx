'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAllUsers, getCashClosingPreCalculation, createCashClosing, User } from '@/services/api';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem,
  Grid, Typography, CircularProgress, Box, Divider, Paper, Stack
} from '@mui/material';

type PreCalcData = {
  cashSales: number;
  startPeriod: string;
};

export default function CashClosingDialog({ open, onClose }: { open: boolean, onClose: (submitted: boolean) => void }) {
  const { token, user } = useAuth();
  const [staff, setStaff] = useState<User[]>([]);
  const [preCalcData, setPreCalcData] = useState<PreCalcData | null>(null);
  const [loading, setLoading] = useState(true);

  // Formular-State
  const [employee, setEmployee] = useState('');
  const [cashDeposit, setCashDeposit] = useState('');
  const [bankWithdrawal, setBankWithdrawal] = useState('');
  const [tipsWithdrawal, setTipsWithdrawal] = useState('');
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
        const loggedInStaff = staffData.find(s => s._id === user?._id);
        if (loggedInStaff) {
          setEmployee(loggedInStaff._id);
        }

      }).catch(console.error).finally(() => setLoading(false));
    } else {
        // Reset form on close
        setEmployee('');
        setCashDeposit('');
        setBankWithdrawal('');
        setTipsWithdrawal('');
        setOtherWithdrawal('');
        setActualCashOnHand('');
        setNotes('');
        setPreCalcData(null);
    }
  }, [open, token, user]);

  const cashSales = preCalcData?.cashSales ?? 0;
  const numCashDeposit = parseFloat(cashDeposit) || 0;
  const totalWithdrawal = (parseFloat(bankWithdrawal) || 0) + (parseFloat(tipsWithdrawal) || 0) + (parseFloat(otherWithdrawal) || 0);

  
  const calculatedCashOnHand = (numCashDeposit + cashSales) - totalWithdrawal;
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
            bankWithdrawal: parseFloat(bankWithdrawal) || 0,
            tipsWithdrawal: parseFloat(tipsWithdrawal) || 0,
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
      <DialogContent dividers>
        {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box> : (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Mitarbeiter" value={employee} onChange={(e) => setEmployee(e.target.value)} fullWidth>
                {staff.map(s => <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>)}
            </TextField>
            <Divider>Kassenbewegungen</Divider>
            <TextField label="Kasseneinlage (Anfangsbestand)" type="number" value={cashDeposit} onChange={(e) => setCashDeposit(e.target.value)} fullWidth InputProps={{ endAdornment: '€' }} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 1 }}>Kassenentnahmen:</Typography>
            <TextField label="Bankentnahme" type="number" value={bankWithdrawal} onChange={(e) => setBankWithdrawal(e.target.value)} fullWidth InputProps={{ endAdornment: '€' }} />
            <TextField label="Trinkgeldentnahme" type="number" value={tipsWithdrawal} onChange={(e) => setTipsWithdrawal(e.target.value)} fullWidth InputProps={{ endAdornment: '€' }} />
            <TextField label="Andere Entnahmen" type="number" value={otherWithdrawal} onChange={(e) => setOtherWithdrawal(e.target.value)} fullWidth InputProps={{ endAdornment: '€' }} />
            
            <Divider>Abrechnung</Divider>
            
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.100' }}>
                <Stack direction="row" justifyContent="space-between"><Typography>+ Kasseneinlage</Typography><Typography>{numCashDeposit.toFixed(2)} €</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography>+ Bareinnahmen (laut System)</Typography><Typography>{cashSales.toFixed(2)} €</Typography></Stack>
                <Stack direction="row" justifyContent="space-between"><Typography>- Kassenentnahme (Gesamt)</Typography><Typography>{totalWithdrawal.toFixed(2)} €</Typography></Stack>
                <Divider sx={{ my: 1}}/>
                <Stack direction="row" justifyContent="space-between"><Typography variant="h6">Soll-Bestand in Kasse:</Typography><Typography variant="h6">{calculatedCashOnHand.toFixed(2)} €</Typography></Stack>
            </Paper>
            
            <TextField label="Tatsächlicher Kassenbestand (gezählt)" type="number" value={actualCashOnHand} onChange={(e) => setActualCashOnHand(e.target.value)} fullWidth InputProps={{ endAdornment: '€' }}/>
            
            <Paper variant="outlined" sx={{ p: 2, borderColor: difference !== 0 ? 'error.main' : 'success.main', borderWidth: 2 }}>
                 <Stack direction="row" justifyContent="space-between">
                    <Typography variant="h6" fontWeight="bold">Differenz:</Typography>
                    <Typography variant="h6" fontWeight="bold" color={difference === 0 ? 'inherit' : 'error'}>{difference.toFixed(2)} €</Typography>
                </Stack>
            </Paper>

            <TextField label="Notizen (optional)" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Abbrechen</Button>
        <Button variant="contained" onClick={handleSubmit}>Abschluss speichern</Button>
      </DialogActions>
    </Dialog>
  );
}