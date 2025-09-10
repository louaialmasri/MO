// my-booking-app/app/invoice/[id]/page.tsx

'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchInvoiceById, type Invoice } from '@/services/api';
import { Container, Paper, Typography, Box, Divider, Button, CircularProgress, Alert } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import dayjs from 'dayjs';

export default function InvoicePage() {
    const { id } = useParams();
    const { token, user } = useAuth();
    const router = useRouter();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token && id) {
            fetchInvoiceById(id as string, token)
                .then(data => setInvoice(data))
                .catch(err => setError(err.response?.data?.message || 'Rechnung konnte nicht geladen werden.'))
                .finally(() => setLoading(false));
        }
    }, [id, token]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
    if (error) return <Container sx={{ mt: 5 }}><Alert severity="error">{error}</Alert></Container>;
    if (!invoice) return <Container sx={{ mt: 5 }}><Alert severity="warning">Keine Rechnungsdaten gefunden.</Alert></Container>;

    return (
        <Box sx={{ backgroundColor: '#f5f5f5', p: { xs: 2, md: 4 } }}>
            <Container maxWidth="md">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, '@media print': { display: 'none' } }}>
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                        Drucken
                    </Button>
                </Box>
                <Paper sx={{ p: { xs: 3, md: 5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                        <Box>
                            <Typography variant="h4" fontWeight="bold">{invoice.salon.name}</Typography>
                            <Typography>{invoice.salon.address}</Typography>
                            <Typography>{invoice.salon.phone}</Typography>
                            <Typography>{invoice.salon.email}</Typography>
                        </Box>
                        <Typography variant="h5" color="text.secondary">Rechnung</Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                        <Box>
                            <Typography fontWeight="bold">Rechnung an:</Typography>
                            <Typography>{invoice.customer.firstName} {invoice.customer.lastName}</Typography>
                            <Typography>{invoice.customer.email}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography><strong>Rechnungsnr.:</strong> {invoice.invoiceNumber}</Typography>
                            <Typography><strong>Datum:</strong> {dayjs(invoice.date).format('DD.MM.YYYY')}</Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                        <Typography fontWeight="bold">Leistung</Typography>
                        <Typography fontWeight="bold">Betrag</Typography>
                    </Box>
                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 2 }}>
                        <Box>
                            <Typography>{invoice.service.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Mitarbeiter: {invoice.staff.firstName} {invoice.staff.lastName}
                            </Typography>
                        </Box>
                        <Typography>{invoice.amount.toFixed(2)} €</Typography>
                    </Box>

                    <Divider />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                        <Typography variant="h6"><strong>Gesamt: {invoice.amount.toFixed(2)} €</strong></Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                        <Typography>Zahlungsmethode: {invoice.paymentMethod === 'cash' ? 'Barzahlung' : 'Karte'}</Typography>
                    </Box>

                    <Box sx={{ mt: 5, textAlign: 'center' }}>
                        <Typography variant="body2">Vielen Dank für Ihren Besuch!</Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}