'use client'

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchCashClosingById, cancelCashClosing, type CashClosing } from '@/services/api';
import { Container, Typography, Paper, Box, CircularProgress, Divider, List, ListItem, ListItemText, Grid, Stack, Chip, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import dayjs from 'dayjs';

export default function CashClosingDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const { id } = params;
  const [closing, setClosing] = useState<CashClosing | null>(null);
  const [loading, setLoading] = useState(true);

   // States für Storno-Dialog
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (token && id) {
      fetchCashClosingById(token, id as string)
        .then(data => {
          setClosing(data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token, id]);

  // Storno-Funktion
  const handleCancelClosing = async () => {
    if (!token || !closing) return;
    setIsCancelling(true);
    try {
      const updatedClosing = await cancelCashClosing(closing._id, token);
      setClosing(updatedClosing); // UI mit dem stornierten Status aktualisieren
      setConfirmCancelOpen(false);
      // Optional: Nachricht an den Benutzer
    } catch (error) {
      console.error("Fehler beim Stornieren:", error);
      // Optional: Fehlermeldung anzeigen
    } finally {
      setIsCancelling(false);
    }
  };
  // Storno-Funktion

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>;
  }

  if (!closing) {
    return <Typography>Kassenabschluss nicht gefunden.</Typography>;
  }

  const totalWithdrawals = (closing.withdrawals || []).reduce((sum, w) => sum + w.amount, 0);
  const totalRevenue = (closing.revenueServices || 0) + (closing.revenueProducts || 0) + (closing.soldVouchers || 0);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[
        { label: 'Mein Salon', href: '/admin' },
        { label: 'Kassenabschlüsse', href: '/admin/cash-closing' },
        { label: `Abschluss vom ${dayjs(closing.date).format('DD.MM.YYYY')}` }
      ]} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} gutterBottom sx={{ mb: 0 }}>
            Detailansicht Kassenabschluss
        </Typography>
        {closing.status === 'cancelled' && (
            <Chip label="Storniert" color="error" />
        )}
      </Stack>

      <Grid container spacing={4}>
        {/* Linke Spalte: Einnahmen */}
        <Grid item xs = {12} md= {6}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>Einnahmen gesamt:</Typography>
            <Stack spacing={1.5} mt={2}>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Dienstleistungen:</Typography>
                <Typography>{(closing.revenueServices || 0).toFixed(2)} €</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Produkte:</Typography>
                <Typography>{(closing.revenueProducts || 0).toFixed(2)} €</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Verkaufte Gutscheine:</Typography>
                <Typography>{(closing.soldVouchers || 0).toFixed(2)} €</Typography>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography fontWeight="bold">Umsatz:</Typography>
                <Typography fontWeight="bold">{totalRevenue.toFixed(2)} €</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Eingelöste Gutscheine:</Typography>
                <Typography>-{(closing.redeemedVouchers || 0).toFixed(2)} €</Typography>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
        
        {/* Rechte Spalte: Kassenbewegungen */}
        <Grid item xs = {12} md= {6}>
           <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom>Kassenbewegungen:</Typography>
              <Stack spacing={1.5} mt={2}>
                 <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Kasseneinlage:</Typography>
                    <Typography>{(closing.cashDeposit || 0).toFixed(2)} €</Typography>
                 </Stack>
                 <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Bankentnahme:</Typography>
                    <Typography>-{(closing.bankWithdrawal || 0).toFixed(2)} €</Typography>
                 </Stack>
                 <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Trinkgeldentnahme:</Typography>
                    <Typography>-{(closing.tipsWithdrawal || 0).toFixed(2)} €</Typography>
                 </Stack>
                 <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Andere Entnahmen:</Typography>
                    <Typography>-{(closing.otherWithdrawal || 0).toFixed(2)} €</Typography>
                 </Stack>
                 <Divider />
                 <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight="bold">Kassenentnahme:</Typography>
                    <Typography fontWeight="bold">-{(totalWithdrawals || 0).toFixed(2)} €</Typography>
                 </Stack>
              </Stack>
           </Paper>
        </Grid>
        
        {/* Untere Reihe: Zusammenfassung */}
        <Grid item xs = {12}>
            <Paper variant="outlined" sx={{ p: 3, mt: 2, bgcolor: 'grey.50' }}>
                <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                        <Typography>Soll-Bestand (berechnet):</Typography>
                        <Typography>{(closing.calculatedCashOnHand || 0).toFixed(2)} €</Typography>
                    </Stack>
                     <Stack direction="row" justifyContent="space-between">
                        <Typography>Ist-Bestand (gezählt):</Typography>
                        <Typography>{(closing.actualCashOnHand || 0).toFixed(2)} €</Typography>
                    </Stack>
                     <Divider />
                     <Stack direction="row" justifyContent="space-between">
                        <Typography variant="h6" fontWeight="bold">Differenz:</Typography>
                        <Typography variant="h6" fontWeight="bold" color={closing.difference === 0 ? 'inherit' : 'error'}>
                            {(closing.difference || 0).toFixed(2)} €
                        </Typography>
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">Durchgeführt von:</Typography>
                        <Typography>{closing.employee?.firstName || ''} {closing.employee?.lastName || ''}</Typography>
                    </Stack>
                </Stack>
            </Paper>
        </Grid>

      </Grid>
      
      {closing.notes && (
          <Box mt={4}>
            <Typography variant="h6" sx={{ mb: 2 }}>Notizen</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>{closing.notes}</Typography>
            </Paper>
          </Box>
      )}

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
              variant="contained"
              color="error"
              onClick={() => setConfirmCancelOpen(true)}
              disabled={closing.status === 'cancelled'}
          >
              {closing.status === 'cancelled' ? 'Bereits storniert' : 'Abschluss stornieren'}
          </Button>
      </Box>

      <Dialog
        open={confirmCancelOpen}
        onClose={() => setConfirmCancelOpen(false)}
      >
        <DialogTitle>Abschluss wirklich stornieren?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Diese Aktion markiert den Kassenabschluss als storniert und gibt den Tag für einen neuen Abschluss frei. Der ursprüngliche Abschluss bleibt aus Nachweisgründen erhalten.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancelOpen(false)} disabled={isCancelling}>
            Abbrechen
          </Button>
          <Button onClick={handleCancelClosing} color="error" variant="contained" disabled={isCancelling}>
            {isCancelling ? 'Wird storniert...' : 'Ja, stornieren'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}