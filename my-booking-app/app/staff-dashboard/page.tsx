'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getStaffBookings, register, StaffBooking, Service, fetchServices, updateBooking, User, fetchAllUsers } from '@/services/api'
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
  Select
} from '@mui/material'
import { motion } from 'framer-motion'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import dayGridPlugin from '@fullcalendar/daygrid'
import { deleteBooking } from '@/services/api'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { de } from 'date-fns/locale' 

export default function StaffDashboardPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<StaffBooking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ serviceId: '', dateTime: '' })
  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    password: '',
    role: 'user',
  })
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'staff' | 'admin'>('all')

  useEffect(() => {
    if (!user) return

    if (user.role !== 'staff') {
      router.push('/login')
      return
    }

    const loadData = async () => {
      try {
        const [bookingsData, servicesData, usersData] = await Promise.all([
          getStaffBookings(token!),
          fetchServices(),
          fetchAllUsers(token!)
        ])
        setBookings(bookingsData)
        setServices(servicesData)
        setUsers(usersData)
      } catch (err) {
        console.error('Fehler beim Laden der Buchungen oder Services:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, token, router])

  if (!user || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography ml={2}>Lade Buchungen...</Typography>
      </Box>
    )
  }

  // Kalender-Einträge vorbereiten
  const calendarEvents = bookings
    .filter(b => b.service && b.user)
    .map((b) => {
      const duration = b.service!.duration ?? 30
      const start = new Date(b.dateTime)
      const end = new Date(start.getTime() + duration * 60000)

      return {
        id: b._id,
        title: `${b.service!.title} – ${b.user!.email}`,
        start: start.toISOString(),
        end: end.toISOString(),
      }
    })

  const isCancellable = (dateTime: string) => {
    if (user?.role === 'staff' || user?.role === 'admin') return true

    const now = new Date()
    const bookingDate = new Date(dateTime)
    const diffHours = (bookingDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours >= 24
  }

  const handleOpenDialog = () => setOpenDialog(true)
  const handleCloseDialog = () => {
    setOpenDialog(false)
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      password: '',
      role: 'user',
    })
  }

  const handleCreateUser = async () => {
    try {
      await register(
        formData.email,
        formData.password,
        formData.name,
        formData.address,
        formData.phone,
        'user'
      )
      alert('Benutzer erfolgreich erstellt!')
      handleCloseDialog()
    } catch (err) {
      console.error('Fehler beim Erstellen des Benutzers:', err)
      alert('Fehler beim Erstellen des Benutzers.')
    }
  }

  // Wenn eine Buchung ausgewählt wird, Editier-Formular befüllen
  const handleBookingClick = (booking: StaffBooking) => {
    const localDate = new Date(booking.dateTime)
    const offset = localDate.getTimezoneOffset()
    localDate.setMinutes(localDate.getMinutes() - offset)

    setSelectedBooking(booking)
    setEditForm({
      serviceId: booking.service._id,
      dateTime: localDate.toISOString().slice(0, 16), // korrekt formatierte lokale Zeit
    })
    setEditMode(false)
  }


  const handleEditSave = async () => {
    if (!selectedBooking) return
    try {
      await updateBooking(selectedBooking._id, {
        serviceId: editForm.serviceId,
        dateTime: editForm.dateTime,
      }, token!)
      setBookings(prev =>
        prev.map(b =>
          b._id === selectedBooking._id
            ? {
                ...b,
                service: services.find(s => s._id === editForm.serviceId)!,
                dateTime: editForm.dateTime,
              }
            : b
        )
      )
      setSelectedBooking(null)
      setEditMode(false)
    } catch (err) {
      alert('Fehler beim Speichern der Änderungen.')
    }
  }
  // Gefilterte User-Liste
  const filteredUsers = userRoleFilter === 'all'
    ? users
    : users.filter(u => u.role === userRoleFilter)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box maxWidth="900px" margin="auto" mt={5} p={2}>
        <Typography variant="h4" gutterBottom>
          Kalender – Deine Buchungen
        </Typography>

        <FullCalendar
          plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale="de"
          headerToolbar={{
            start: 'prev,next today',
            center: 'title',
            end: 'timeGridDay,timeGridWeek,dayGridMonth'
          }}
          allDaySlot={false}
          slotMinTime="09:00:00"
          slotMaxTime="20:00:00"
          slotMinWidth={100}
          events={calendarEvents}
          height="auto"
          eventClick={(info) => {
            const clickedBooking = bookings.find(b => b._id === info.event.id)
            if (clickedBooking) handleBookingClick(clickedBooking)
          }}
        />

        {/* Buchungsdetails- und Bearbeiten-Dialog */}
        <Dialog open={!!selectedBooking} onClose={() => { setSelectedBooking(null); setEditMode(false) }}>
          <DialogTitle>
            {editMode ? 'Buchung bearbeiten' : 'Buchungsdetails'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                      if (!selectedBooking) return
                      deleteBooking(selectedBooking._id, token!)
                        .then(() => {
                          setBookings(prev => prev.filter(b => b._id !== selectedBooking._id))
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

        {/* Benutzer anlegen Button */}
        <Button
          variant="contained"
          color="primary"
          onClick={handleOpenDialog}
          sx={{ mt: 3, mb: 2, mr: 2 }}
        >
          Benutzer anlegen
        </Button>
        {/* Nutzer anzeigen Button */}
        <Button
          variant="contained"
          color="secondary"
          onClick={() => setShowUserDialog(true)}
          sx={{ mt: 3, mb: 2 }}
        >
          Nutzer anzeigen
        </Button>
      </Box>
      {/* Nutzerliste im Dialog */}
      <Dialog open={showUserDialog} onClose={() => setShowUserDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Nutzerliste
          <Button onClick={() => setShowUserDialog(false)} sx={{ color: '#1976d2' }}>
            SCHLIESSEN
          </Button>
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#fafafa' }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel id="role-filter-label" sx={{ color: '#222' }}>Nach Rolle filtern</InputLabel>
            <Select
              labelId="role-filter-label"
              label="Nach Rolle filtern"
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value as any)}
              sx={{
                backgroundColor: '#fff',
                color: '#222',
                '& .MuiSelect-icon': { color: '#222' },
              }}
            >
              <MenuItem value="all">Alle</MenuItem>
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          <List>
            {filteredUsers.map((u) => (
              <ListItem key={u._id} disableGutters sx={{ alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: '30px' }}>📧</ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 500 }}>
                      {u.email || '—'} — Rolle: {u.role}
                    </Typography>
                  }
                />
                {/* Beispiel: Staff kann keine Rollen ändern, daher kein Button */}
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
      {/* Dialog zum Anlegen eines neuen Benutzers */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Neuen Benutzer anlegen</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <TextField label="Adresse" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          <TextField label="Telefonnummer" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <TextField label="E-Mail" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <TextField label="Passwort" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          {/* Rolle anzeigen, aber nicht editierbar */}
          <TextField label="Rolle" value="user" InputProps={{ readOnly: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Abbrechen</Button>
          <Button variant="contained" onClick={handleCreateUser}>Erstellen</Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  )
}