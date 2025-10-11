'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listCashClosings, type CashClosing } from '@/services/api'; 
import {
  Container, Typography, Paper, Stack, Button, CircularProgress, Box, Divider, List, ListItem, ListItemText,
} from '@mui/material';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';

export default function AdminCashClosingPage() {
  const router = useRouter();
  const { token, loading: authLoading } = useAuth();
  const [closings, setClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClosings = () => {
      if (token) {
        setLoading(true);
        listCashClosings(token)
          .then(data => {
            if (data && Array.isArray(data.closings)) {
              setClosings(data.closings); // Nimm das Array aus dem Objekt
            } else if (Array.isArray(data)) {
              setClosings(data); // Nimm direkt das Array
            } else {
              console.error("Unerwartete Datenstruktur von der API:", data);
              setClosings([]); // Im Fehlerfall ein leeres Array setzen
            }
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      }
    };

    if (!authLoading && token) {
      loadClosings();
    }
  }, [token, authLoading]);
  
  if (authLoading || loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="80vh"><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Kassenabschlüsse' }]} />
      <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Kassenabschlüsse
        </Typography>
        <Button variant="contained" onClick={() => router.push('/admin/cash-closing/new')}>
          Neuer Tagesabschluss
        </Button> 
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <List>
          {closings.map((closing, index) => (
            <Box key={closing._id}>
              <ListItem>
                <ListItemText
                  primary={`Abschluss vom ${dayjs(closing.date).format('DD.MM.YYYY HH:mm')}`}
                  secondary={`Durchgeführt von: ${closing.executedBy?.firstName || ''} ${closing.executedBy?.lastName || ''}`}
                />
                <Stack alignItems="flex-end">
                  <Typography variant="body1">Einnahmen (Bar): <strong>{closing.expectedAmount.toFixed(2)} €</strong></Typography>
                  <Typography variant="body2" color='text.secondary'>
                    Soll-Bestand: {closing.finalExpectedAmount.toFixed(2)} €
                  </Typography>
                </Stack>
              </ListItem>
              {index < closings.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </Paper>
    </Container>
  );
}