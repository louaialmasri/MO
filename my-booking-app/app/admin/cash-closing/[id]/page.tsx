'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchCashClosingById, type CashClosing } from '@/services/api';
import {
  Container, Paper, Typography, Box, Divider, Button, CircularProgress, Alert, Grid, Stack
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import dayjs from 'dayjs';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';

// Hilfskomponente für die Zeilen
const SummaryRow = ({ label, value, bold = false }: { label: string, value: string, bold?: boolean }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center">
    <Typography variant={bold ? 'h6' : 'body1'}>{label}</Typography>
    <Typography variant={bold ? 'h6' : 'body1'} fontWeight={bold ? 'bold' : 'normal'}>{value}</Typography>
  </Stack>
);

export default function CashClosingDetailPage() {
    const { id } = useParams();
    const { token } = useAuth();
    const [closing, setClosing] = useState<CashClosing | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token && id) {
            fetchCashClosingById(token, id as string)
                .then(data => setClosing(data))
                .catch(err => setError(err.response?.data?.message || 'Abschluss konnte nicht geladen werden.'))
                .finally(() => setLoading(false));
        }
    }, [id, token]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    if (error) return <Container sx={{ mt: 5 }}><Alert severity="error">{error}</Alert></Container>;
    if (!closing) return <Container sx={{ mt: 5 }}><Alert severity="warning">Keine Daten für diesen Abschluss gefunden.</Alert></Container>;
    
    const totalWithdrawal = closing.bankWithdrawal + closing.tipsWithdrawal + closing.otherWithdrawal;

    return (
        <Box sx={{ backgroundColor: '#f5f5f5', p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
            <Container maxWidth="sm">
                <AdminBreadcrumbs items={[
                  { label: 'Kassenabschlüsse', href: '/admin/cash-closing' }, 
                  { label: `Abschluss vom ${dayjs(closing.closingDate).format('DD.MM.YY')}` }
                ]} />
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h5" fontWeight={700}>Kassenabschluss Details</Typography>
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                        Drucken
                    </Button>
                </Stack>
                <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
                    <Stack spacing={2}>
                        <Typography variant="h6" align="center">
                            Abschluss vom {dayjs(closing.closingDate).format('DD.MM.YYYY HH:mm')} Uhr
                        </Typography>
                         <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                            Mitarbeiter: {closing.employee.firstName} {closing.employee.lastName}
                        </Typography>

                        <Divider><Typography variant="overline">Abrechnung</Typography></Divider>
                        
                        <SummaryRow label="Kasseneinlage" value={`${closing.cashDeposit.toFixed(2)} €`} />
                        <SummaryRow label="+ Bareinnahmen (System)" value={`${closing.cashSales.toFixed(2)} €`} />
                        <SummaryRow label="- Bankentnahme" value={`${closing.bankWithdrawal.toFixed(2)} €`} />
                        <SummaryRow label="- Trinkgeldentnahme" value={`${closing.tipsWithdrawal.toFixed(2)} €`} />
                        <SummaryRow label="- Andere Entnahmen" value={`${closing.otherWithdrawal.toFixed(2)} €`} />
                        <Divider />
                        <SummaryRow label="Soll-Bestand" value={`${closing.calculatedCashOnHand.toFixed(2)} €`} bold />
                        <Divider />
                        <SummaryRow label="Tatsächlicher Bestand" value={`${closing.actualCashOnHand.toFixed(2)} €`} />
                        <SummaryRow label="Differenz" value={`${closing.difference.toFixed(2)} €`} bold />

                        {closing.notes && (
                            <>
                                <Divider sx={{ mt: 2 }}><Typography variant="overline">Notizen</Typography></Divider>
                                <Typography variant="body2" sx={{ p: 1, whiteSpace: 'pre-wrap' }}>{closing.notes}</Typography>
                            </>
                        )}
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}