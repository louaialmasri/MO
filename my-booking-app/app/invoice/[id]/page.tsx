'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchInvoiceById, type Invoice } from '@/services/api';
import { Container, Paper, Typography, Box, Divider, Button, CircularProgress, Alert, Stack, Grid } from '@mui/material';
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

    //Variable, um zu prüfen, ob es sich um einen Laufkunden handelt
    const isWalkInCustomer = invoice.customer.email === 'laufkunde@shop.local';

     return (
        <Box sx={{ backgroundColor: '#f5f5f5', p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
            <Container maxWidth="md">
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2, '@media print': { display: 'none' } }}>
                    <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}>
                        Drucken
                    </Button>
                </Box>
                <Paper sx={{ p: { xs: 3, md: 5 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
                        <Box>
                            <Typography variant="h4" fontWeight="bold">{invoice.salon.name}</Typography>
                            {invoice.salon.address && <Typography>{invoice.salon.address}</Typography>}
                            {invoice.salon.phone && <Typography>{invoice.salon.phone}</Typography>}
                            {invoice.salon.email && <Typography>{invoice.salon.email}</Typography>}
                        </Box>
                        <Typography variant="h5" color="text.secondary">Rechnung</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" mb={2}>
                        <Box>
                            <Typography><strong>Rechnung an:</strong></Typography>
                            <Typography>{`${invoice.customer.firstName} ${invoice.customer.lastName || ''}`.trim()}</Typography>
                            {!isWalkInCustomer && <Typography>{invoice.customer.email}</Typography>}
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                            <Typography><strong>Rechnungsnr.:</strong> {invoice.invoiceNumber}</Typography>
                            <Typography><strong>Datum:</strong> {dayjs(invoice.date).format('DD.MM.YYYY')}</Typography>
                        </Box>
                    </Stack>

                    <Divider sx={{ my: 3 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 1 }}>
                        <Typography fontWeight="bold">Leistung/Produkt</Typography>
                        <Typography fontWeight="bold">Betrag</Typography>
                    </Box>
                    <Divider />
                    
                    {invoice.items.map((item, index) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', my: 2 }}>
                          <Box>
                              <Typography>{item.description}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                  Mitarbeiter: {invoice.staff.firstName} {invoice.staff.lastName}
                              </Typography>
                          </Box>
                          <Typography>{item.price.toFixed(2)} €</Typography>
                      </Box>
                    ))}

                    <Divider sx={{ my: 3 }} />

                    {/* Zahlungsinformationen + ggf. Gutschein-Details */}
                   <Grid container spacing={2} sx={{ mb: 2 }}>
                     <Grid item xs = {12} md = {6}>
                       <Typography variant="h6" gutterBottom>Zahlungsinformationen</Typography>
                       <Typography>
                         Zahlungsmethode:{' '}
                         {invoice.paymentMethod === 'cash' ? 'Bar' : invoice.paymentMethod === 'voucher' ? 'Gutschein' : 'Karte'}
                       </Typography>
                       <Typography>Datum: {dayjs(invoice.date).format('DD.MM.YYYY')}</Typography>
                     </Grid>

                     {/* NEUER BLOCK FÜR GUTSCHEIN-DETAILS */}
                     <Grid item xs = {12} md = {6}>
                       {invoice.paymentMethod === 'voucher' && invoice.redeemedVoucher && (
                         <Box sx={{ mt: 1, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                            <Typography variant="body2">Gutschein-Code: {invoice.redeemedVoucher}</Typography>
                            <Typography variant="body2">Guthaben vor Zahlung: {invoice.voucherInitialValue?.toFixed(2)} €</Typography>
                            <Typography variant="body2" sx={{ color: 'red' }}>Eingelöst: -{invoice.redeemedAmount?.toFixed(2)} €</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Restguthaben: {invoice.voucherRemainingValue?.toFixed(2)} €</Typography>
                        </Box>
                       )}
                     </Grid>
                   </Grid>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Stack spacing={1} sx={{ minWidth: '250px', textAlign: 'right' }}>
                            <Stack direction="row" justifyContent="space-between">
                                <Typography>Zwischensumme</Typography>
                                <Typography>{invoice.amount.toFixed(2)} €</Typography>
                            </Stack>
                             <Divider />
                             <Stack direction="row" justifyContent="space-between">
                                <Typography variant="h6"><strong>Gesamtbetrag</strong></Typography>
                                <Typography variant="h6"><strong>{invoice.amount.toFixed(2)} €</strong></Typography>
                                {invoice.voucherPayment && (
                                    <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                                        <Typography variant="h6" gutterBottom>Gutschein-Zahlung</Typography>
                                        <Grid container spacing={1}>
                                        <Grid item xs = {6}><Typography>Gutschein-Code:</Typography></Grid>
                                        <Grid item xs = {6}><Typography align="right">{invoice.voucherPayment.code}</Typography></Grid>
                                        
                                        <Grid item xs = {6}><Typography>Guthaben vor Zahlung:</Typography></Grid>
                                        <Grid item xs = {6}><Typography align="right">{invoice.voucherPayment.initialBalance.toFixed(2)} €</Typography></Grid>
                                        
                                        <Grid item xs = {6}><Typography>Bezahlter Betrag:</Typography></Grid>
                                        <Grid item xs = {6}><Typography align="right">- {invoice.voucherPayment.paidAmount.toFixed(2)} €</Typography></Grid>
                                        
                                        <Grid item xs = {6}><Typography variant="body2" sx={{ fontWeight: 'bold' }}>Neues Guthaben:</Typography></Grid>
                                        <Grid item xs = {6}><Typography align="right" sx={{ fontWeight: 'bold' }}>{invoice.voucherPayment.remainingBalance.toFixed(2)} €</Typography></Grid>
                                        </Grid>
                                    </Box>
                                )}
                            </Stack>
                             <Stack direction="row" justifyContent="space-between">
                                <Typography>Gegeben ({invoice.paymentMethod === 'cash' ? 'Bar' : 'Karte'})</Typography>
                                <Typography>{(invoice.amountGiven ?? invoice.amount).toFixed(2)} €</Typography>
                            </Stack>
                             <Stack direction="row" justifyContent="space-between">
                                <Typography>Rückgeld</Typography>
                                <Typography>{(invoice.change ?? 0).toFixed(2)} €</Typography>
                            </Stack>
                        </Stack>
                    </Box>

                    <Box sx={{ mt: 5, textAlign: 'center' }}>
                        <Typography variant="body2">Vielen Dank für Ihren Besuch!</Typography>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}