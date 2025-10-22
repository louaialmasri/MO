'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getUserBookings, deleteBooking, type Booking, type Service } from '@/services/api'
import {
  Container, Typography, Card, CardContent, CardActions, Button, Box, Paper,
  Stack,
  CircularProgress,
  Grid,
  Tooltip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Avatar // NEU: Avatar importiert
} from '@mui/material'
import { motion } from 'framer-motion'
import dayjs from 'dayjs'
import 'dayjs/locale/de' // Wichtig für deutsche Datumsformate
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';


// Icons
import EventIcon from '@mui/icons-material/Event';
import CategoryIcon from '@mui/icons-material/Category';
import MoodBadIcon from '@mui/icons-material/MoodBad';
import EuroSymbolIcon from '@mui/icons-material/EuroSymbol'; // NEU: Preis-Icon
import ReplayIcon from '@mui/icons-material/Replay'; // NEU: "Erneut buchen"-Icon
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

dayjs.locale('de');

// NEU: Hilfsfunktion für Initialen
const getInitials = (firstName = '', lastName = '') => {
    const first = firstName ? firstName[0] : '';
    const last = lastName ? lastName[0] : '';
    return `${first}${last}`.toUpperCase();
};

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
          // Sort bookings: upcoming first, then past ones descending
          const sortedBookings = (userBookings as BookingWithService[]).sort((a, b) =>
            dayjs(b.dateTime).diff(dayjs(a.dateTime))
          );
          setBookings(sortedBookings);
        } catch (error) {
          console.error('Fehler beim Laden der Buchungen:', error)
        } finally {
          setDataLoading(false);
        }
      }
      loadData();
    }
  }, [user, token, router, loading])

  const openCancelDialog = (booking: BookingWithService) => {
    setBookingToCancel(booking);
    setConfirmOpen(true);
  };

  const closeCancelDialog = () => {
    setConfirmOpen(false);
    setBookingToCancel(null);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      setDeletingId(bookingToCancel._id);
      const success = await deleteBooking(bookingToCancel._id, token!)
      if (success) {
        setBookings(prev => prev.filter(b => b._id !== bookingToCancel._id))
      } else {
        // Hier sollte ein besserer Error-Handler hin, z.B. eine Snackbar
        console.error('Fehler beim Stornieren des Termins.');
      }
    } catch (err) {
      console.error('Fehler beim Stornieren:', err);
    } finally {
      setDeletingId(null);
      closeCancelDialog();
    }
  }

  const isCancellable = (dateTime: string) => {
    const now = dayjs();
    const bookingDate = dayjs(dateTime);
    const diffHours = bookingDate.diff(now, 'hour');
    return diffHours >= 24;
  };

  // NEU: Funktion für "Erneut buchen"
  const handleRebook = (booking: BookingWithService) => {
    router.push(`/booking?serviceId=${booking.service._id}&staffId=${booking.staff._id}`);
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

  // NEU: Wiederverwendbare Komponente für eine Terminkarte
  const BookingCard = ({ booking, isPast = false }: { booking: BookingWithService, isPast?: boolean }) => (
    // KORREKTUR: Grid-Syntax angepasst
    <Grid item xs={12} md={6} lg={4} key={booking._id}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 4,
          transition: 'box-shadow 0.3s',
          opacity: isPast ? 0.7 : 1,
          '&:hover': { boxShadow: 6 }
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {booking.service?.title ?? 'Service'}
          </Typography>
          <Stack spacing={1.5} mt={2}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <EventIcon color="action" />
              <Typography variant="body1">
                {dayjs(booking.dateTime).format('dd, DD.MM.YYYY [um] HH:mm [Uhr]')}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', bgcolor: 'primary.light', color: 'primary.main' }}>
                {getInitials(booking.staff.firstName, booking.staff.lastName)}
              </Avatar>
              <Typography variant="body1">
                {booking.staff ? `${booking.staff.firstName} ${booking.staff.lastName}`.trim() : 'N/A'}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CategoryIcon color="action" />
              <Typography variant="body1">{booking.service?.duration} Minuten</Typography>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <EuroSymbolIcon color="action" />
              <Typography variant="body1">{booking.service?.price.toFixed(2)} €</Typography>
            </Stack>
          </Stack>
        </CardContent>

        <CardActions sx={{ px: 2, pb: 2 }}>
          {isPast ? (
            <Button
              size="small"
              startIcon={<ReplayIcon />}
              onClick={() => handleRebook(booking)}
            >
              Erneut buchen
            </Button>
          ) : isCancellable(booking.dateTime) ? (
            <Button
              size="small"
              color="error"
              onClick={() => openCancelDialog(booking)}
              disabled={deletingId === booking._id}
            >
              {deletingId === booking._id ? 'Wird storniert...' : 'Stornieren'}
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
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
       <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6, mb: 5 }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h4" fontWeight={800}>Willkommen zurück, {user?.firstName || user?.email}! 👋</Typography>
              <Typography variant="h6" fontWeight={400} sx={{ opacity: 0.8 }}>Hier ist eine Übersicht deiner Termine.</Typography>
            </Box>
            <Stack direction="row" spacing={2} sx={{ mt: { xs: 2, md: 0 } }}>
                  {/* HIER DIE ÄNDERUNG: Zwei Buttons nebeneinander */}
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="large"
                    startIcon={<ManageAccountsIcon />}
                    onClick={() => router.push('/dashboard/profile')}
                  >
                    Profil bearbeiten
                  </Button>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => router.push('/booking')}
                  >
                    Neuen Termin buchen
                  </Button>
                </Stack>
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
            {upcomingBookings.map((b) => <BookingCard key={b._id} booking={b} />)}
          </Grid>
        )}

        {pastBookings.length > 0 && (
          <>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 6, mb: 3 }}>
              Vergangene Termine
            </Typography>
            <Grid container spacing={3}>
              {pastBookings.map((b) => <BookingCard key={b._id} booking={b} isPast />)}
            </Grid>
          </>
        )}
      </Container>
      
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
