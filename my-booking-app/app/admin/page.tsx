'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useCallback } from 'react' // <--- Hooks importiert
import {
  fetchServices,
  getAllBookings,
  deleteBooking,
  fetchAllUsers,
  updateBooking,
  markBookingAsPaid,
  createBooking,
  getCurrentSalon,
  type OpeningHours,
} from '@/services/api'
import dynamic from 'next/dynamic'
import {
  Box, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Typography, Tooltip, IconButton, Container,
  Snackbar, Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Stack, // <--- Stack importiert
} from '@mui/material'
import type { Service } from '@/services/api'
import dayjs from 'dayjs'
import 'dayjs/locale/de';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'
// START: Importiere die neue geteilte Komponente
import BookingCalendar, {
  localizer, // Importiere den moment-localizer
  messages,  // Importiere die deutschen Texte
} from '@/components/SharedCalendar' 
import { View, Views } from 'react-big-calendar'
// ENDE: Import der neuen Komponente
import { setHours, setMinutes } from 'date-fns';

// Icons
import PaymentIcon from '@mui/icons-material/Payment';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// --- TYP-DEFINITIONEN (unverändert) ---
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

type CalendarResource = {
  id: string;
  title: string;
}

// --- HELPER-FUNKTIONEN (unverändert) ---
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [amountGiven, setAmountGiven] = useState('');
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' | 'info' }>({ open: false, msg: '', sev: 'success' })
  const [showHistory, setShowHistory] = useState(false);
  const [copiedBooking, setCopiedBooking] = useState<BookingFull | null>(null);

  // State für Salon-Daten und Kalendergrenzen ---
  const [salonOpeningHours, setSalonOpeningHours] = useState<OpeningHours[] | null>(null);
  const [calendarMinTime, setCalendarMinTime] = useState<Date | undefined>(undefined);
  const [calendarMaxTime, setCalendarMaxTime] = useState<Date | undefined>(undefined);

  // START: State für Kalender-Steuerung (NEU)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>(Views.DAY); // <--- DEFAULT AUF TAG GEÄNDERT

  // Callbacks für die Toolbar
  const handleNavigate = useCallback((newDate: Date) => setCurrentDate(newDate), [setCurrentDate]);
  const handleView = useCallback((newView: View) => setView(newView), [setView]);
  // ENDE: State für Kalender-Steuerung

  const staffUsers = useMemo(() => users.filter(u => u.role === 'staff'), [users]);

  // Farb-Mapping für Mitarbeiter (unverändert)
  const staffColors = useMemo(() => {
    const palette = ['#A1887F', '#FFAB40', '#4DB6AC', '#BA68C8', '#7986CB', '#4FC3F7', '#F06292', '#AED581'];
    const colorMap = new Map<string, string>();
    staffUsers.forEach((staff, index) => {
      colorMap.set(staff._id, palette[index % palette.length]);
    });
    return colorMap;
  }, [staffUsers]);

  const fetchData = useCallback(async () => {
    if (!token) return;
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
      setToast({ open: true, msg: 'Kerndaten konnten nicht geladen werden.', sev: 'error' });
    }
  }, [token]);

  // Lade Kern-Daten (Termine, Mitarbeiter, Services)
  useEffect(() => {
    if (!user || user.role !== 'admin' || !token) {
      return;
    }
    fetchData();
  }, [user, token, router, fetchData]);

  // Lade Salon-Öffnungszeiten (unverändert)
  useEffect(() => {
    if (!token) return;

    const fetchSalonData = async () => {
      try {
        const salonData = await getCurrentSalon(token);
        if (salonData.salon?.openingHours) {
          setSalonOpeningHours(salonData.salon.openingHours);
        } else {
          setSalonOpeningHours(null); 
        }
      } catch (error) {
        console.error("Fehler beim Laden der Salon-Öffnungszeiten:", error);
        setSalonOpeningHours(null); 
        setToast({ open: true, msg: 'Öffnungszeiten konnten nicht geladen werden.', sev: 'error' });
      }
    };
    fetchSalonData();
  }, [token]); 

  // Setze Kalender min/max (unverändert)
  useEffect(() => {
    if (!salonOpeningHours) {
       const defaultMin = setHours(setMinutes(currentDate, 0), 8);
       const defaultMax = setHours(setMinutes(currentDate, 1), 20); 
       setCalendarMinTime(defaultMin);
       setCalendarMaxTime(defaultMax);
       return;
    }
    const dayOfWeek = currentDate.getDay(); 
    const hoursRule = salonOpeningHours.find(h => h.weekday === dayOfWeek);
    if (hoursRule && hoursRule.isOpen && hoursRule.open && hoursRule.close) {
      try {
        const [openH, openM] = hoursRule.open.split(':').map(Number);
        const [closeH, closeM] = hoursRule.close.split(':').map(Number);
        const minTime = setHours(setMinutes(currentDate, openM), openH);
        let maxTime = setHours(setMinutes(currentDate, closeM), closeH);
        if (!(closeH === 0 && closeM === 0)) {
           maxTime = new Date(maxTime.getTime() + 60000); 
        } else {
           maxTime = setHours(setMinutes(currentDate, 59), 23);
        }
        setCalendarMinTime(minTime);
        setCalendarMaxTime(maxTime);
      } catch (e) {
        console.error("Fehler beim Parsen der Öffnungszeiten:", e);
        const defaultMin = setHours(setMinutes(currentDate, 0), 8);
        const defaultMax = setHours(setMinutes(currentDate, 0), 20);
        setCalendarMinTime(defaultMin);
        setCalendarMaxTime(defaultMax);
      }
    } else {
      const defaultMin = setHours(setMinutes(currentDate, 0), 9);
      const defaultMax = setHours(setMinutes(currentDate, 0), 17);
      setCalendarMinTime(defaultMin);
      setCalendarMaxTime(defaultMax);
    }
  }, [currentDate, salonOpeningHours]); 

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

  // Kalender-Events (unverändert)
  const calendarEvents = useMemo(() => {
    return bookings
      .filter(b => b && b.staff && b.staff._id && b.user)
      .map((b) => {
        const service = services.find(s => s._id === (b.service?._id || b.serviceId));
        const start = new Date(b.dateTime);
        const duration = service?.duration ?? 30;
        const end = new Date(start.getTime() + duration * 60000);
        const staffId = b.staff?._id;

        return {
          id: b._id,
          title: service?.title ?? 'Service',
          start,
          end,
          resourceId: staffId,
          booking: b,
        };
      });
  }, [bookings, services]);

  // Kalender-Ressourcen (Mitarbeiter) (unverändert)
  const calendarResources: CalendarResource[] = useMemo(() => {
    return staffUsers.map(s => ({
      id: s._id,
      title: `${s.firstName} ${s.lastName}`.trim() || s.name || s.email,
    }));
  }, [staffUsers]);

  // Drag & Drop Handler (unverändert)
  const onEventDrop = async ({ event, start, end, resourceId }: any) => {
    const originalBooking = bookings.find(b => b._id === event.id);
    if (!originalBooking) {
      setToast({ open: true, msg: 'Original-Termindaten nicht gefunden.', sev: 'error' });
      return;
    }

    const newStaffId = resourceId || originalBooking.staff?._id;
    if (newStaffId && newStaffId !== originalBooking.staff?._id) {
      const serviceId = originalBooking.service?._id || originalBooking.serviceId;
      const newStaffMember = staffUsers.find(staff => staff._id === newStaffId);
      const hasSkill = newStaffMember?.skills?.some(skill => (typeof skill === 'string' ? skill : skill._id) === serviceId);

      if (!hasSkill) {
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
        dateTime: start.toISOString(),
        staffId: newStaffId || originalBooking.staff?._id,
      };
      const response = await updateBooking(event.id, payload, token!);

      if (response) {
        // Statt die ganze Liste neu zu laden, ersetzen wir nur den einen Termin
        setBookings(prev => prev.map(b => b._id === event.id ? response : b));
        setToast({ open: true, msg: 'Termin verschoben!', sev: 'success' });
      } else {
        throw new Error("Ungültige Antwort vom Server");
      }
    } catch (e: any) {
      console.error(e);
      setToast({ open: true, msg: `Verschieben fehlgeschlagen: ${e.response?.data?.message || e.message}`, sev: 'error' });
      fetchData(); // Nur bei Fehler neu laden, um revert darzustellen
    }
  }
  
  // Slot-Auswahl-Handler (Kopieren & Einfügen) (unverändert)
  const onSelectSlot = async (slotInfo: any) => {
    if (copiedBooking) {
      const { user: cbUser, service } = copiedBooking;
      const staffId = slotInfo.resourceId;
      const dateTime = slotInfo.start;

      if (!staffId || !service?._id) {
        setToast({ open: true, msg: 'Mitarbeiter oder Service fehlen.', sev: 'error' });
        return;
      }

      try {
        const response = await createBooking(service._id, dateTime.toISOString(), staffId, token!, cbUser._id);
        if (response.booking) {
          setBookings(prev => [...prev, response.booking]); // Termin zur Liste hinzufügen
          setToast({ open: true, msg: 'Termin erfolgreich eingefügt!', sev: 'success' });
        } else {
          throw new Error(response.message || 'Fehler beim Erstellen des Termins');
        }
      } catch (e: any) {
        setToast({ open: true, msg: e.response?.data?.message || 'Einfügen fehlgeschlagen.', sev: 'error' });
      } finally {
        setCopiedBooking(null);
      }
    }
  };

  // Restliche Handler (Kopieren, Löschen, Bezahlen) (unverändert)
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
      const updatedBookings = await getAllBookings(token); // Neu laden
      setBookings(updatedBookings);
      handleClosePaymentDialog();
      closeDialog();
      setToast({ open: true, msg: 'Zahlung erfolgreich verbucht!', sev: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ open: true, msg: 'Fehler beim Speichern der Zahlung.', sev: 'error' });
    }
  };

  // --- RENDER-TEIL ---

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={copiedBooking ? { cursor: 'copy' } : {}}>
        <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Kalender' }]} />
        
        {/* Die Toolbar wird jetzt von der BookingCalendar-Komponente gerendert */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, mt: 2 }}>
          <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
            Kalenderübersicht (Admin)
          </Typography>
        </Stack>
        
        {/* START: Geteilte Kalender-Komponente wird hier gerendert */}
        {!calendarMinTime || !calendarMaxTime ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 600 }}>
            <CircularProgress />
          </Box>
        ) : (
          <BookingCalendar
            events={calendarEvents}
            resources={calendarResources}
            view={view}
            date={currentDate}
            onNavigate={handleNavigate}
            onView={handleView}
            onSelectEvent={(event: any) => openDialogFor(event.id)}
            onEventDrop={onEventDrop}
            onSelectSlot={onSelectSlot}
            min={calendarMinTime}
            max={calendarMaxTime}
            staffColors={staffColors}
          />
        )}
        {/* ENDE: Geteilte Kalender-Komponente */}
        
        {/* --- DIALOGE (unverändert) --- */}
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
              {!editMode && activeBooking && (
                <Button
                  startIcon={<ContentCopyIcon />}
                  onClick={handleStartCopy}
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
                Zu zahlen: <strong>{(activeBooking?.service?.price ?? 0).toFixed(2)} €</strong>
              </Typography>
              <TextField
                label="Gegeben"
                type="number"
                value={amountGiven}
                onChange={(e) => setAmountGiven(e.target.value)}
                InputProps={{ endAdornment: '€' }}
                autoFocus
              />
              <Typography variant="h6" color={parseFloat(amountGiven) - (activeBooking?.service?.price ?? 0) >= 0 ? 'primary' : 'text.secondary'}>
                Rückgeld: <strong>{(Math.max(0, parseFloat(amountGiven) - (activeBooking?.service?.price ?? 0))).toFixed(2)} €</strong>
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>Abbrechen</Button>
            <Button
              variant="contained"
              onClick={handlePaymentSubmit}
              disabled={parseFloat(amountGiven) < (activeBooking?.service?.price ?? Infinity) || isNaN(parseFloat(amountGiven))}
            >
              Zahlung bestätigen
            </Button>
          </DialogActions>
        </Dialog>
        {/* --- ENDE DIALOGE --- */}


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

