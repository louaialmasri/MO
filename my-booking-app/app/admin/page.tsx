'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react'
import {
  fetchServices,
  getAllBookings,
  deleteBooking,
  fetchAllUsers,
  updateBooking,
  markBookingAsPaid,
  createBooking, // NEU: Import für die neue Kopier-Funktion
} from '@/services/api'
import dynamic from 'next/dynamic'
import {
  Box, Button, Chip, Stack, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Typography, Avatar, Tooltip, IconButton, Container, Paper,
  Snackbar, Alert,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction' // NEU: DateClickArg importiert
import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import type { Service } from '@/services/api'
import dayjs from 'dayjs'
import 'dayjs/locale/de';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'

// Icons
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import PaymentIcon from '@mui/icons-material/Payment';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

dayjs.locale('de');

// --- TYP-DEFINITIONEN ---
type User = {
  _id: string
  email: string
  role: 'user' | 'admin' | 'staff'
  name?: string
  firstName?: string;
  lastName?: string;
  skills?: { _id: string; title?: string }[]
}

type StaffLite = { _id: string; email: string; name?: string; firstName?: string; lastName?: string; }

type BookingFull = {
  _id: string
  user: User
  staff?: StaffLite
  service?: { _id: string; title: string; duration?: number, price?: number }
  serviceId?: string
  dateTime: string
  status: 'confirmed' | 'paid' | 'cancelled';
  invoiceNumber?: string;
  history?: {
    action: string;
    executedBy: { firstName: string; lastName: string; };
    timestamp: string;
    details?: string;
  }[];
}

// --- HELPER-FUNKTIONEN ---
const getInitials = (name = '') => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';

const translateAction = (action: string) => {
  switch (action) {
    case 'created': return 'Erstellt';
    case 'rescheduled': return 'Uhrzeit geändert';
    case 'assigned': return 'Mitarbeiter geändert';
    case 'cancelled': return 'Storniert';
    default: return action;
  }
};


// --- KOMPONENTEN ---
const CalendarEventContent: React.FC<{ arg: any }> = ({ arg }) => {
  const eventRef = useRef<HTMLDivElement>(null);
  const [eventHeight, setEventHeight] = useState(0);

  useLayoutEffect(() => {
    if (eventRef.current) {
      setEventHeight(eventRef.current.offsetHeight);
    }
  }, [arg.event.start, arg.event.end]);

  const showTime = eventHeight > 20;
  const showService = eventHeight > 35;

  let timeFontSize = '0.75rem';
  let customerFontSize = '0.875rem';
  let serviceFontSize = '0.75rem';

  if (eventHeight < 40) {
    timeFontSize = '0.65rem';
    customerFontSize = '0.75rem';
    serviceFontSize = '0.65rem';
  } else if (eventHeight < 60) {
    timeFontSize = '0.7rem';
    customerFontSize = '0.8rem';
    serviceFontSize = '0.7rem';
  }

  return (
    <Box
      ref={eventRef}
      sx={{
        px: 1, py: '2px', overflow: 'hidden', height: '100%', color: 'white',
        display: 'flex', flexDirection: 'column',
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
  const [editMode, setEditMode] = useState(false);
  const [edit, setEdit] = useState<{ dateTime: string; serviceId: string; staffId: string }>({
    dateTime: '', serviceId: '', staffId: ''
  })
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [amountGiven, setAmountGiven] = useState('');
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' | 'info' }>({ open: false, msg: '', sev: 'success' })
  const [showHistory, setShowHistory] = useState(false);
  const [copiedBooking, setCopiedBooking] = useState<BookingFull | null>(null); // NEU: State für den Kopiermodus

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
    if (!user || user.role !== 'admin' || !token) {
      return;
    }

    const fetchData = async () => {
      try {
        const [bookingsData, staffUsersData, servicesData] = await Promise.all([
          getAllBookings(token),
          fetchAllUsers(token, 'staff'),
          fetchServices(token),
        ]);
        setBookings(bookingsData);
        setUsers(staffUsersData);
        setServices(servicesData);
      } catch (error) {
        console.error("Failed to fetch admin data:", error);
        setToast({ open: true, msg: 'Daten konnten nicht geladen werden.', sev: 'error' });
      }
    };
    fetchData();
  }, [user, token, router]);

  const openDialogFor = (bookingId: string) => {
    const b = bookings.find(x => x._id === bookingId);
    if (!b) return;
    setActiveBooking(b);
    setEdit({
      dateTime: dayjs(b.dateTime).format('YYYY-MM-DDTHH:mm'),
      serviceId: b.service?._id || b.serviceId || '',
      staffId: b.staff?._id || ''
    });
    setEditMode(false);
    setShowHistory(false);
    setOpenEvent(true);
  };

  const closeDialog = () => {
    setOpenEvent(false);
    setActiveBooking(null);
    setEditMode(false);
    setShowHistory(false);
  };

  const calendarEvents = useMemo(() => {
    return bookings
      .filter(b => b && b.staff && b.staff._id && b.user)
      .map((b) => {
        const service = services.find(s => s._id === (b.service?._id || b.serviceId));
        const start = new Date(b.dateTime);
        const duration = service?.duration ?? 30;
        const end = new Date(start.getTime() + duration * 60000);
        const staffId = b.staff?._id;

        const customerName = `${b.user.firstName || ''} ${b.user.lastName || ''}`.trim() || b.user.email || 'Kunde';

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
      title: `${s.firstName} ${s.lastName}`.trim() || s.name || s.email,
    }));
  }, [staffUsers]);

  const handleEventDrop = async (info: any) => {
    const { event } = info;
    const originalBooking = bookings.find(b => b._id === event.id);
    if (!originalBooking) {
      info.revert();
      return;
    }

    const newStaffId = event.getResources()[0]?.id;
    if (newStaffId && newStaffId !== originalBooking.staff?._id) {
      const serviceId = originalBooking.service?._id || originalBooking.serviceId;
      const newStaffMember = staffUsers.find(staff => staff._id === newStaffId);
      const hasSkill = newStaffMember?.skills?.some(skill => (typeof skill === 'string' ? skill : skill._id) === serviceId);

      if (!hasSkill) {
        info.revert();
        setToast({
          open: true,
          msg: `Mitarbeiter ${newStaffMember?.firstName} beherrscht diesen Service nicht.`,
          sev: 'error'
        });
        return;
      }
    }

    try {
      const payload = {
        dateTime: event.start.toISOString(),
        staffId: newStaffId || originalBooking.staff?._id,
      };
      const response = await updateBooking(event.id, payload, token!);
      
      if (response) { 
        setBookings(prev => prev.map(b => b._id === event.id ? response : b));
        setToast({ open: true, msg: 'Termin verschoben!', sev: 'success' });
      } else {
        throw new Error("Ungültige Antwort vom Server");
      }
    } catch (e: any) {
      info.revert();
      setToast({ open: true, msg: `Verschieben fehlgeschlagen: ${e.response?.data?.message || e.message}`, sev: 'error' });
    }
  }


  // NEU: Funktion, die beim Klick auf einen leeren Slot ausgeführt wird
  const handleDateClick = async (arg: DateClickArg) => {
    if (copiedBooking) {
      const { user, service } = copiedBooking;
      const staffId = arg.resource?.id;
      const dateTime = arg.dateStr;

      if (!staffId || !service?._id) {
        setToast({ open: true, msg: 'Mitarbeiter oder Service fehlen.', sev: 'error' });
        return;
      }

      try {
        const response = await createBooking(service._id, dateTime, staffId, token!, user._id);
        if (response.booking) {
          setBookings(prev => [...prev, response.booking]);
          setToast({ open: true, msg: 'Termin erfolgreich eingefügt!', sev: 'success' });
        } else {
           throw new Error(response.message || 'Fehler beim Erstellen des Termins');
        }
      } catch (e: any) {
        setToast({ open: true, msg: e.response?.data?.message || 'Einfügen fehlgeschlagen.', sev: 'error' });
      } finally {
        setCopiedBooking(null); // Kopiermodus beenden
      }
    }
  };

  // NEU: Funktion, die den Kopiermodus startet
  const handleStartCopy = () => {
    if (!activeBooking) return;
    setCopiedBooking(activeBooking);
    setToast({ open: true, msg: 'Termin kopiert. Klicken Sie zum Einfügen in einen freien Slot.', sev: 'info' });
    closeDialog();
  };

  const handleDeleteBooking = async () => {
    if (!activeBooking || !token) return;
    try {
      await deleteBooking(activeBooking._id, token);
      setBookings(prev => prev.filter(b => b._id !== activeBooking._id));
      setToast({ open: true, msg: 'Termin gelöscht', sev: 'success' });
      closeDialog();
      setDeleteConfirmOpen(false);
    } catch (err) {
      setToast({ open: true, msg: 'Fehler beim Löschen', sev: 'error' });
    }
  };

  const servicePrice = activeBooking?.service?.price || 0;
  const change = parseFloat(amountGiven) >= servicePrice ? parseFloat(amountGiven) - servicePrice : 0;

  const handleOpenPaymentDialog = () => {
    setAmountGiven(servicePrice.toString());
    setPaymentDialogOpen(true);
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setAmountGiven('');
  };

  const handlePaymentSubmit = async () => {
    if (!activeBooking || !token) return;
    try {
      await markBookingAsPaid(activeBooking._id, 'cash', parseFloat(amountGiven), token);
      const updatedBookings = await getAllBookings(token);
      setBookings(updatedBookings);
      handleClosePaymentDialog();
      closeDialog();
      setToast({ open: true, msg: 'Zahlung erfolgreich verbucht!', sev: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ open: true, msg: 'Fehler beim Speichern der Zahlung.', sev: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={copiedBooking ? { cursor: 'copy' } : {}}>
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
            slotMinTime="09:00:00"
            slotMaxTime="19:00:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            nowIndicator={true}
            editable={true}
            droppable={true}
            resources={calendarResources}
            events={calendarEvents}
            eventDrop={handleEventDrop}
            eventClick={(info) => openDialogFor(info.event.id)}
            dateClick={handleDateClick} // NEU: dateClick Handler hinzugefügt
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
          <DialogTitle>{editMode ? 'Buchung bearbeiten' : 'Buchungsdetails'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {activeBooking && (
              editMode ? (
                <>
                  <TextField
                    label="Datum & Uhrzeit"
                    type="datetime-local"
                    value={edit.dateTime}
                    onChange={(e) => setEdit({ ...edit, dateTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField select label="Service" value={edit.serviceId} onChange={(e) => setEdit({ ...edit, serviceId: e.target.value })}>
                    {services.map(s => <MenuItem key={s._id} value={s._id}>{s.title}</MenuItem>)}
                  </TextField>
                  <TextField select label="Mitarbeiter" value={edit.staffId} onChange={(e) => setEdit({ ...edit, staffId: e.target.value })}>
                    {staffUsers
                      .filter(s => Array.isArray(s.skills) && s.skills.some((sk: any) => sk._id === edit.serviceId))
                      .map(s => <MenuItem key={s._id} value={s._id}>{s.name || `${s.firstName} ${s.lastName}`}</MenuItem>)}
                  </TextField>
                </>
              ) : (
                <>
                  <Typography variant="body1">
                    Kunde: <strong>
                      {`${activeBooking.user.firstName || ''} ${activeBooking.user.lastName || ''}`.trim() || activeBooking.user.email}
                    </strong>
                  </Typography>

                  <Button
                    size="small"
                    startIcon={<HistoryIcon />}
                    onClick={() => setShowHistory(!showHistory)}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {showHistory ? 'Verlauf ausblenden' : 'Verlauf anzeigen'}
                  </Button>

                  {showHistory && activeBooking.history && activeBooking.history.length > 0 && (
                      <List dense sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: 'grey.50', p: 1, borderRadius: 1, mt: 1 }}>
                        {activeBooking.history.slice().reverse().map((entry, index) => {
                          const executedByName = entry.executedBy ? `${entry.executedBy.firstName || ''} ${entry.executedBy.lastName || ''}`.trim() : 'System';
                          return (
                            <ListItem key={index} disableGutters>
                              <ListItemText
                                primary={`${translateAction(entry.action)}: ${entry.details || ''}`}
                                secondary={`Durch ${executedByName} am ${dayjs(entry.timestamp).format('DD.MM.YY HH:mm')}`}
                              />
                            </ListItem>
                          );
                        })}
                      </List>
                  )}
                </>
              )
            )}
          </DialogContent>
          <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between' }}>
            <Box>
              <Tooltip title="Termin löschen">
                <IconButton onClick={() => setDeleteConfirmOpen(true)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
              <Button onClick={closeDialog}>Schließen</Button>
              {!editMode && <Button onClick={() => setEditMode(true)}>Bearbeiten</Button>}
            </Box>
            <Box>
              {/* ANGEPASSTER KOPIEREN-BUTTON */}
              {!editMode && activeBooking && (
                <Button 
                  startIcon={<ContentCopyIcon />}
                  onClick={handleStartCopy} // Ruft die neue Funktion auf
                  sx={{ mr: 1 }}
                >
                  Kopieren
                </Button>
              )}

              {activeBooking?.status === 'paid' ? (
                <Button
                  variant="contained"
                  onClick={() => router.push(`/invoice/${activeBooking.invoiceNumber}`)}
                >
                  Rechnung ansehen
                </Button>
              ) : (
                !editMode && <Button
                  variant="contained"
                  color="success"
                  startIcon={<PaymentIcon />}
                  onClick={handleOpenPaymentDialog}
                >
                  Bezahlen
                </Button>
              )}
            </Box>
          </DialogActions>
        </Dialog>

        <Dialog
          open={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
        >
          <DialogTitle>Termin wirklich löschen?</DialogTitle>
          <DialogContent>
            <Typography>
              Möchten Sie diesen Termin wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Abbrechen</Button>
            <Button onClick={handleDeleteBooking} color="error" variant="contained">
              Ja, löschen
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog}>
          <DialogTitle>Barzahlung</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1, minWidth: '300px' }}>
              <Typography variant="h6">
                Zu zahlen: <strong>{servicePrice.toFixed(2)} €</strong>
              </Typography>
              <TextField
                label="Gegeben"
                type="number"
                value={amountGiven}
                onChange={(e) => setAmountGiven(e.target.value)}
                InputProps={{ endAdornment: '€' }}
                autoFocus
              />
              <Typography variant="h6" color={change > 0 ? 'primary' : 'text.secondary'}>
                Rückgeld: <strong>{change.toFixed(2)} €</strong>
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>Abbrechen</Button>
            <Button
              variant="contained"
              onClick={handlePaymentSubmit}
              disabled={parseFloat(amountGiven) < servicePrice || isNaN(parseFloat(amountGiven))}
            >
              Zahlung bestätigen
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))}>
          <Alert onClose={() => setToast(p => ({ ...p, open: false }))} severity={toast.sev} sx={{ width: '100%' }}>
            {toast.msg}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  )
}

export default dynamic(() => Promise.resolve(AdminPage), { ssr: false })