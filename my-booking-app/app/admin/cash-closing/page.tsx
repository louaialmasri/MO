'use client'

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { listCashClosings, type CashClosing } from '@/services/api'; 
import {
  Container, Typography, Paper, Stack, Button, CircularProgress, Box, Divider, List, ListItem, ListItemText,
  ListItemButton,
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
            setClosings(data);
          })
          .catch(err => {
            console.error(err);
            // Im Fehlerfall explizit leeres Array setzen, um Abstürze zu verhindern
            setClosings([]); 
          })
          .finally(() => setLoading(false));
      }
    };

    if (!authLoading) {
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
              <ListItemButton onClick={() => router.push(`/admin/cash-closing/${closing._id}`)}>
                <ListItemText
                  primary={`Abschluss vom ${dayjs(closing.date).format('DD.MM.YYYY HH:mm')}`}
                  secondary={`Durchgeführt von: ${closing.employee?.firstName || ''} ${closing.employee?.lastName || ''}`}
                />
                <Stack alignItems="flex-end">
                  <Typography variant="body1">Einnahmen (Bar): <strong>{(closing.expectedAmount || 0).toFixed(2)} €</strong></Typography>
                  <Typography variant="body2" color='text.secondary'>
                    Soll-Bestand: {(closing.finalExpectedAmount || 0).toFixed(2)} €
                  </Typography>
                </Stack>
              </ListItemButton>
              {index < closings.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </Paper>
    </Container>
  );
}