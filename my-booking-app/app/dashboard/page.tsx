'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getUserBookings, deleteBooking, type Booking, type Service } from '@/services/api'
import {
  Container, Typography, Card, CardContent, CardActions, Button, Box, Paper, Alert,
  Stack,
  CircularProgress,
  Grid,
  Tooltip,
  // ⬇️ NEU:
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'

// Icons
import EventIcon from '@mui/icons-material/Event';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import MoodBadIcon from '@mui/icons-material/MoodBad';

// staff-Eigenschaft zum Typ hinzufügen
type BookingWithService = Booking & {
  service: Service;
  staff: {
    _id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  }
};

export default function DashboardPage() {
  const { user, token, logout, loading } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingWithService[]>([])
  const [dataLoading, setDataLoading] = useState(true);

  // ⬇️ NEU: State für Bestätigungsdialog
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingWithService | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  // ⬇️ NEU: Öffnet den Dialog und merkt sich den Termin
  const openCancelDialog = (booking: BookingWithService) => {
    setBookingToCancel(booking);
    setConfirmOpen(true);
  };

  // ⬇️ NEU: Schließt den Dialog ohne zu löschen
  const closeCancelDialog = () => {
    setConfirmOpen(false);
    setBookingToCancel(null);
  };

  // ⬇️ Anpassung: tatsächliches Löschen erst nach Bestätigung
  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      setDeletingId(bookingToCancel._id);
      const success = await deleteBooking(bookingToCancel._id, token!)
      if (success) {
        setBookings(prev => prev.filter(b => b._id !== bookingToCancel._id))
      } else {
        alert('Fehler beim Stornieren!')
      }
    } catch (err) {
      alert('Fehler beim Stornieren!')
    } finally {
      setDeletingId(null);
      closeCancelDialog();
    }
  }

  // Funktion zur Prüfung, ob ein Termin stornierbar ist
  const isCancellable = (dateTime: string) => {
    const now = dayjs();
    const bookingDate = dayjs(dateTime);
    const diffHours = bookingDate.diff(now, 'hour');
    return diffHours >= 24;
  };

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
      <Box sx={{
        bgcolor: 'primary.main',
        color: 'white',
        py: 6,
        mb: 5
      }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight={800}>Willkommen zurück, {user?.firstName || user?.email}! 👋</Typography>
              <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.8 }}>Hier ist eine Übersicht deiner Termine.</Typography>
            </Box>
            <Button
              variant="contained"
              color="secondary"
              size="large"
              sx={{ mt: { xs: 2, md: 0 } }}
              endIcon={<ArrowForwardIcon />}
              onClick={() => router.push('/booking')}
            >
              Neuen Termin buchen
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 5 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>Anstehende Termine</Typography>
        {upcomingBookings.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <MoodBadIcon color="action" sx={{ fontSize: 60, opacity: 0.5 }} />
            <Typography variant="h6" color="text.secondary">Du hast noch keine Termine gebucht.</Typography>
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => router.push('/booking')}>Jetzt Buchen</Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {upcomingBookings.map((b) => (
              <Grid key={b._id} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    transition: 'box-shadow 0.3s',
                    '&:hover': { boxShadow: 6 }
                  }}
                >
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
                        <Typography variant="body1">
                          {b.staff ? `${b.staff.firstName} ${b.staff.lastName}`.trim() : 'N/A'}
                        </Typography>
                      </Stack>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <CategoryIcon color="action" />
                        <Typography variant="body1">{b.service?.duration} Minuten</Typography>
                      </Stack>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2 }}>
                    {isCancellable(b.dateTime) ? (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => openCancelDialog(b)}
                        disabled={deletingId === b._id}
                      >
                        {deletingId === b._id ? 'Wird storniert...' : 'Stornieren'}
                      </Button>
                    ) : (
                      <Tooltip title="Stornierung nicht mehr möglich (weniger als 24h)">
                        <span>
                          <Button size="small" color="error" disabled>
                            Stornieren
                          </Button>
                        </span>
                      </Tooltip>
                    )}
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

      {/* ⬇️ NEU: Bestätigungsdialog */}
      <Dialog
        open={confirmOpen}
        onClose={closeCancelDialog}
        aria-labelledby="confirm-cancel-title"
      >
        <DialogTitle id="confirm-cancel-title">Termin wirklich stornieren?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {bookingToCancel
              ? `Möchtest du den Termin „${bookingToCancel.service?.title ?? 'Service'}“ am ${dayjs(bookingToCancel.dateTime).format('DD.MM.YYYY [um] HH:mm [Uhr]')} wirklich stornieren?`
              : 'Möchtest du diesen Termin wirklich stornieren?'}
          </DialogContentText>
          <DialogContentText sx={{ mt: 1 }} color="error">
            Hinweis: Stornierungen sind nur bis 24 Stunden vor dem Termin möglich.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCancelDialog}>Abbrechen</Button>
          <Button
            onClick={confirmCancel}
            color="error"
            variant="contained"
            autoFocus
            disabled={!!deletingId}
          >
            {deletingId ? 'Storniere…' : 'Ja, stornieren'}
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  )
}
