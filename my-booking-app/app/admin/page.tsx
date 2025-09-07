'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  fetchServices,
  deleteServiceById,
  getAllBookings,
  deleteBooking,
  fetchAllUsers,
  updateUserRole,
  register as registerUser,
  updateBooking,
} from '@/services/api'
import styles from './admin.module.css'
import dynamic from 'next/dynamic'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { Box, Button, Chip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Typography } from '@mui/material'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { Service } from '@/services/api'
import dayjs from 'dayjs'
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'



type Booking = {
  _id: string
  user: string | User
  serviceId: string
  dateTime: string
}

type User = {
  _id: string
  email: string
  role: 'user' | 'admin' | 'staff'
  name?: string
  address?: string
  phone?: string
  skills?: { _id: string; title?: string }[]
}

type StaffLite = { _id: string; email: string; name?: string }

type BookingFull = {
  _id: string
  user: string | User
  staff?: StaffLite
  service?: { _id: string; title: string; duration?: number }
  serviceId?: string
  dateTime: string
}


function formatDateTimeLocal(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000
  const localISOTime = new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
  return localISOTime
}


function AdminPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingFull[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'user' | 'staff' | 'admin'>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ serviceId: '', dateTime: '' })
  const [openEvent, setOpenEvent] = useState(false)
  const [activeBooking, setActiveBooking] = useState<BookingFull | null>(null)
  const [edit, setEdit] = useState<{dateTime: string; serviceId: string; staffId: string}>({
    dateTime: '', serviceId: '', staffId: ''
  })
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const openDialogFor = (bookingId: string) => {
    const b = bookings.find(x => x._id === bookingId) as BookingFull | undefined
    if (!b) return
    setActiveBooking(b)
    setEdit({
      dateTime: dayjs(b.dateTime).format('YYYY-MM-DDTHH:mm'),
      serviceId: b.service?._id || b.serviceId || '',
      staffId: b.staff?._id || ''
    })
    setOpenEvent(true)
  }
  const closeDialog = () => { setOpenEvent(false); setActiveBooking(null) }
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<{ name: string; duration: number }>()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login')
      return
    }

    const fetchData = async () => {
      try {
        const all = await getAllBookings(token!)
        setBookings(all)
        await loadServices()
        await fetchUsers()
      } catch (err) {
        console.error('Fehler beim Laden der Buchungen oder Nutzer:', err)
      }
    }

    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token])

  // Reload when active salon changes (Navbar sets localStorage and can dispatch event)
  useEffect(() => {
    if (!token) return
    const fetchData = async () => {
      try {
        const [bookingsData, usersData, servicesData] = await Promise.all([
          getAllBookings(token),
          fetchAllUsers(token),
          fetchServices(token),
        ])
        // KORREKTUR: Sorge dafür, dass die States immer Arrays sind
        setBookings(bookingsData || [])
        setUsers(usersData || [])
        setServices(servicesData || [])
      } catch (error) {
        console.error("Failed to fetch admin data:", error)
        // Setze die States auch bei einem Fehler auf leere Arrays
        setBookings([])
        setUsers([])
        setServices([])
      }
    }
    fetchData()
  }, [token])

  const loadServices = async () => {
    try {
      const data = await fetchServices(token)
      setServices(data)
    } catch (err) {
      console.error('Fehler beim Laden der Services:', err)
    }
  }

  const fetchUsers = async () => {
    try {
      const data = await fetchAllUsers(token!)
      setUsers(data)
    } catch (err) {
      console.error('Fehler beim Laden der Nutzer:', err)
    }
  }

  const handleDeleteService = async (id: string) => {
    try {
      await deleteServiceById(id, token!)
      loadServices()
    } catch (err) {
      console.error('Fehler beim Löschen:', err)
    }
  }

  const handleCancel = async (bookingId: string) => {
    try {
      const success = await deleteBooking(bookingId, token!)
      if (success) {
        setBookings(prev => prev.filter(b => b._id !== bookingId))
      }
    } catch (err) {
      console.error('Fehler beim Stornieren:', err)
    }
  }

  const handleMakeStaff = async (userId: string) => {
    try {
      await updateUserRole(userId, 'staff', token!)
      fetchUsers()
    } catch (err) {
      console.error('Fehler beim Ändern der Rolle:', err)
    }
  }

  const [openDialog, setOpenDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    password: '',
    role: 'user',
  })

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
      await registerUser(
        formData.email,
        formData.password,
        formData.name,
        formData.address,
        formData.phone,
        formData.role as 'user' | 'staff' | 'admin'
      )
      alert('Benutzer erfolgreich erstellt!')
      handleCloseDialog()
      fetchUsers()
    } catch (err) {
      console.error('Fehler beim Erstellen des Benutzers:', err)
      alert('Fehler beim Erstellen des Benutzers.')
    }
  }

  const calendarEvents = bookings
  .filter(b => typeof b.user === 'object') // Safety
  .map((b) => {
    const service = services.find(s => s._id === b.serviceId)
    const start = new Date(b.dateTime)
    const duration = (service?.duration ?? 30) * 60000
    const end = new Date(start.getTime() + duration)

    return {
      id: b._id,
      title: `${service?.title} – ${(b.user as any)?.name ?? 'Unbekannt'} (Staff: ${(b as any).staff?.name ?? '???'})`,
      start: start.toISOString(),
      end: end.toISOString(),
    }
  })

  // Beim Klick auf einen Termin im Kalender
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setEditForm({
      serviceId: booking.serviceId || (services[0]?._id ?? ''),
      dateTime: formatDateTimeLocal(new Date(booking.dateTime)),
    })
    setEditMode(false)
  }

  const handleEditSave = async () => {
    if (!selectedBooking) return
    try {
      // updateBooking muss im Admin-API-Service existieren!
      await updateBooking(selectedBooking._id, {
        serviceId: editForm.serviceId,
        dateTime: editForm.dateTime,
      }, token!)
      setBookings(prev =>
        prev.map(b =>
          b._id === selectedBooking._id
            ? {
                ...b,
                serviceId: editForm.serviceId,
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

// Nur Mitarbeiter (aus deiner users-Liste)
const staffUsers = users.filter(u => u.role === 'staff')

// Ausgewählte Mitarbeiter (standard: alle)
const [visibleStaffIds, setVisibleStaffIds] = useState<string[]>(
  staffUsers.map(s => s._id)
)

// Wenn sich staffUsers ändert, setze Standard neu
useEffect(() => {
  setVisibleStaffIds(staffUsers.map(s => s._id))
}, [users])

const staffColor = (id: string) => {
  const palette = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#06b6d4','#ec4899','#84cc16']
  const idx = Math.abs([...id].reduce((a,c)=>a+c.charCodeAt(0),0)) % palette.length
  return palette[idx]
}

// Events je Staff vorbereiten

const eventsByStaff: Record<string, any[]> = useMemo(() => {
  const map: Record<string, any[]> = {}
  // Hilfsfunktion: Dauer holen (service.duration oder Fallback 30)
  const getDuration = (b: BookingFull) => {
    if (b.service?.duration) return b.service.duration
    const s = services.find(x => x._id === (b.service?._id || b.serviceId))
    return s?.duration ?? 30
  }
  bookings.forEach((b) => {
    const staffId = b.staff?._id
    if (!staffId) return // ohne staff nicht darstellbar
    const start = new Date(b.dateTime)
    // Nur Events des aktuellen Tages zeigen
    const sameDay = (d: string) => dayjs(d).isSame(dayjs(currentDate), 'day')
    if (!staffId || !sameDay(b.dateTime)) return
    const duration = getDuration(b)
    const end = new Date(start.getTime() + duration * 60000)
    if (!map[staffId]) map[staffId] = []
    const serviceTitle = b.service?.title || (services.find(s => s._id === (b.service?._id || b.serviceId))?.title) || 'Service';
    map[staffId].push({
      id: b._id,
      title: `${serviceTitle} – ${
        (typeof b.user === 'object' && b.user?.name) ? b.user.name : String(b.user)
      }`,
      start: start.toISOString(),
      end: end.toISOString(),
      color: staffColor(staffId),
    })
  })
  return map
}, [bookings, services, currentDate])
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={styles.container}
      >
        <h1>Kalender</h1>
        <AdminBreadcrumbs items={[
          { label: 'Mein Salon', href: '/admin' },
          { label: 'Kalender' },
        ]} />
          <Box maxWidth="900px" margin="auto" mt={5} p={2}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" sx={{ mt: 3, mb: 2 }}>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" onClick={() => setCurrentDate(dayjs(currentDate).subtract(1, 'day').toDate())}>◀</Button>
                <Button variant="outlined" onClick={() => setCurrentDate(new Date())}>Heute</Button>
                <Button variant="outlined" onClick={() => setCurrentDate(dayjs(currentDate).add(1, 'day').toDate())}>▶</Button>
              </Stack>

              <Typography sx={{ fontWeight: 700 }}>
                {dayjs(currentDate).format('ddd, DD. MMM YYYY')}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {staffUsers.map(s => {
                  const active = visibleStaffIds.includes(s._id)
                  return (
                    <Chip
                      key={s._id}
                      label={s.name || s.email}
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      onClick={() => {
                        setVisibleStaffIds(prev =>
                          active ? prev.filter(id => id !== s._id) : [...prev, s._id]
                        )
                      }}
                    />
                  )
                })}
              </Stack>
        </Stack>
            <Box
              sx={{
                display: 'grid',
                gridAutoFlow: 'column',
                gridAutoColumns: { xs: '100%', md: '420px' }, // Breitere Spalten
                gap: 2,
                overflowX: 'auto',
                pb: 2,
              }}
            >
              {staffUsers.filter(s => visibleStaffIds.includes(s._id)).map((s) => (
                <Box key={s._id} sx={{ p: 2, bgcolor: 'white', borderRadius: 3, boxShadow: 1 }}>
                  <Typography sx={{ fontWeight: 700, mb: 1 }}>{s.name || s.email}</Typography>
                  <FullCalendar
                    key={`${dayjs(currentDate).format('YYYY-MM-DD')}-${s._id}`}
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridDay"
                    locale="de"
                    headerToolbar={false}
                    height="auto"
                    allDaySlot={false}
                    slotMinTime="09:00:00"
                    slotMaxTime="20:00:00"
                    nowIndicator
                    initialDate={currentDate}
                    events={[
                      ...(eventsByStaff[s._id] ?? []),
                    ]}
                    eventClick={(info) => openDialogFor(info.event.id)}
                    editable
                    eventDrop={async (info) => {
                      const id = info.event.id
                      const newStart = info.event.start!
                      const oldStart = info.oldEvent?.start || new Date()

                      // Original-Booking aus State
                      const original = bookings.find(b => b._id === id)
                      if (!original || !(original as any).staff?._id) {
                        console.error("Booking oder Staff-ID nicht gefunden, Abbruch.")
                        info.revert()
                        return
                      }

                      // Das zu sendende Datenpaket
                      const payload = {
                        dateTime: newStart.toISOString(),
                        serviceId: (original as any).service?._id || (original as any).serviceId,
                        staffId: (original as any).staff?._id, // <-- DIESE ZEILE HINZUFÜGEN
                      }

                      // 1) Optimistic UI
                      setBookings(prev => prev.map(b =>
                        b._id === id ? { ...b, dateTime: payload.dateTime } : b
                      ))

                      try {
                        // 2) Server aktualisieren
                        const updated = await updateBooking(id, payload, token!)

                        // 3) Serverantwort in State mergen
                        setBookings(prev => prev.map(b =>
                          b._id === id ? { ...updated } : b
                        ))
                      } catch (e: any) { // den Typ auf 'any' setzen, um auf 'response' zugreifen zu können
                          const serverMessage = e.response?.data?.message || e.message;

                          console.error("Fehler beim Verschieben des Termins:", serverMessage);
                          console.error("Komplettes Fehlerobjekt:", e); // Optional, für mehr Details

                          info.revert()
                          setBookings(prev => prev.map(b =>
                            b._id === id ? { ...b, dateTime: oldStart.toISOString() } : b
                          ))
                          alert(`Der Termin konnte nicht verschoben werden: ${serverMessage}`);
}
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
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
                value={editForm.serviceId || ''}
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
              {selectedBooking && (
                <>
                  <Typography gutterBottom>
                    <strong>Service:</strong> {services.find(s => s._id === selectedBooking.serviceId)?.title || 'Unbekannt'}
                  </Typography>
                  <Typography gutterBottom>
                    <strong>Kunde:</strong> {
                      typeof selectedBooking.user === 'object'
                        ? selectedBooking.user.email
                        : users.find(u => u._id === selectedBooking.user)?.email || 'Unbekannt'
                    }
                  </Typography>
                  <Typography gutterBottom>
                    <strong>Datum:</strong> {new Date(selectedBooking.dateTime).toLocaleString('de-DE')}
                  </Typography>
                </>
              )}
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
              <Button onClick={() => setEditMode(true)} variant="contained" color="primary">
                Bearbeiten
              </Button>
              <Button onClick={() => setSelectedBooking(null)}>Schließen</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      <Dialog open={openEvent} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Buchung bearbeiten</DialogTitle>
        <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:2 }}>
          {activeBooking && (
            <>
              <Typography variant="body2" color="text.secondary">
                Kunde: {(typeof activeBooking.user === 'object' && activeBooking.user?.email) ? activeBooking.user.email : String(activeBooking.user)}
              </Typography>

              <TextField
                label="Datum & Uhrzeit"
                type="datetime-local"
                value={edit.dateTime}
                onChange={(e)=> setEdit({...edit, dateTime: e.target.value})}
                InputLabelProps={{ shrink:true }}
              />

              <TextField
                select
                label="Service"
                value={edit.serviceId}
                onChange={(e)=> setEdit({...edit, serviceId: e.target.value})}
              >
                {services.map(s => (
                  <MenuItem key={s._id} value={s._id}>{s.title}</MenuItem>
                ))}
              </TextField>

              <TextField
                select
                label="Mitarbeiter"
                value={edit.staffId}
                onChange={(e)=> setEdit({...edit, staffId: e.target.value})}
              >
                {staffUsers
                  .filter(s => Array.isArray(s.skills) && s.skills.some((sk: any) => sk._id === edit.serviceId))
                  .map(s => (
                    <MenuItem key={s._id} value={s._id}>{s.name || s.email}</MenuItem>
                  ))}
              </TextField>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Abbrechen</Button>
          {activeBooking && (
            <>
              <Button
                color="error"
                onClick={async () => {
                  try {
                    await deleteBooking(activeBooking._id, token!)
                    setBookings(prev => prev.filter(b => b._id !== activeBooking._id))
                    closeDialog()
                  } catch {}
                }}
              >
                Löschen
              </Button>
              <Button
                variant="contained"
                onClick={async ()=> {
                  if (!activeBooking) return
                  try {
                    await updateBooking(activeBooking._id, {
                      dateTime: new Date(edit.dateTime).toISOString(),
                      serviceId: edit.serviceId,
                      staffId: edit.staffId,
                    }, token!)
                    // lokal aktualisieren
                    setBookings(prev => prev.map(b =>
                      b._id === activeBooking._id
                        ? { ...b, dateTime: new Date(edit.dateTime).toISOString(),
                            service: { ...(b as any).service, _id: edit.serviceId },
                            staff: { ...(b as any).staff, _id: edit.staffId } }
                        : b
                    ))
                    closeDialog()
                  } catch {}
                }}
              >
                Speichern
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </motion.div>
  </>
  )
}

export default dynamic(() => Promise.resolve(AdminPage), { ssr: false })