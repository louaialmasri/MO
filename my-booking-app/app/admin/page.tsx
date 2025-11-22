'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useCallback } from 'react'
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
  type Service, // Explizit importiert
} from '@/services/api'
import dynamic from 'next/dynamic'
import {
  Box, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Typography, Tooltip, IconButton, Container,
  Snackbar, Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Stack,
  FormControl, InputLabel, Select // Neu importiert für besseres Layout
} from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/de';
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'

import BookingCalendar, {
  localizer,
  messages,
} from '@/components/BookingCalendar' 
import { View, Views } from 'react-big-calendar'
import { setHours, setMinutes } from 'date-fns';

import PaymentIcon from '@mui/icons-material/Payment';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; // Icon für Erstellen

dayjs.locale('de');

// Typen
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

function AdminPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  
  // Daten-States
  const [bookings, setBookings] = useState<BookingFull[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [users, setUsers] = useState<User[]>([]) // Beinhaltet jetzt ALLE User (Staff + Kunden)

  // UI-States
  const [openEvent, setOpenEvent] = useState(false)
  const [activeBooking, setActiveBooking] = useState<BookingFull | null>(null)
  
  // Edit / Create States
  const [editMode, setEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // NEU: Unterscheidet zwischen Editieren und Erstellen
  
  // Formular-State (Erweitert um customerId)
  const [edit, setEdit] = useState<{ dateTime: string; serviceId: string; staffId: string; customerId: string }>({
    dateTime: '', serviceId: '', staffId: '', customerId: ''
  })

  // Dialog & Toast States
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [amountGiven, setAmountGiven] = useState('');
  const [toast, setToast] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({ open: false, msg: '', severity: 'success' })
  const [showHistory, setShowHistory] = useState(false);
  const [copiedBooking, setCopiedBooking] = useState<BookingFull | null>(null);

  // Kalender-Konfig States
  const [salonOpeningHours, setSalonOpeningHours] = useState<OpeningHours[] | null>(null);
  const [calendarMinTime, setCalendarMinTime] = useState<Date | undefined>(undefined);
  const [calendarMaxTime, setCalendarMaxTime] = useState<Date | undefined>(undefined);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>(Views.DAY); 

  // Callbacks
  const handleNavigate = useCallback((newDate: any) => setCurrentDate(newDate), []);
  const handleView = useCallback((newView: View) => setView(newView), []);

  // Filter für Dropdowns
  const staffUsers = useMemo(() => users.filter(u => u.role === 'staff'), [users]);
  const customerUsers = useMemo(() => users.filter(u => u.role === 'user'), [users]); // NEU: Nur Kunden

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
      // WICHTIG: Wir laden jetzt 'all' Users (oder 'user' und 'staff' separat), 
      // hier nehme ich an, fetchAllUsers ohne 2. Argument oder mit Logik holt alles,
      // oder wir rufen es zweimal auf. Im Code oben war 'staff' hardcoded.
      // Wir ändern das zu zwei Aufrufen um sicher zu gehen:
      const [bookingsData, staffData, userData, servicesData] = await Promise.all([
        getAllBookings(token),
        fetchAllUsers(token, 'staff'),
        fetchAllUsers(token, 'user'), // NEU: Kunden laden
        fetchServices(token),
      ]);
      setBookings(bookingsData);
      setUsers([...staffData, ...userData]); // Alle zusammenführen
      setServices(servicesData);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      setToast({ open: true, msg: 'Kerndaten konnten nicht geladen werden.', severity: 'error' });
    }
  }, [token]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || !token) {
      return;
    }
    fetchData();
  }, [user, token, router, fetchData]);

  // ... (Salon Öffnungszeiten useEffects bleiben unverändert - hier gekürzt)
  useEffect(() => { if (!token) return; getCurrentSalon(token).then(d => setSalonOpeningHours(d.salon?.openingHours || null)).catch(() => setSalonOpeningHours(null)); }, [token]);
  useEffect(() => { if (!salonOpeningHours) { setCalendarMinTime(setHours(setMinutes(currentDate, 0), 8)); setCalendarMaxTime(setHours(setMinutes(currentDate, 1), 20)); return; } const dayOfWeek = currentDate.getDay(); const hoursRule = salonOpeningHours.find(h => h.weekday === dayOfWeek); if (hoursRule?.isOpen && hoursRule.open && hoursRule.close) { const [oh, om] = hoursRule.open.split(':').map(Number); const [ch, cm] = hoursRule.close.split(':').map(Number); setCalendarMinTime(setHours(setMinutes(currentDate, om), oh)); setCalendarMaxTime(ch === 0 && cm === 0 ? setHours(setMinutes(currentDate, 59), 23) : new Date(setHours(setMinutes(currentDate, cm), ch).getTime() + 60000)); } else { setCalendarMinTime(setHours(setMinutes(currentDate, 0), 9)); setCalendarMaxTime(setHours(setMinutes(currentDate, 0), 17)); } }, [currentDate, salonOpeningHours]);

  // Dialog öffnen (für existierenden Termin)
  const openDialogFor = (bookingId: string) => {
    const b = bookings.find(x => x._id === bookingId);
    if (!b) return;
    setActiveBooking(b);
    setEdit({
      dateTime: dayjs(b.dateTime).format('YYYY-MM-DDTHH:mm'),
      serviceId: b.service?._id || b.serviceId || '',
      staffId: b.staff?._id || '',
      customerId: b.user._id // Kunde ist fix
    });
    setEditMode(false);
    setIsCreating(false); // WICHTIG
    setShowHistory(false);
    setOpenEvent(true);
  };

  const closeDialog = () => {
    setOpenEvent(false);
    setActiveBooking(null);
    setEditMode(false);
    setIsCreating(false);
    setShowHistory(false);
  };

  const calendarEvents = useMemo(() => bookings.filter(b => b && b.staff && b.staff._id && b.user).map(b => {
     const service = services.find(s => s._id === (b.service?._id || b.serviceId));
     const start = new Date(b.dateTime);
     return { id: b._id, title: service?.title, start, end: new Date(start.getTime() + (service?.duration || 30) * 60000), resourceId: b.staff?._id, booking: b };
  }), [bookings, services]);

  const calendarResources = useMemo(() => staffUsers.map(s => ({ id: s._id, title: `${s.firstName} ${s.lastName}`.trim() || s.name || s.email })), [staffUsers]);

  // Drag & Drop (unverändert)
  const onEventDrop = async ({ event, start, resourceId }: any) => { /* ... (Code wie vorher) ... */
    // Der Kürze halber hier nicht wiederholt, da unverändert, aber im echten File lassen!
    const originalBooking = bookings.find(b => b._id === event.id);
    if (!originalBooking) return;
    const serviceId = originalBooking.service?._id || originalBooking.serviceId;
    try {
      const response = await updateBooking(event.id, { dateTime: start.toISOString(), staffId: resourceId || originalBooking.staff?._id }, token!);
      if(response) { setBookings(prev => prev.map(b => b._id === event.id ? response : b)); setToast({open: true, msg: 'Termin verschoben', severity: 'success'}); }
    } catch(e) { fetchData(); }
  };

  // NEU: Slot-Auswahl Handler (Erstellen & Einfügen)
  const onSelectSlot = async (slotInfo: any) => {
    if (copiedBooking) {
      // --- EINFÜGEN LOGIK (bestehend) ---
      const { user: cbUser, service } = copiedBooking;
      const staffId = slotInfo.resourceId;
      const dateTime = slotInfo.start;
      if (!staffId || !service?._id) { setToast({ open: true, msg: 'Fehler beim Einfügen.', severity: 'error' }); return; }
      try {
        const response = await createBooking(service._id, dateTime.toISOString(), staffId, token!, cbUser._id);
        if (response.booking) { setBookings(prev => [...prev, response.booking]); setToast({ open: true, msg: 'Termin eingefügt!', severity: 'success' }); }
      } catch (e: any) { setToast({ open: true, msg: 'Einfügen fehlgeschlagen.', severity: 'error' }); } finally { setCopiedBooking(null); }
    } else {
      // --- NEU: ERSTELLEN LOGIK ---
      // Wir öffnen den Dialog im "Create"-Modus
      setEdit({
        dateTime: dayjs(slotInfo.start).format('YYYY-MM-DDTHH:mm'),
        staffId: slotInfo.resourceId || '', // Mitarbeiter aus der Spalte vorwählen
        serviceId: '',
        customerId: '' // Leer lassen, muss gewählt werden
      });
      setActiveBooking(null);
      setIsCreating(true);
      setEditMode(true);
      setOpenEvent(true);
    }
  };

  // NEU: Handler zum Speichern eines NEUEN Termins
 // 1. NEU: handleCreateSubmit angepasst, um den Namen sofort anzuzeigen
  const handleCreateSubmit = async () => {
      if (!token) return;
      if (!edit.serviceId || !edit.staffId || !edit.dateTime || !edit.customerId) {
        setToast({ open: true, msg: 'Bitte alle Felder ausfüllen.', severity: 'error' });
        return;
      }

      try {
        const response = await createBooking(edit.serviceId, new Date(edit.dateTime).toISOString(), edit.staffId, token, edit.customerId);
        if (response.booking) {
          // OPTIMISTIC UPDATE FIX:
          // Wir holen uns den vollständigen User aus unserer bereits geladenen Liste,
          // falls das Backend (aus irgendeinem Grund) nicht alle Felder liefert.
          const selectedUser = users.find(u => u._id === edit.customerId) || response.booking.user;
          
          const completeBooking = {
              ...response.booking,
              user: {
                  ...response.booking.user,
                  // Wir erzwingen die Nutzung der vorhandenen User-Daten für die Anzeige
                  firstName: selectedUser.firstName || response.booking.user.firstName,
                  lastName: selectedUser.lastName || response.booking.user.lastName,
                  email: selectedUser.email || response.booking.user.email,
              }
          };

          setBookings(prev => [...prev, completeBooking]);
          setToast({ open: true, msg: 'Termin erfolgreich erstellt!', severity: 'success' });
          closeDialog();
        }
      } catch (e: any) {
        setToast({ open: true, msg: e.response?.data?.message || 'Fehler beim Erstellen.', severity: 'error' });
      }
  };

  // Handler zum Speichern eines EDITIERTEN Termins (nur Service/Zeit/Staff, nicht User)
  const handleUpdateSubmit = async () => {
    if (!activeBooking || !token) return;
    try {
        // Beim Update ändern wir den User normalerweise nicht, daher ignorieren wir edit.customerId
        const payload = { 
            dateTime: new Date(edit.dateTime).toISOString(), 
            serviceId: edit.serviceId, 
            staffId: edit.staffId 
        };
        const response = await updateBooking(activeBooking._id, payload, token);
        setBookings(prev => prev.map(b => b._id === activeBooking._id ? response : b)); // Update im State
        setToast({ open: true, msg: 'Termin aktualisiert!', severity: 'success' });
        closeDialog();
    } catch (e: any) {
        setToast({ open: true, msg: 'Fehler beim Speichern.', severity: 'error' });
    }
  };


  // Dialog Actions (Delete, Pay, Copy) ... (unverändert, gekürzt)
  const handleStartCopy = () => { if(activeBooking) { setCopiedBooking(activeBooking); setToast({open:true, msg:'Kopiert - wähle freien Slot', severity:'info'}); closeDialog(); }};
  const handleDeleteBooking = async () => { if(!activeBooking || !token) return; await deleteBooking(activeBooking._id, token); setBookings(p => p.filter(b => b._id !== activeBooking._id)); closeDialog(); setDeleteConfirmOpen(false); };
  const handlePaymentSubmit = async () => { /* ... wie vorher ... */ 
     if(!activeBooking || !token) return;
     await markBookingAsPaid(activeBooking._id, 'cash', parseFloat(amountGiven), token);
     // Um ganz sicher zu gehen, laden wir neu oder updaten den status im local state
     setBookings(prev => prev.map(b => b._id === activeBooking._id ? { ...b, status: 'paid' } : b));
     handleClosePaymentDialog(); closeDialog();
  };
  const handleClosePaymentDialog = () => { setPaymentDialogOpen(false); setAmountGiven(''); };
  const handleOpenPaymentDialog = () => { setAmountGiven((activeBooking?.service?.price||0).toString()); setPaymentDialogOpen(true); };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={copiedBooking ? { cursor: 'copy' } : {}}>
        <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Kalender' }]} />
        
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, mt: 2 }}>
          <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
            Kalenderübersicht
          </Typography>
          {/* Optional: Button um manuell Dialog zu öffnen */}
          <Button 
            variant="contained" 
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => {
                setEdit({ dateTime: dayjs().format('YYYY-MM-DDTHH:mm'), serviceId: '', staffId: '', customerId: '' });
                setIsCreating(true); setEditMode(true); setOpenEvent(true);
            }}
          >
            Neuer Termin
          </Button>
        </Stack>
        
        {(!calendarMinTime || !calendarMaxTime) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 600 }}><CircularProgress /></Box>
        ) : (
          <BookingCalendar
            localizer={localizer}
            messages={messages}
            events={calendarEvents}
            resources={calendarResources}
            view={view}
            date={currentDate}
            onNavigate={handleNavigate}
            onView={handleView}
            onDoubleClickEvent={(event: any) => openDialogFor(event.id)}
            onEventDrop={onEventDrop}
            onSelectSlot={onSelectSlot} // Wichtig!
            min={calendarMinTime}
            max={calendarMaxTime}
            staffColors={staffColors}
          />
        )}
        
        <Dialog open={openEvent} onClose={closeDialog} fullWidth maxWidth="xs">
          <DialogTitle>
            {isCreating ? 'Neuen Termin erstellen' : (editMode ? 'Termin bearbeiten' : 'Termindetails')}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            
            {/* FALL 1: BEARBEITEN oder ERSTELLEN */}
            {(editMode || isCreating) && (
                <>
                  {/* Nur bei NEUEM Termin: Kundenauswahl */}
                  {isCreating && (
                      <FormControl fullWidth>
                        <InputLabel>Kunde auswählen</InputLabel>
                        <Select
                            value={edit.customerId}
                            label="Kunde auswählen"
                            onChange={(e) => setEdit({ ...edit, customerId: e.target.value })}
                        >
                            {customerUsers.map(u => (
                                <MenuItem key={u._id} value={u._id}>
                                    {u.firstName} {u.lastName} ({u.email})
                                </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                  )}

                  <TextField
                    label="Datum & Uhrzeit"
                    type="datetime-local"
                    value={edit.dateTime}
                    onChange={(e) => setEdit({ ...edit, dateTime: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel>Service</InputLabel>
                    <Select
                        value={edit.serviceId}
                        label="Service"
                        onChange={(e) => setEdit({ ...edit, serviceId: e.target.value })}
                    >
                        {services.map(s => <MenuItem key={s._id} value={s._id}>{s.title} ({s.duration} min, {s.price}€)</MenuItem>)}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Mitarbeiter</InputLabel>
                    <Select
                        value={edit.staffId}
                        label="Mitarbeiter"
                        onChange={(e) => setEdit({ ...edit, staffId: e.target.value })}
                    >
                        {staffUsers
                        // Filter: Zeige Mitarbeiter, die den gewählten Service können (oder alle, wenn kein Service gewählt)
                        .filter(s => !edit.serviceId || (Array.isArray(s.skills) && s.skills.some((sk: any) => (typeof sk === 'string' ? sk : sk._id) === edit.serviceId)))
                        .map(s => <MenuItem key={s._id} value={s._id}>{s.firstName} {s.lastName}</MenuItem>)}
                    </Select>
                  </FormControl>
                </>
            )}

            {/* FALL 2: NUR ANZEIGEN (Details) */}
            {!editMode && !isCreating && activeBooking && (
                <>
                  <Typography variant="h6" gutterBottom>
                    {activeBooking.service?.title || 'Service'}
                  </Typography>
                  <Typography variant="body1">
                    Kunde: <strong>{`${activeBooking.user.firstName || ''} ${activeBooking.user.lastName || ''}`.trim() || activeBooking.user.email}</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Mitarbeiter: {activeBooking.staff ? `${activeBooking.staff.firstName} ${activeBooking.staff.lastName}` : 'Nicht zugewiesen'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Zeit: {dayjs(activeBooking.dateTime).format('DD.MM.YYYY HH:mm')}
                  </Typography>
                  <Typography variant="body2" color={activeBooking.status === 'paid' ? 'success.main' : 'warning.main'} fontWeight="bold">
                    Status: {activeBooking.status === 'paid' ? 'Bezahlt' : 'Offen'}
                  </Typography>

                  <Button size="small" startIcon={<HistoryIcon />} onClick={() => setShowHistory(!showHistory)} sx={{ alignSelf: 'flex-start', mt: 1 }}>
                    {showHistory ? 'Verlauf ausblenden' : 'Verlauf anzeigen'}
                  </Button>
                  {showHistory && activeBooking.history && (
                    <List dense sx={{ maxHeight: 150, overflowY: 'auto', bgcolor: 'grey.50', p: 1, borderRadius: 1, mt: 1, width: '100%' }}>
                      {activeBooking.history.slice().reverse().map((entry, index) => (
                          <ListItem key={index} disableGutters>
                            <ListItemText 
                                primary={`${translateAction(entry.action)}: ${entry.details || ''}`} 
                                secondary={`${dayjs(entry.timestamp).format('DD.MM HH:mm')} - ${entry.executedBy?.firstName || 'System'}`} 
                            />
                          </ListItem>
                      ))}
                    </List>
                  )}
                </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
            {/* Linke Seite Actions */}
            <Box>
              {!isCreating && (
                  <Tooltip title="Löschen">
                    <IconButton onClick={() => setDeleteConfirmOpen(true)} color="error"><DeleteIcon /></IconButton>
                  </Tooltip>
              )}
              <Button onClick={closeDialog}>Abbrechen</Button>
            </Box>

            {/* Rechte Seite Actions */}
            <Box>
              {isCreating ? (
                  <Button onClick={handleCreateSubmit} variant="contained" color="primary">Erstellen</Button>
              ) : (
                  editMode ? (
                    <Button onClick={handleUpdateSubmit} variant="contained" color="primary">Speichern</Button>
                  ) : (
                    <>
                        <Button startIcon={<ContentCopyIcon />} onClick={handleStartCopy} sx={{ mr: 1 }}>Kopieren</Button>
                        {activeBooking?.status !== 'paid' ? (
                             <Button variant="contained" color="success" startIcon={<PaymentIcon />} onClick={handleOpenPaymentDialog} sx={{ mr: 1 }}>Bezahlen</Button>
                        ) : (
                             <Button variant="outlined" onClick={() => router.push(`/invoice/${activeBooking.invoiceNumber}`)} sx={{ mr: 1 }}>Rechnung</Button>
                        )}
                        <Button onClick={() => setEditMode(true)} variant="contained">Bearbeiten</Button>
                    </>
                  )
              )}
            </Box>
          </DialogActions>
        </Dialog>

        {/* Dialoge für Delete & Pay (unverändert beibehalten) */}
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Termin löschen?</DialogTitle>
          <DialogContent><Typography>Soll der Termin wirklich gelöscht werden?</Typography></DialogContent>
          <DialogActions><Button onClick={()=>setDeleteConfirmOpen(false)}>Nein</Button><Button onClick={handleDeleteBooking} color="error" variant="contained">Ja, löschen</Button></DialogActions>
        </Dialog>

        <Dialog open={paymentDialogOpen} onClose={handleClosePaymentDialog}>
          <DialogTitle>Zahlung erfassen</DialogTitle>
          <DialogContent>
             <Stack spacing={2} sx={{mt:1, minWidth: 300}}>
                <Typography>Betrag: <strong>{activeBooking?.service?.price} €</strong></Typography>
                <TextField label="Gegeben" type="number" value={amountGiven} onChange={e=>setAmountGiven(e.target.value)} autoFocus />
                <Typography>Rückgeld: {Math.max(0, parseFloat(amountGiven||'0') - (activeBooking?.service?.price||0)).toFixed(2)} €</Typography>
             </Stack>
          </DialogContent>
          <DialogActions><Button onClick={handleClosePaymentDialog}>Abbrechen</Button><Button onClick={handlePaymentSubmit} variant="contained" disabled={parseFloat(amountGiven) < (activeBooking?.service?.price||0)}>Bezahlen</Button></DialogActions>
        </Dialog>

        <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))}>
          <Alert severity={toast.severity} sx={{ width: '100%' }}>{toast.msg}</Alert>
        </Snackbar>
      </Container>
    </Box>
  )
}

export default dynamic(() => Promise.resolve(AdminPage), { ssr: false })