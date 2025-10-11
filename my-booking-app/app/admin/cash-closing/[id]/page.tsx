'use client'

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchCashClosingById, type CashClosing } from '@/services/api';
import { Container, Typography, Paper, Box, CircularProgress, Divider, List, ListItem, ListItemText, Grid } from '@mui/material';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import dayjs from 'dayjs';

export default function CashClosingDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const { id } = params;
  const [closing, setClosing] = useState<CashClosing | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box>;
  }

  if (!closing) {
    return <Typography>Kassenabschluss nicht gefunden.</Typography>;
  }

  const totalWithdrawals = closing.withdrawals.reduce((sum, w) => sum + w.amount, 0);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[
        { label: 'Mein Salon', href: '/admin' },
        { label: 'Kassenabschlüsse', href: '/admin/cash-closing' },
        { label: `Abschluss vom ${dayjs(closing.date).format('DD.MM.YYYY')}` }
      ]} />
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Detailansicht Kassenabschluss
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, mt: 3 }}>
        <Grid container spacing={2}>
            <Grid size={{xs:6}}><Typography color="text.secondary">Datum:</Typography></Grid>
            <Grid size={{xs:6}}><Typography align="right">{dayjs(closing.date).format('DD.MM.YYYY HH:mm')}</Typography></Grid>

            <Grid size={{xs:6}}><Typography color="text.secondary">Mitarbeiter:</Typography></Grid>
            <Grid size={{xs:6}}><Typography align="right">{closing.employee.firstName} {closing.employee.lastName}</Typography></Grid>

            <Grid size={{xs:12}}><Divider sx={{ my: 1 }} /></Grid>

            <Grid size={{xs:6}}><Typography>Einnahmen (Bar):</Typography></Grid>
            <Grid size={{xs:6}}><Typography align="right" fontWeight="bold">€{closing.expectedAmount.toFixed(2)}</Typography></Grid>

            <Grid size={{xs:6}}><Typography>Summe Entnahmen:</Typography></Grid>
            <Grid size={{xs:6}}><Typography align="right" fontWeight="bold">- €{totalWithdrawals.toFixed(2)}</Typography></Grid>

            <Grid size={{xs:12}}><Divider /></Grid>

            <Grid size={{xs:6}}><Typography variant="h6">Soll-Bestand:</Typography></Grid>
            <Grid size={{xs:6}}><Typography variant="h6" align="right" fontWeight="bold">€{closing.finalExpectedAmount.toFixed(2)}</Typography></Grid>
        </Grid>
      </Paper>

      {closing.withdrawals.length > 0 && (
        <>
          <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Aufschlüsselung Entnahmen</Typography>
          <Paper variant="outlined">
            <List>
              {closing.withdrawals.map((w, index) => (
                <ListItem key={index}>
                  <ListItemText primary={w.reason} />
                  <Typography>€{w.amount.toFixed(2)}</Typography>
                </ListItem>
              ))}
            </List>
          </Paper>
        </>
      )}

      {closing.notes && (
          <>
            <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Notizen</Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography>{closing.notes}</Typography>
            </Paper>
          </>
      )}
    </Container>
  );
}