// my-booking-app/app/admin/page.tsx

'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react' // useLayoutEffect hinzufügen
import {
  fetchServices,
  getAllBookings,
  deleteBooking,
  fetchAllUsers,
  updateBooking,
} from '@/services/api'
import dynamic from 'next/dynamic'
import {
  Box, Button, Chip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Typography, Avatar, Tooltip, IconButton, Container, Paper
} from '@mui/material'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import type { Service } from '@/services/api'
import dayjs from 'dayjs'
import 'dayjs/locale/de';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'

// Icons
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';

dayjs.locale('de');

type User = {
  _id: string
  email: string
  role: 'user' | 'admin' | 'staff'
  name?: string
  firstName?: string;
  lastName?: string;
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

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase();


// NEUE KOMPONENTE für den Event-Inhalt
interface CalendarEventContentProps {
  arg: any; // FullCalendar eventContent argument
}

const CalendarEventContent: React.FC<CalendarEventContentProps> = ({ arg }) => {
  const eventRef = useRef<HTMLDivElement>(null);
  const [eventHeight, setEventHeight] = useState(0);

  // Misst die Höhe des Events nach dem Rendern
  useLayoutEffect(() => {
    if (eventRef.current) {
      setEventHeight(eventRef.current.offsetHeight);
    }
  }, [arg.event.start, arg.event.end]); // Abhängigkeiten, die bei Änderung die Höhe neu berechnen lassen

  // Logik zur Anpassung der Schriftgrößen basierend auf der Höhe
  const isCompact = eventHeight < 60; // Beispiel-Schwellenwert, kann angepasst werden
  const isSuperCompact = eventHeight < 40; // Für sehr kurze Termine

  let timeFontSize = '0.75rem'; // caption
  let customerFontSize = '0.875rem'; // body2
  let serviceFontSize = '0.75rem'; // caption

  if (isSuperCompact) {
    timeFontSize = '0.65rem';
    customerFontSize = '0.75rem';
    serviceFontSize = '0.65rem';
  } else if (isCompact) {
    timeFontSize = '0.7rem';
    customerFontSize = '0.8rem';
    serviceFontSize = '0.7rem';
  }

  // Bestimmt die Reihenfolge und Sichtbarkeit der Elemente
  // Bei sehr kurzen Terminen könnte man z.B. den Service-Titel weglassen
  const showTime = eventHeight > 20; // Nur Zeit anzeigen, wenn genug Platz ist
  const showService = eventHeight > 35; // Service anzeigen, wenn etwas mehr Platz ist

  return (
    <Box
      ref={eventRef} // Referenz für die Höhenmessung
      sx={{
        px: 1,
        py: '2px',
        overflow: 'hidden',
        height: '100%',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start', // Startet oben, flex-end für unten, space-between für Verteilung
        // Hier können weitere dynamische Styles für den gesamten Container hinzugefügt werden
      }}
    >
      {showTime && (
        <Typography noWrap sx={{ lineHeight: 1.1, fontWeight: 'bold', fontSize: timeFontSize }}>
          {dayjs(arg.event.start).format('HH:mm')} - {dayjs(arg.event.end).format('HH:mm')}
        </Typography>
      )}
      <Typography noWrap sx={{ lineHeight: 1.1, fontWeight: 'bold', fontSize: customerFontSize }}>
        {arg.event.extendedProps.customer}
      </Typography>
      {showService && (
        <Typography noWrap sx={{ lineHeight: 1.1, opacity: 0.9, fontSize: serviceFontSize }}>
          {arg.event.title}
        </Typography>
      )}
    </Box>
  );
};


function AdminPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingFull[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [openEvent, setOpenEvent] = useState(false)
  const [activeBooking, setActiveBooking] = useState<BookingFull | null>(null)
  const [edit, setEdit] = useState<{dateTime: string; serviceId: string; staffId: string}>({
    dateTime: '', serviceId: '', staffId: ''
  })
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  const staffUsers = useMemo(() => users.filter(u => u.role === 'staff'), [users]);

  const staffColors = useMemo(() => {
    const palette = ['#A1887F', '#FFAB40', '#4DB6AC', '#BA68C8', '#7986CB', '#4FC3F7', '#F06292', '#AED581'];
    const colorMap = new Map<string, string>();
    staffUsers.forEach((staff, index) => {
      colorMap.set(staff._id, palette[index % palette.length]);
    });
    return colorMap;
  }, [staffUsers]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      return
    }
    if (!token) return

    const fetchData = async () => {
      try {
        const [bookingsData, staffUsersData, servicesData] = await Promise.all([
          getAllBookings(token),
          fetchAllUsers(token, 'staff'),
          fetchServices(token),
        ])
        setBookings(bookingsData)
        setUsers(staffUsersData)
        setServices(servicesData)
      } catch (error) {
        console.error("Failed to fetch admin data:", error)
      }
    }
    fetchData()
  }, [user, token, router])

  const openDialogFor = (bookingId: string) => {
    const b = bookings.find(x => x._id === bookingId)
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

  const calendarEvents = useMemo(() => {
    return bookings
    .filter(b => b.staff?._id && b.user && typeof b.user === 'object')
    .map((b) => {
        const service = services.find(s => s._id === (b.service?._id || b.serviceId));
        const start = new Date(b.dateTime);
        const duration = service?.duration ?? 30;
        const end = new Date(start.getTime() + duration * 60000);
        const staffId = b.staff?._id;

        const customerUser = b.user as User;
        const customerName = `${customerUser.firstName} ${customerUser.lastName}`.trim() || customerUser.email || 'Kunde';

        return {
            id: b._id,
            title: service?.title ?? 'Service',
            start: start.toISOString(),
            end: end.toISOString(),
            resourceId: staffId,
            extendedProps: {
                customer: customerName,
            },
            backgroundColor: staffColors.get(staffId!) || '#8D6E63',
            borderColor: staffColors.get(staffId!) || '#8D6E63',
        };
    });
  }, [bookings, services, staffColors]);

  const calendarResources = useMemo(() => {
    return staffUsers.map(s => ({
      id: s._id,
      title: `${s.firstName} ${s.lastName}` || s.name || s.email,
    }));
  }, [staffUsers]);

  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const original = bookings.find(b => b._id === event.id);
    if (!original) return info.revert();

    try {
        const payload = {
            dateTime: event.start.toISOString(),
            staffId: event.getResources()[0]?.id || original.staff?._id,
        };
        await updateBooking(event.id, payload, token!);
        setBookings(prev => prev.map(b => 
            b._id === event.id 
                ? { ...b, dateTime: payload.dateTime, staff: users.find(u => u._id === payload.staffId) } 
                : b
        ));
    } catch (e: any) {
        info.revert();
        alert(`Verschieben fehlgeschlagen: ${e.response?.data?.message || e.message}`);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="xl">
            <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Kalender' }]} />
            
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, mt: 2 }}>
                <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
                    Kalender
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
                <Typography variant="h6" sx={{ minWidth: '280px', textAlign: 'right', fontWeight: 500 }}>
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
                    eventDrop={handleEventDrop}
                    eventClick={(info) => openDialogFor(info.event.id)}
                    resourceAreaHeaderContent="Mitarbeiter"
                    resourceLabelContent={(arg) => (
                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.5, px: 1 }}>
                           <Avatar sx={{ bgcolor: staffColors.get(arg.resource.id), width: 40, height: 40, fontSize: '1rem' }}>
                                {getInitials(arg.resource.title)}
                           </Avatar>
                           <Typography variant="body1" fontWeight={600}>{arg.resource.title}</Typography>
                        </Stack>
                    )}
                    eventContent={(arg) => <CalendarEventContent arg={arg} />}
                />
            </Paper>

            <Dialog open={openEvent} onClose={closeDialog} fullWidth maxWidth="xs">
                <DialogTitle>Buchung bearbeiten</DialogTitle>
                <DialogContent sx={{ display:'flex', flexDirection:'column', gap:2, pt:2 }}>
                    {activeBooking && (
                        <>
                            <Typography variant="body1">
                                Kunde: <strong>{(typeof activeBooking.user === 'object' && ((activeBooking.user as User).firstName || (activeBooking.user as User).name)) ? `${(activeBooking.user as User).firstName} ${(activeBooking.user as User).lastName}` : 'Unbekannt'}</strong>
                            </Typography>

                            <TextField
                                label="Datum & Uhrzeit"
                                type="datetime-local"
                                value={edit.dateTime}
                                onChange={(e)=> setEdit({...edit, dateTime: e.target.value})}
                                InputLabelProps={{ shrink:true }}
                            />
                            <TextField select label="Service" value={edit.serviceId} onChange={(e)=> setEdit({...edit, serviceId: e.target.value})}>
                                {services.map(s => <MenuItem key={s._id} value={s._id}>{s.title}</MenuItem>)}
                            </TextField>
                            <TextField select label="Mitarbeiter" value={edit.staffId} onChange={(e)=> setEdit({...edit, staffId: e.target.value})}>
                                {staffUsers
                                .filter(s => Array.isArray(s.skills) && s.skills.some((sk: any) => sk._id === edit.serviceId))
                                .map(s => <MenuItem key={s._id} value={s._id}>{s.name || `${s.firstName} ${s.lastName}`}</MenuItem>)}
                            </TextField>
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button onClick={closeDialog}>Abbrechen</Button>
                    {activeBooking && (
                        <>
                            <Button
                                color="error"
                                onClick={async () => {
                                    if (!activeBooking) return;
                                    await deleteBooking(activeBooking._id, token!);
                                    setBookings(prev => prev.filter(b => b._id !== activeBooking._id));
                                    closeDialog();
                                }}
                            >
                                Löschen
                            </Button>
                            <Button
                                variant="contained"
                                onClick={async ()=> {
                                if (!activeBooking) return;
                                await updateBooking(activeBooking._id, {
                                    dateTime: new Date(edit.dateTime).toISOString(),
                                    serviceId: edit.serviceId,
                                    staffId: edit.staffId,
                                }, token!);
                                const updatedBookings = await getAllBookings(token!);
                                setBookings(updatedBookings);
                                closeDialog();
                                }}
                            >
                                Speichern
                            </Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Container>
    </Box>
  )
}

export default dynamic(() => Promise.resolve(AdminPage), { ssr: false })