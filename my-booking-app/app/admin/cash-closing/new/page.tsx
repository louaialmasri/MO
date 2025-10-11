'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Container, Typography, Paper, Button, TextField, 
    Divider, Box, Stack, Snackbar, Alert, CircularProgress, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { getCashClosingPreview, createCashClosing, fetchAllUsers, User } from '@/services/api';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import dayjs from 'dayjs';

type PreviewData = {
    revenueServices: number;
    revenueProducts: number;
    soldVouchers: number;
    redeemedVouchers: number;
};

// Komponente für den Fall, dass bereits ein Abschluss existiert
const AlreadyClosedDisplay = ({ onBack }: { onBack: () => void }) => (
    <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}>
        <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Kassenabschlüsse', href: '/admin/cash-closing'}, { label: 'Neuer Abschluss' }]} />
        <Paper variant="outlined" sx={{ p: 4, mt: 4 }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                Tagesabschluss bereits erfolgt
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 2, mb: 3 }}>
                Für den heutigen Tag wurde bereits ein Kassenabschluss erstellt. Sie können keine weiteren Abschlüsse für heute anlegen.
            </Typography>
            <Button variant="contained" onClick={onBack}>
                Zurück zur Übersicht
            </Button>
        </Paper>
    </Container>
);

export default function NewCashClosingPage() {
    const { token, user } = useAuth();
    const router = useRouter();
    const [preview, setPreview] = useState<PreviewData | null>(null);
    const [staff, setStaff] = useState<User[]>([]);
    const [selectedStaff, setSelectedStaff] = useState<string>('');
    const [cashDeposit, setCashDeposit] = useState('0');
    const [bankWithdrawal, setBankWithdrawal] = useState('');
    const [tipsWithdrawal, setTipsWithdrawal] = useState('');
    const [otherWithdrawal, setOtherWithdrawal] = useState('');
    const [actualCashOnHand, setActualCashOnHand] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' });

    const [alreadyClosed, setAlreadyClosed] = useState(false);

    useEffect(() => {
        if (token) {
            Promise.all([
                getCashClosingPreview(token),
                fetchAllUsers(token, 'staff')
            ]).then(([previewData, staffData]) => {
                setPreview(previewData.preview);
                setStaff(staffData);
                if (user && staffData.some(s => s._id === user._id)) {
                    setSelectedStaff(user._id);
                } else if (staffData.length > 0) {
                    setSelectedStaff(staffData[0]._id);
                }
                setLoading(false);
            }).catch(err => {
                if (err.response?.status === 409) {
                    setAlreadyClosed(true);
                } else {
                    console.error(err);
                    setToast({ open: true, msg: "Daten für den Kassenabschluss konnten nicht geladen werden.", sev: 'error' });
                }
                setLoading(false);
            });
        }
    }, [token, user]);

    const numCashDeposit = parseFloat(cashDeposit) || 0;
    const numBankWithdrawal = parseFloat(bankWithdrawal) || 0;
    const numTipsWithdrawal = parseFloat(tipsWithdrawal) || 0;
    const numOtherWithdrawal = parseFloat(otherWithdrawal) || 0;
    const numActualCashOnHand = parseFloat(actualCashOnHand) || 0;

    const totalRevenue = (preview?.revenueServices || 0) + (preview?.revenueProducts || 0) + (preview?.soldVouchers || 0);
    const totalWithdrawals = numBankWithdrawal + numTipsWithdrawal + numOtherWithdrawal;
    const calculatedCashOnHand = numCashDeposit + totalRevenue - (preview?.redeemedVouchers || 0) - totalWithdrawals;
    const difference = numActualCashOnHand - calculatedCashOnHand;

    const handleConfirmClosing = async () => {
        if (!selectedStaff) {
            setToast({ open: true, msg: 'Bitte wählen Sie einen Mitarbeiter aus.', sev: 'error' });
            return;
        };

        if (!preview || !token) return;

        const payload = {
            employee: selectedStaff,
            revenueServices: preview.revenueServices,
            revenueProducts: preview.revenueProducts,
            soldVouchers: preview.soldVouchers,
            redeemedVouchers: preview.redeemedVouchers,
            cashDeposit: numCashDeposit,
            bankWithdrawal: numBankWithdrawal,
            tipsWithdrawal: numTipsWithdrawal,
            otherWithdrawal: numOtherWithdrawal,
            actualCashOnHand: numActualCashOnHand,
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

    // Zeigt die neue Komponente an, wenn der Tag bereits abgeschlossen ist
    if (alreadyClosed) {
        return <AlreadyClosedDisplay onBack={() => router.push('/admin/cash-closing')} />;
    }

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Kassenabschlüsse', href: '/admin/cash-closing'}, { label: 'Neuer Abschluss' }]} />
            <Typography variant="h4" fontWeight={800} gutterBottom>
                Tagesabschluss für den {dayjs().format('DD.MM.YYYY')}
            </Typography>

             <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
                <Stack spacing={3}>
                    <FormControl fullWidth>
                        <InputLabel>Mitarbeiter</InputLabel>
                        <Select
                            value={selectedStaff}
                            label="Mitarbeiter"
                            onChange={(e) => setSelectedStaff(e.target.value)}
                        >
                            {staff.map((s) => (
                                <MenuItem key={s._id} value={s._id}>
                                    {s.firstName} {s.lastName}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Divider />

                    <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>Einnahmen gesamt:</Typography>
                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography>Dienstleistungen:</Typography>
                                <Typography>{(preview?.revenueServices || 0).toFixed(2)} €</Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography>Produkte:</Typography>
                                <Typography>{(preview?.revenueProducts || 0).toFixed(2)} €</Typography>
                            </Stack>
                             <Stack direction="row" justifyContent="space-between">
                                <Typography>Verkaufte Gutscheine:</Typography>
                                <Typography>{(preview?.soldVouchers || 0).toFixed(2)} €</Typography>
                            </Stack>
                             <Stack direction="row" justifyContent="space-between">
                                <Typography>Eingelöste Gutscheine:</Typography>
                                <Typography>-{(preview?.redeemedVouchers || 0).toFixed(2)} €</Typography>
                            </Stack>
                             <Divider />
                             <Stack direction="row" justifyContent="space-between">
                                <Typography fontWeight="bold">Umsatz (Bar):</Typography>
                                <Typography fontWeight="bold">{(totalRevenue - (preview?.redeemedVouchers || 0)).toFixed(2)} €</Typography>
                            </Stack>
                        </Stack>
                    </Box>

                    <Divider />

                     <Box>
                        <Typography variant="h6" sx={{ mb: 2 }}>Kassenbewegungen:</Typography>
                         <Stack spacing={2}>
                              <TextField 
                                label="Kasseneinlage" 
                                type="number" 
                                value={cashDeposit} 
                                onChange={(e) => setCashDeposit(e.target.value)} 
                                fullWidth 
                                InputProps={{ endAdornment: '€' }} 
                                onWheel={(e) => (e.target as HTMLInputElement).blur()} // Verhindert Scrollen
                             />
                             <TextField 
                                label="Bankentnahme" 
                                type="number" 
                                value={bankWithdrawal} 
                                onChange={(e) => setBankWithdrawal(e.target.value)} 
                                fullWidth 
                                InputProps={{ endAdornment: '€' }} 
                                onWheel={(e) => (e.target as HTMLInputElement).blur()} // Verhindert Scrollen
                             />
                             <TextField 
                                label="Trinkgeldentnahme" 
                                type="number" 
                                value={tipsWithdrawal} 
                                onChange={(e) => setTipsWithdrawal(e.target.value)} 
                                fullWidth 
                                InputProps={{ endAdornment: '€' }} 
                                onWheel={(e) => (e.target as HTMLInputElement).blur()} // Verhindert Scrollen
                             />
                            <TextField 
                                label="Andere Entnahmen" 
                                type="number" 
                                value={otherWithdrawal} 
                                onChange={(e) => setOtherWithdrawal(e.target.value)} 
                                fullWidth 
                                InputProps={{ endAdornment: '€' }} 
                                onWheel={(e) => (e.target as HTMLInputElement).blur()} // Verhindert Scrollen
                            />
                         </Stack>
                    </Box>

                     <Divider />

                     <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.100' }}>
                         <Stack direction="row" justifyContent="space-between"><Typography>+ Kasseneinlage</Typography><Typography>{numCashDeposit.toFixed(2)} €</Typography></Stack>
                         <Stack direction="row" justifyContent="space-between"><Typography>+ Bareinnahmen (laut System)</Typography><Typography>{(totalRevenue - (preview?.redeemedVouchers || 0)).toFixed(2)} €</Typography></Stack>
                         <Stack direction="row" justifyContent="space-between"><Typography>- Kassenentnahme (Gesamt)</Typography><Typography>{totalWithdrawals.toFixed(2)} €</Typography></Stack>
                         <Divider sx={{ my: 1}}/>
                         <Stack direction="row" justifyContent="space-between"><Typography variant="h6">Soll-Bestand in Kasse:</Typography><Typography variant="h6">{calculatedCashOnHand.toFixed(2)} €</Typography></Stack>
                    </Paper>

                     <TextField label="Tatsächlicher Kassenbestand (gezählt)" type="number" value={actualCashOnHand} onChange={(e) => setActualCashOnHand(e.target.value)} fullWidth InputProps={{ endAdornment: '€' }} onWheel={(e) => (e.target as HTMLInputElement).blur()}/>

                     <Paper variant="outlined" sx={{ p: 2, borderColor: difference !== 0 ? 'error.main' : 'success.main', borderWidth: 2 }}>
                          <Stack direction="row" justifyContent="space-between">
                             <Typography variant="h6" fontWeight="bold">Differenz:</Typography>
                             <Typography variant="h6" fontWeight="bold" color={difference === 0 ? 'inherit' : 'error'}>{difference.toFixed(2)} €</Typography>
                         </Stack>
                    </Paper>

                    <TextField label="Notizen (optional)" multiline rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

                    <Button variant="contained" size="large" onClick={handleConfirmClosing} disabled={!selectedStaff || !actualCashOnHand}>
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