// my-booking-app/app/staff-dashboard/page.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getStaffBookings, register, StaffBooking, Service, fetchServices, updateBooking, User, fetchAllUsers, deleteBooking } from '@/services/api'
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  MenuItem,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Select,
  Container, 
  Paper, 
  Stack,
  IconButton,
  Avatar
} from '@mui/material'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid'
import dayGridPlugin from '@fullcalendar/daygrid'
import dayjs from 'dayjs'
import 'dayjs/locale/de'
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'

// Icons
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'

dayjs.locale('de');

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase();

export default function StaffDashboardPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<StaffBooking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ serviceId: '', dateTime: '' })
  const [currentDate, setCurrentDate] = useState<Date>(new Date());


  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'staff') {
      router.push('/'); // Redirect non-staff users
      return;
    }

    const loadData = async () => {
      try {
        const [bookingsData, servicesData] = await Promise.all([
          getStaffBookings(token!),
          fetchServices(token!),
        ])
        setBookings(bookingsData)
        setServices(servicesData)
      } catch (err) {
        console.error('Fehler beim Laden der Daten:', err)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadData()
    }
  }, [user, token, router])


  const calendarEvents = useMemo(() => {
    return bookings
      .filter(b => b.service && b.user)
      .map((b) => {
        const duration = b.service!.duration ?? 30
        const start = new Date(b.dateTime)
        const end = new Date(start.getTime() + duration * 60000)

         const customerName = `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim() || b.user.email;

        return {
          id: b._id,
          title: b.service!.title,
          start: start.toISOString(),
          end: end.toISOString(),
          resourceId: user?._id,
          extendedProps: {
            customer: customerName,
          },
          backgroundColor: '#A1887F',
          borderColor: '#A1887F',
        }
      })
  }, [bookings, user]);

  const calendarResources = useMemo(() => {
    if (!user) return [];
    return [{
      id: user._id,
      title: `${user.firstName} ${user.lastName}`.trim() || user.email,
    }];
  }, [user]);
  
  const handleBookingClick = (info: any) => {
    const clickedBooking = bookings.find(b => b._id === info.event.id)
    if (clickedBooking) {
        const localDate = new Date(clickedBooking.dateTime)
        const offset = localDate.getTimezoneOffset()
        localDate.setMinutes(localDate.getMinutes() - offset)

        setSelectedBooking(clickedBooking)
        setEditForm({
            serviceId: clickedBooking.service._id,
            dateTime: localDate.toISOString().slice(0, 16),
        })
        setEditMode(false)
    }
  }

  const handleEditSave = async () => {
    if (!selectedBooking || !token) return;
    try {
      await updateBooking(selectedBooking._id, {
        serviceId: editForm.serviceId,
        dateTime: editForm.dateTime,
      }, token);
      
      const updatedBookings = await getStaffBookings(token);
      setBookings(updatedBookings);
      setSelectedBooking(null);
      setEditMode(false);
    } catch (err) {
      alert('Fehler beim Speichern der Änderungen.');
    }
  }

  // KORREKTUR: Fehlende Funktion wieder hinzugefügt
  const isCancellable = (dateTime: string) => {
    if (user?.role === 'staff' || user?.role === 'admin') return true;
    const now = new Date();
    const bookingDate = new Date(dateTime);
    const diffHours = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours >= 24;
  };

  if (loading || !user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl">
        <AdminBreadcrumbs items={[{ label: 'Mein Dashboard', href: '/staff-dashboard' }, { label: 'Kalender' }]} />
        
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, mt: 2 }}>
            <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
                Dein Kalender
            </Typography>
            <Stack direction="row" spacing={1} component={Paper} elevation={0} sx={{ p: 0.5, borderRadius: '12px' }}>
                <Tooltip title="Vorheriger Tag">
                    <IconButton onClick={() => setCurrentDate(dayjs(currentDate).subtract(1, 'day').toDate())}><ChevronLeftIcon /></IconButton>
                </Tooltip>
                <Button variant="outlined" startIcon={<TodayIcon />} onClick={() => setCurrentDate(new Date())}>
                    Heute
                </Button>
                <Tooltip title="Nächster Tag">
                    <IconButton onClick={() => setCurrentDate(dayjs(currentDate).add(1, 'day').toDate())}><ChevronRightIcon /></IconButton>
                </Tooltip>
            </Stack>
            <Typography variant="h6" sx={{ minWidth: {md: '280px'}, textAlign: 'right', fontWeight: 500 }}>
                {dayjs(currentDate).format('dddd, DD. MMMM YYYY')}
            </Typography>
        </Stack>

        <Paper sx={{ p: { xs: 1, md: 2 } }}>
            <FullCalendar
                key={currentDate.toISOString()}
                plugins={[resourceTimeGridPlugin, interactionPlugin]}
                initialView="resourceTimeGridDay"
                initialDate={currentDate}
                locale="de"
                allDaySlot={false}
                headerToolbar={false}
                height="auto"
                slotDuration="00:15:00"
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                nowIndicator={true}
                editable={true}
                droppable={true}
                resources={calendarResources}
                events={calendarEvents}
                eventClick={handleBookingClick}
                resourceAreaHeaderContent="Mitarbeiter"
                resourceLabelContent={(arg) => (
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.5, px: 1 }}>
                       <Avatar sx={{ bgcolor: '#A1887F', width: 40, height: 40, fontSize: '1rem' }}>
                            {getInitials(arg.resource.title)}
                       </Avatar>
                       <Typography variant="body1" fontWeight={600}>{arg.resource.title}</Typography>
                    </Stack>
                )}
                eventContent={(arg) => (
                    <Box sx={{
                        px: 1,
                        py: '2px',
                        overflow: 'hidden',
                        height: '100%',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <Typography variant="caption" noWrap sx={{ lineHeight: 1.2, fontWeight: 'bold' }}>
                            {dayjs(arg.event.start).format('HH:mm')} - {dayjs(arg.event.end).format('HH:mm')}
                        </Typography>
                        <Typography variant="body2" noWrap sx={{ lineHeight: 1.2, fontWeight: 'bold' }}>
                            {arg.event.extendedProps.customer}
                        </Typography>
                        <Typography variant="caption" noWrap sx={{ lineHeight: 1.2, opacity: 0.9 }}>
                            {arg.event.title}
                        </Typography>
                    </Box>
                )}
            />
        </Paper>

        <Dialog open={!!selectedBooking} onClose={() => { setSelectedBooking(null); setEditMode(false) }}>
          <DialogTitle>
            {editMode ? 'Buchung bearbeiten' : 'Buchungsdetails'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {editMode ? (
              <>
                <TextField
                  select
                  label="Service"
                  value={editForm.serviceId}
                  onChange={e => setEditForm(f => ({ ...f, serviceId: e.target.value }))}
                  fullWidth
                >
                  {services.map(s => (
                    <MenuItem key={s._id} value={s._id}>{s.title}</MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Datum & Uhrzeit"
                  type="datetime-local"
                  value={editForm.dateTime}
                  onChange={e => setEditForm(f => ({ ...f, dateTime: e.target.value }))}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </>
            ) : (
              <>
                <Typography gutterBottom>
                  <strong>Service:</strong> {selectedBooking?.service.title}
                </Typography>
                <Typography gutterBottom>
                  <strong>Kunde:</strong> {selectedBooking?.user.email}
                </Typography>
                <Typography gutterBottom>
                  <strong>Datum:</strong> {new Date(selectedBooking?.dateTime || '').toLocaleString('de-DE')}
                </Typography>
              </>
            )}
          </DialogContent>
          <DialogActions>
            {editMode ? (
              <>
                <Button onClick={() => setEditMode(false)}>Abbrechen</Button>
                <Button variant="contained" onClick={handleEditSave}>Speichern</Button>
              </>
            ) : (
              <>
                {selectedBooking && isCancellable(selectedBooking.dateTime) ? (
                  <Button
                    onClick={() => {
                      if (!selectedBooking || !token) return
                      deleteBooking(selectedBooking._id, token)
                        .then(() => {
                          setBookings(prev => prev.filter(b => b._id !== selectedBooking!._id))
                          setSelectedBooking(null)
                        })
                        .catch(err => {
                          console.error('Stornierung fehlgeschlagen:', err)
                          alert('Stornierung fehlgeschlagen.')
                        })
                    }}
                    color="error"
                  >
                    Stornieren
                  </Button>
                ) : (
                  <Tooltip title="Stornierung nicht mehr möglich (weniger als 24h)">
                    <span>
                      <Button disabled>Stornieren</Button>
                    </span>
                  </Tooltip>
                )}
                <Button onClick={() => setEditMode(true)} variant="contained" color="primary">
                  Bearbeiten
                </Button>
                <Button onClick={() => setSelectedBooking(null)}>Schließen</Button>
              </>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  )
}