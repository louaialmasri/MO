'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getUserBookings, deleteBooking, type Booking, type Service } from '@/services/api'
import {
  Container, Typography, Card, CardContent, CardActions, Button, Box, Paper, Alert,
  Stack,
  CircularProgress
} from '@mui/material'
import Grid from '@mui/material/Grid'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'

// Icons
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';

type BookingWithService = Booking & { service: Service };

export default function DashboardPage() {
  const { user, token, logout, loading } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (user.role === 'admin') {
        router.push('/admin');
        return;
      }

      const loadData = async () => {
        try {
          const userBookings = await getUserBookings(token!);
          setBookings(userBookings as BookingWithService[]);
        } catch (error) {
          console.error('Fehler beim Laden der Buchungen:', error)
        } finally {
          setDataLoading(false);
        }
      }
      loadData();
    }
  }, [user, token, router, loading])

  const handleCancel = async (bookingId: string) => {
    try {
      const success = await deleteBooking(bookingId, token!)
      if (success) {
        setBookings(prev => prev.filter(b => b._id !== bookingId))
      }
    } catch (err) {
      alert('Fehler beim Stornieren!')
    }
  }

  if (loading || dataLoading || !user || user.role === 'admin') {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="80vh">
        <CircularProgress />
      </Box>
    );
  }

  const upcomingBookings = bookings.filter(b => dayjs(b.dateTime).isAfter(dayjs()));
  const pastBookings = bookings.filter(b => dayjs(b.dateTime).isBefore(dayjs()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={800}>Willkommen zurück, {user?.email} 👋</Typography>
          <Button onClick={logout} variant="outlined">Logout</Button>
        </Stack>

        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Anstehende Termine</Typography>
        {upcomingBookings.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">Du hast noch keine Termine gebucht.</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push('/booking')}>Jetzt Buchen</Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {upcomingBookings.map((b) => (
              // ⬇️ Grid v2: kein "item", stattdessen size={{ ... }}
              <Grid key={b._id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {b.service?.title ?? 'Service'}
                    </Typography>
                    <Stack spacing={1.5} mt={2}>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <EventIcon color="action" />
                        <Typography variant="body1">
                          {dayjs(b.dateTime).format('dd, DD.MM.YYYY [um] HH:mm [Uhr]')}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <PersonIcon color="action" />
                        <Typography variant="body1">{'Mitarbeiter Placeholder'}</Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <CategoryIcon color="action" />
                        <Typography variant="body1">{b.service?.duration} Minuten</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                  <CardActions>
                    <Button size="small" color="error" onClick={() => handleCancel(b._id)}>
                      Stornieren
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {pastBookings.length > 0 && (
          <>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 6, mb: 3 }}>
              Vergangene Termine
            </Typography>
            {/* Hier könnte eine Liste der vergangenen Termine implementiert werden */}
          </>
        )}
      </Container>
    </motion.div>
  )
}
