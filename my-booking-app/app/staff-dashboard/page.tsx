'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  getStaffBookings,
  deleteBooking,
  fetchAllUsers, // Neu: wird jetzt genutzt um Kunden zu laden
  updateBooking,
  markBookingAsPaid,
  createBooking,
  getCurrentSalon,
  fetchServices,
  type OpeningHours,
  type Service,
  type User,
  type StaffBooking, 
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
  FormControl, InputLabel, Select
} from '@mui/material'
import dayjs from 'dayjs'
import 'dayjs/locale/de';
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

dayjs.locale('de');

type StaffLite = { _id: string; email: string; name?: string; firstName?: string; lastName?: string; }

type BookingFull = {
  _id:string
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
type CalendarResource = { id: string; title: string; }
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

function StaffDashboardPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  
  const [bookings, setBookings] = useState<BookingFull[]>([]) 
  const [services, setServices] = useState<Service[]>([])
  const [customers, setCustomers] = useState<User[]>([]) // NEU: Liste der Kunden

  const [openEvent, setOpenEvent] = useState(false)
  const [activeBooking, setActiveBooking] = useState<BookingFull | null>(null)
  
  const [editMode, setEditMode] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // NEU

  const [edit, setEdit] = useState<{ dateTime: string; serviceId: string; staffId: string; customerId: string }>({
    dateTime: '', serviceId: '', staffId: '', customerId: ''
  })
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [amountGiven, setAmountGiven] = useState('');
  const [toast, setToast] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' | 'info' }>({ open: false, msg: '', severity: 'success' })
  const [showHistory, setShowHistory] = useState(false);
  const [copiedBooking, setCopiedBooking] = useState<BookingFull | null>(null);
  
  const [salonOpeningHours, setSalonOpeningHours] = useState<OpeningHours[] | null>(null);
  const [calendarMinTime, setCalendarMinTime] = useState<Date | undefined>(undefined);
  const [calendarMaxTime, setCalendarMaxTime] = useState<Date | undefined>(undefined);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [view, setView] = useState<View>(Views.DAY); 

  const handleNavigate = useCallback((newDate: any) => setCurrentDate(newDate), [setCurrentDate]);
  const handleView = useCallback((newView: View) => setView(newView), [setView]);

  const calendarResources: CalendarResource[] = useMemo(() => {
    if (!user) return [];
    return [{
      id: user._id,
      title: `${user.firstName} ${user.lastName}`.trim() || user.email,
    }];
  }, [user]);

  const staffColors = useMemo(() => {
    if (!user) return new Map<string, string>();
    const colorMap = new Map<string, string>();
    colorMap.set(user._id, '#A1887F');
    return colorMap;
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      // NEU: fetchAllUsers('user') laden
      const [bookingsData, servicesData, customersData] = await Promise.all([
        getStaffBookings(token),
        fetchServices(token),
        fetchAllUsers(token, 'user'), // Kunden laden
      ]);
      setBookings(bookingsData as BookingFull[]);
      setServices(servicesData);
      setCustomers(customersData);
    } catch (error) {
      console.error("Failed to fetch staff data:", error);
      setToast({ open: true, msg: 'Kerndaten konnten nicht geladen werden.', severity: 'error' });
    }
  }, [token]);

  useEffect(() => {
    if (!user || !token) return;
    if (user.role !== 'staff' && user.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchData();
  }, [user, token, router, fetchData]);

  useEffect(() => { if (!token) return; getCurrentSalon(token).then(d => setSalonOpeningHours(d.salon?.openingHours || null)).catch(()=>setSalonOpeningHours(null)); }, [token]);
  useEffect(() => { if (!salonOpeningHours) { setCalendarMinTime(setHours(setMinutes(currentDate, 0), 8)); setCalendarMaxTime(setHours(setMinutes(currentDate, 1), 20)); return; } const dayOfWeek = currentDate.getDay(); const hoursRule = salonOpeningHours.find(h => h.weekday === dayOfWeek); if (hoursRule?.isOpen && hoursRule.open && hoursRule.close) { const [oh, om] = hoursRule.open.split(':').map(Number); const [ch, cm] = hoursRule.close.split(':').map(Number); setCalendarMinTime(setHours(setMinutes(currentDate, om), oh)); setCalendarMaxTime(ch === 0 && cm === 0 ? setHours(setMinutes(currentDate, 59), 23) : new Date(setHours(setMinutes(currentDate, cm), ch).getTime() + 60000)); } else { setCalendarMinTime(setHours(setMinutes(currentDate, 0), 9)); setCalendarMaxTime(setHours(setMinutes(currentDate, 0), 17)); } }, [currentDate, salonOpeningHours]);

  const openDialogFor = (bookingId: string) => {
    const b = bookings.find(x => x._id === bookingId);
    if (!b) return;
    setActiveBooking(b);
    setEdit({
      dateTime: dayjs(b.dateTime).format('YYYY-MM-DDTHH:mm'),
      serviceId: b.service?._id || b.serviceId || '',
      staffId: b.staff?._id || '',
      customerId: b.user._id
    });
    setEditMode(false);
    setIsCreating(false);
    setShowHistory(false);
    setOpenEvent(true);
  };
  const closeDialog = () => { setOpenEvent(false); setActiveBooking(null); setEditMode(false); setIsCreating(false); setShowHistory(false); };
  
  const calendarEvents = useMemo(() => bookings.filter(b => b && b.staff && b.staff._id && b.user).map(b => {
    const service = services.find(s => s._id === (b.service?._id || b.serviceId));
    const start = new Date(b.dateTime);
    return { id: b._id, title: service?.title, start, end: new Date(start.getTime() + (service?.duration || 30) * 60000), resourceId: b.staff?._id, booking: b };
  }), [bookings, services]);

  const onEventDrop = async ({ event, start, resourceId }: any) => { /* Unverändert */
    if (!user) return;
    const originalBooking = bookings.find(b => b._id === event.id);
    if (!originalBooking) return;
    const serviceId = originalBooking.service?._id || originalBooking.serviceId;
    const hasSkill = user.skills?.some(skill => (typeof skill === 'string' ? skill : skill._id) === serviceId);
    if (!hasSkill) { setToast({ open: true, msg: `Service nicht in deinen Skills.`, severity: 'error' }); return; }
    try {
      const response = await updateBooking(event.id, { dateTime: start.toISOString(), staffId: resourceId }, token!);
      if (response) { setBookings(prev => prev.map(b => b._id === event.id ? response : b)); setToast({ open: true, msg: 'Termin verschoben!', severity: 'success' }); }
    } catch (e: any) { setToast({ open: true, msg: 'Fehler beim Verschieben', severity: 'error' }); fetchData(); }
  }

  // NEU: OnSelectSlot
  const onSelectSlot = async (slotInfo: any) => {
    if (copiedBooking) {
      // Copy Logic
      const { user: cbUser, service } = copiedBooking;
      if (!service?._id) return;
      try {
        const response = await createBooking(service._id, slotInfo.start.toISOString(), slotInfo.resourceId, token!, cbUser._id);
        if (response.booking) { setBookings(prev => [...prev, response.booking]); setToast({ open: true, msg: 'Termin eingefügt!', severity: 'success' }); }
      } catch (e: any) { setToast({ open: true, msg: 'Fehler beim Einfügen', severity: 'error' }); } finally { setCopiedBooking(null); }
    } else {
      // CREATE Logic
      setEdit({
        dateTime: dayjs(slotInfo.start).format('YYYY-MM-DDTHH:mm'),
        staffId: user?._id || '', // Staff legt für sich selbst an
        serviceId: '',
        customerId: ''
      });
      setIsCreating(true);
      setEditMode(true);
      setOpenEvent(true);
    }
  };

  // NEU: Handle Create
  const handleCreateSubmit = async () => {
    if (!token || !user) return;
    if (!edit.serviceId || !edit.dateTime || !edit.customerId) {
        setToast({ open: true, msg: 'Bitte Felder ausfüllen', severity: 'error' });
        return;
    }
    try {
        const response = await createBooking(edit.serviceId, new Date(edit.dateTime).toISOString(), user._id, token, edit.customerId);
        if(response.booking) {
            // --- OPTIMISTIC UPDATE START ---
            // Den vollen User aus der geladenen Kunden-Liste holen
            const selectedUser = customers.find(c => c._id === edit.customerId) || response.booking.user;

            // Das Booking-Objekt manuell vervollständigen für die sofortige Anzeige
            const completeBooking = {
                ...response.booking,
                user: {
                    ...response.booking.user,
                    firstName: selectedUser.firstName || response.booking.user.firstName,
                    lastName: selectedUser.lastName || response.booking.user.lastName,
                    email: selectedUser.email || response.booking.user.email,
                }
            } as BookingFull;
            // --- OPTIMISTIC UPDATE ENDE ---

            setBookings(prev => [...prev, completeBooking]);
            setToast({ open: true, msg: 'Termin erstellt!', severity: 'success' });
            closeDialog();
        }
    } catch (e: any) { setToast({ open: true, msg: e.response?.data?.message || 'Fehler', severity: 'error' }); }
  };

  const handleUpdateSubmit = async () => {
      if(!activeBooking || !token) return;
      try {
          const response = await updateBooking(activeBooking._id, { dateTime: new Date(edit.dateTime).toISOString(), serviceId: edit.serviceId }, token);
          setBookings(prev => prev.map(b => b._id === activeBooking._id ? response as BookingFull : b));
          setToast({ open: true, msg: 'Aktualisiert!', severity: 'success' });
          closeDialog();
      } catch(e) { setToast({ open: true, msg: 'Fehler beim Update', severity: 'error' }); }
  };

  const handleStartCopy = () => { if (!activeBooking) return; setCopiedBooking(activeBooking); setToast({ open: true, msg: 'Kopiert.', severity: 'info' }); closeDialog(); };
  const handleDeleteBooking = async () => { if (!activeBooking || !token) return; try { await deleteBooking(activeBooking._id, token); setBookings(prev => prev.filter(b => b._id !== activeBooking._id)); setToast({ open: true, msg: 'Gelöscht', severity: 'success' }); closeDialog(); setDeleteConfirmOpen(false); } catch (err) { setToast({ open: true, msg: 'Fehler', severity: 'error' }); } };
  const handlePaymentSubmit = async () => {
    if (!activeBooking || !token) return;
    try {
      await markBookingAsPaid(activeBooking._id, 'cash', parseFloat(amountGiven), token);
      setBookings(prev => prev.map(b => b._id === activeBooking._id ? { ...b, status: 'paid' } as BookingFull : b));
      setPaymentDialogOpen(false); closeDialog(); setToast({ open: true, msg: 'Bezahlt!', severity: 'success' });
    } catch (err) { setToast({ open: true, msg: 'Fehler', severity: 'error' }); }
  };
  
  if (!user) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: 'background.default', minHeight: '100vh' }}>
      <Container maxWidth="xl" sx={copiedBooking ? { cursor: 'copy' } : {}}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3, mt: 2 }}>
          <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
            Mein Kalender
          </Typography>
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
            onSelectSlot={onSelectSlot}
            min={calendarMinTime}
            max={calendarMaxTime}
            staffColors={staffColors}
          />
        )}

        <Dialog open={openEvent} onClose={closeDialog} fullWidth maxWidth="xs">
          <DialogTitle>{isCreating ? 'Neuen Termin erstellen' : (editMode ? 'Bearbeiten' : 'Details')}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            {(editMode || isCreating) && (
                <>
                  {isCreating && (
                    <FormControl fullWidth>
                        <InputLabel>Kunde</InputLabel>
                        <Select value={edit.customerId} label="Kunde" onChange={e => setEdit({...edit, customerId: e.target.value})}>
                            {customers.map(c => <MenuItem key={c._id} value={c._id}>{c.firstName} {c.lastName}</MenuItem>)}
                        </Select>
                    </FormControl>
                  )}
                  <TextField label="Datum & Uhrzeit" type="datetime-local" value={edit.dateTime} onChange={(e) => setEdit({ ...edit, dateTime: e.target.value })} InputLabelProps={{ shrink: true }} />
                  <FormControl fullWidth>
                    <InputLabel>Service</InputLabel>
                    <Select value={edit.serviceId} label="Service" onChange={(e) => setEdit({ ...edit, serviceId: e.target.value })}>
                        {services.filter(s => user.skills?.some((sk:any) => (typeof sk === 'string' ? sk : sk._id) === s._id)).map(s => <MenuItem key={s._id} value={s._id}>{s.title}</MenuItem>)}
                    </Select>
                  </FormControl>
                </>
            )}
            {!editMode && !isCreating && activeBooking && (
                <>
                  <Typography variant="h6">{activeBooking.service?.title}</Typography>
                  <Typography>Kunde: <strong>{activeBooking.user.firstName} {activeBooking.user.lastName}</strong></Typography>
                  <Typography color="text.secondary">{dayjs(activeBooking.dateTime).format('DD.MM HH:mm')}</Typography>
                  <Button size="small" startIcon={<HistoryIcon />} onClick={() => setShowHistory(!showHistory)}>{showHistory ? 'Verlauf' : 'Verlauf'}</Button>
                  {showHistory && activeBooking.history && <List dense sx={{ maxHeight: 100, overflowY: 'auto', bgcolor: 'grey.100' }}>{activeBooking.history.map((h,i) => <ListItem key={i}><ListItemText primary={translateAction(h.action)} secondary={dayjs(h.timestamp).format('DD.MM HH:mm')} /></ListItem>)}</List>}
                </>
            )}
          </DialogContent>
          <DialogActions sx={{ justifyContent: 'space-between' }}>
             <Box>{!isCreating && <Button color="error" onClick={()=>setDeleteConfirmOpen(true)}><DeleteIcon/></Button>} <Button onClick={closeDialog}>Abbruch</Button></Box>
             <Box>
                {isCreating ? <Button variant="contained" onClick={handleCreateSubmit}>Erstellen</Button> : (editMode ? <Button variant="contained" onClick={handleUpdateSubmit}>Speichern</Button> : <><Button startIcon={<ContentCopyIcon/>} onClick={handleStartCopy}>Copy</Button><Button onClick={()=>setEditMode(true)}>Edit</Button></>)}
             </Box>
          </DialogActions>
        </Dialog>
        
        {/* Delete & Payment Dialoge (identisch zu oben, gekürzt) */}
        <Dialog open={deleteConfirmOpen} onClose={()=>setDeleteConfirmOpen(false)}><DialogTitle>Löschen?</DialogTitle><DialogActions><Button onClick={()=>setDeleteConfirmOpen(false)}>Nein</Button><Button color="error" onClick={handleDeleteBooking}>Ja</Button></DialogActions></Dialog>
        <Dialog open={paymentDialogOpen} onClose={()=>setPaymentDialogOpen(false)}><DialogTitle>Zahlen</DialogTitle><DialogContent><TextField value={amountGiven} onChange={e=>setAmountGiven(e.target.value)} label="Gegeben" type="number" /></DialogContent><DialogActions><Button onClick={()=>setPaymentDialogOpen(false)}>Abbruch</Button><Button onClick={handlePaymentSubmit}>OK</Button></DialogActions></Dialog>
        
        <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))}><Alert severity={toast.severity} sx={{ width: '100%' }}>{toast.msg}</Alert></Snackbar>
      </Container>
    </Box>
  )
}

export default dynamic(() => Promise.resolve(StaffDashboardPage), { ssr: false })