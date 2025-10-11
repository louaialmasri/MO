'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Container, Typography, Paper, Grid, Button, TextField, 
    IconButton, Divider, Box, Stack, Snackbar, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { getCashClosingPreview, createCashClosing } from '@/services/api';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import dayjs from 'dayjs';

type Withdrawal = {
    reason: string;
    amount: string; // Als String für die Formulareingabe
};

export default function NewCashClosingPage() {
    const { token } = useAuth();
    const router = useRouter();
    const [preview, setPreview] = useState<{ expectedAmount: number } | null>(null);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([{ reason: '', amount: '' }]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });
    
    useEffect(() => {
        if (token) {
            getCashClosingPreview(token)
                .then(data => {
                    setPreview(data.preview);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setToast({ open: true, msg: "Vorschau konnte nicht geladen werden.", sev: 'error' });
                    setLoading(false);
                });
        }
    }, [token]);

    const handleWithdrawalChange = (index: number, field: keyof Withdrawal, value: string) => {
        const newWithdrawals = [...withdrawals];
        newWithdrawals[index][field] = value;
        setWithdrawals(newWithdrawals);
    };

    const addWithdrawal = () => {
        setWithdrawals([...withdrawals, { reason: '', amount: '' }]);
    };

    const removeWithdrawal = (index: number) => {
        const newWithdrawals = withdrawals.filter((_, i) => i !== index);
        setWithdrawals(newWithdrawals);
    };

    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + (parseFloat(w.amount) || 0), 0);
    const finalExpectedAmount = (preview?.expectedAmount || 0) - totalWithdrawals;

    const handleConfirmClosing = async () => {
        if (!preview || !token) return;

        const payload = {
            expectedAmount: preview.expectedAmount,
            withdrawals: withdrawals.map(w => ({...w, amount: parseFloat(w.amount)})).filter(w => w.amount > 0),
            notes,
        };

        try {
            await createCashClosing(payload, token);
            setToast({ open: true, msg: 'Kassenabschluss erfolgreich gespeichert!', sev: 'success' });
            router.push('/admin/cash-closing');
        } catch (error) {
            setToast({ open: true, msg: 'Fehler beim Speichern des Abschlusses.', sev: 'error' });
        }
    };
    
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Kassenabschlüsse', href: '/admin/cash-closing'}, { label: 'Neuer Abschluss' }]} />
            <Typography variant="h4" fontWeight={800} gutterBottom>
                Tagesabschluss für den {dayjs().format('DD.MM.YYYY')}
            </Typography>

            <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
                <Stack spacing={2}>
                    <Box>
                        <Typography variant="h6">1. System-Einnahmen (Bar)</Typography>
                        <Typography variant="h4" fontWeight="bold">€{preview?.expectedAmount.toFixed(2)}</Typography>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography variant="h6">2. Kassenentnahmen</Typography>
                        {withdrawals.map((w, index) => (
                            <Stack direction="row" spacing={1} key={index} sx={{ mt: 1 }}>
                                <TextField label="Grund der Entnahme" value={w.reason} onChange={(e) => handleWithdrawalChange(index, 'reason', e.target.value)} fullWidth />
                                <TextField label="Betrag" type="number" value={w.amount} onChange={(e) => handleWithdrawalChange(index, 'amount', e.target.value)} sx={{ width: '120px' }} />
                                <IconButton onClick={() => removeWithdrawal(index)} disabled={withdrawals.length <= 1}>
                                    <DeleteIcon />
                                </IconButton>
                            </Stack>
                        ))}
                        <Button startIcon={<AddIcon />} onClick={addWithdrawal} sx={{ mt: 1 }}>
                            Weitere Entnahme
                        </Button>
                    </Box>
                    <Divider />
                    <Box>
                        <Typography variant="h6">3. Finaler Kassenbestand (Soll)</Typography>
                         <Typography variant="h4" color="primary" fontWeight="bold">€{finalExpectedAmount.toFixed(2)}</Typography>
                        <Typography variant="caption" color="text.secondary">Dieser Betrag sollte nach den Entnahmen in der Kasse sein.</Typography>
                    </Box>
                     <Divider />
                     <TextField label="Notizen (optional)" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <Button variant="contained" size="large" onClick={handleConfirmClosing}>
                        Abschluss bestätigen und speichern
                    </Button>
                </Stack>
            </Paper>

            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({...p, open: false}))}>
                <Alert severity={toast.sev} sx={{ width: '100%' }}>{toast.msg}</Alert>
            </Snackbar>
        </Container>
    );
}