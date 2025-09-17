// my-booking-app/app/admin/cash-transactions/page.tsx
'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { fetchAllInvoices, type InvoiceListItem } from '@/services/api';
import {
  Container, Typography, Paper, Stack, TextField, List, ListItem, ListItemButton,
  ListItemText, CircularProgress, Box, Divider, Chip
} from '@mui/material';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs';
import dayjs from 'dayjs';

export default function CashTransactionsPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && token) {
      fetchAllInvoices(token)
        .then(data => {
          setInvoices(data);
          setFilteredInvoices(data);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token, authLoading]);

  useEffect(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = invoices.filter(item => 
      item.invoiceNumber.toLowerCase().includes(lowercasedFilter) ||
      `${item.customer.firstName} ${item.customer.lastName}`.toLowerCase().includes(lowercasedFilter) ||
      (item.staff && `${item.staff.firstName} ${item.staff.lastName}`.toLowerCase().includes(lowercasedFilter))
    );
    setFilteredInvoices(filtered);
  }, [searchTerm, invoices]);

  if (authLoading || loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="80vh"><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Kassenbewegungen' }]} />
      <Stack direction="row" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Kassenbewegungen
        </Typography>
        <TextField
          label="Suchen..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <List>
          {filteredInvoices.map((invoice, index) => (
            <Box key={invoice._id}>
              <ListItemButton onClick={() => router.push(`/invoice/${invoice.invoiceNumber}`)}>
                <ListItemText
                  primary={`Rechnung #${invoice.invoiceNumber} - ${invoice.service.title}`}
                  secondary={
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                      <Typography variant="body2" component="span">
                        Kunde: <strong>{`${invoice.customer.firstName} ${invoice.customer.lastName}`}</strong>
                      </Typography>
                      {/* KORREKTUR HIER: Sicherstellen, dass invoice.staff existiert */}
                      <Typography variant="body2" color="text.secondary" component="span">
                        Mitarbeiter: {invoice.staff ? `${invoice.staff.firstName} ${invoice.staff.lastName}` : 'N/A'}
                      </Typography>
                    </Stack>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
                <Stack alignItems="flex-end">
                   <Typography variant="h6" fontWeight={600}>{invoice.amount.toFixed(2)} €</Typography>
                   <Typography variant="body2" color="text.secondary">{dayjs(invoice.date).format('DD.MM.YYYY HH:mm')}</Typography>
                </Stack>
              </ListItemButton>
              {index < filteredInvoices.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </Paper>
    </Container>
  );
}