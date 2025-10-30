'use client';

// START: Imports angepasst
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getStaffBookings, fetchServices, updateBooking, deleteBooking, Service, User, StaffBooking } from '@/services/api';
import {
    Box, Typography, CircularProgress, Dialog, DialogTitle, DialogContent,
    DialogActions, Button, TextField, Tooltip, MenuItem, List, ListItem,
    ListItemText, Select, Container, Paper, Alert, Snackbar, FormControl, InputLabel
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { setHours, setMinutes } from 'date-fns'; // Für min/max Zeiten

// START: Importiere die neue geteilte Komponente und ihre Utils
import BookingCalendar, {
  localizer,
  messages,
} from '@/components/BookingCalendar' 
import { View, Views } from 'react-big-calendar'
// ENDE: Import der neuen Komponente

// WICHTIG: Importiere das geteilte CSS (wird von BookingCalendar gemacht, aber sicher ist sicher)
import '../admin/calendar-custom.css';
// ENDE: Imports angepasst


// Unser benutzerdefinierter Event-Typ für Typsicherheit
interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    original: StaffBooking; // Behalten wir für den Dialog
    booking: StaffBooking;  // Hinzugefügt für EventContent
    resourceId: string;     // Hinzugefügt für Ressourcen-Ansicht
}

export default function StaffDashboardPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [bookings, setBookings] = useState<StaffBooking[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    // const [users, setUsers] = useState<User[]>([]); // Nicht mehr benötigt
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editedData, setEditedData] = useState<{ serviceId: string; dateTime: string }>({ serviceId: '', dateTime: '' });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    // START: State für Kalender-Steuerung (NEU)
    const [date, setDate] = useState(new Date());
    // --- WUNSCH: Standard auf Tagesansicht ---
    const [view, setView] = useState<View>(Views.DAY); 

    const handleNavigate = useCallback((newDate: Date) => setDate(newDate), [setDate]);
    const handleView = useCallback((newView: View) => setView(newView), [setView]);
    // ENDE: State für Kalender-Steuerung

    useEffect(() => {
        // Leitet um, wenn nicht eingeloggt oder KEIN staff/admin
        if (!authLoading && (!user || (user.role !== 'staff' && user.role !== 'admin'))) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const fetchData = useCallback(async () => {
        if (token) {
            try {
                setLoading(true);
                const [staffBookings, allServices] = await Promise.all([
                    getStaffBookings(token),
                    fetchServices(token), // Lädt Services für den Salon des Staffs
                ]);
                setBookings(staffBookings);
                setServices(allServices);
            } catch (err) {
                setError('Daten konnten nicht geladen werden.');
            } finally {
                setLoading(false);
            }
        }
    }, [token]); 

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // Kalender-Events (ANGEPASST für Ressourcen)
    const calendarEvents: CalendarEvent[] = useMemo(() => {
      if (!user) return []; // Sicherstellen, dass user existiert
      return bookings.map(booking => ({
        id: booking._id,
        title: `${booking.service?.title || 'Service'} - ${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim(),
        start: new Date(booking.dateTime),
        end: new Date(new Date(booking.dateTime).getTime() + (booking.service?.duration || 30) * 60000),
        original: booking,
        // --- NEU: Für EventContent und Ressourcen ---
        booking: booking,
        resourceId: user._id, // ID des eingeloggten Staffs
    }))
  }, [bookings, user]);

    // START: Kalender-Ressource für den Staff-Mitarbeiter (NEU)
    const staffResource = useMemo(() => {
        if (!user) return [];
        return [{
            id: user._id,
            title: `${user.firstName} ${user.lastName}`.trim() || user.email
        }];
    }, [user]);

    // Farb-Mapping (optional, aber gut für Konsistenz)
    const staffColors = useMemo(() => {
        if (!user) return new Map<string, string>();
        return new Map<string, string>([[user._id, '#A1887F']]); // Eine Farbe für den Staff
    }, [user]);
    // ENDE: Kalender-Ressource

    // Drag & Drop Handler (NEU)
    const handleEventDrop = async ({ event, start, end }: any) => {
        if (!token || !user) return;
        
        const originalBooking = bookings.find(b => b._id === event.id);
        if (!originalBooking) return;

        const serviceId = originalBooking.service?._id;
        // KORREKTUR: Prüfe skills auf User-Objekt, das `skills` als Array von Objekten hat
        const hasSkill = user?.skills?.some(skill => (typeof skill === 'string' ? skill : skill._id) === serviceId);

        if (!hasSkill) {
            setSnackbar({ open: true, message: 'Du scheinst diesen Service nicht (mehr) anzubieten.', sev: 'error' });
            return; // Verhindere das Verschieben
        }

        try {
            await updateBooking(event.id, { dateTime: start.toISOString() }, token);
            setSnackbar({ open: true, message: 'Termin verschoben!', severity: 'success' });
            fetchData(); // Daten neu laden
        } catch (err) {
            setSnackbar({ open: true, message: 'Verschieben fehlgeschlagen.', severity: 'error' });
            fetchData(); // Bei Fehler auch neu laden, um den Kalender zurückzusetzen
        }
    };
    // ENDE: Drag & Drop Handler


    const handleEventClick = (event: CalendarEvent) => {
        setSelectedBooking(event.original);
        setEditedData({
            serviceId: event.original.service._id,
            dateTime: dayjs(event.original.dateTime).format('YYYY-MM-DDTHH:mm'),
        });
        setEditMode(false);
    };

    const handleUpdateBooking = async () => {
        if (selectedBooking && token) {
            try {
                await updateBooking(selectedBooking._id, {
                    serviceId: editedData.serviceId,
                    dateTime: new Date(editedData.dateTime).toISOString(),
                }, token);
                setSnackbar({ open: true, message: 'Termin erfolgreich aktualisiert!', severity: 'success' });
                setSelectedBooking(null);
                fetchData();
            } catch (err) {
                setSnackbar({ open: true, message: 'Fehler beim Aktualisieren des Termins.', severity: 'error' });
            }
        }
    };

    const handleCancelBooking = async () => {
        if (selectedBooking && token) {
            if (!isCancellable(selectedBooking.dateTime)) {
                setSnackbar({ open: true, message: 'Stornierung nicht mehr möglich (Frist abgelaufen).', severity: 'error' });
                return;
            }

            try {
                await deleteBooking(selectedBooking._id, token);
                setSnackbar({ open: true, message: 'Termin erfolgreich storniert!', severity: 'success' });
                setSelectedBooking(null);
                fetchData();
            } catch (err) {
                setSnackbar({ open: true, message: 'Stornierung fehlgeschlagen.', severity: 'error' });
            }
        }
    };

    const isCancellable = (dateTime: string) => dayjs(dateTime).isAfter(dayjs().add(24, 'hours'));

    // Min/Max Zeiten für den Kalender (Standard, da Staff-Seite keine Salon-Zeiten lädt)
    const { minTime, maxTime } = useMemo(() => {
        const min = setHours(setMinutes(date, 0), 8); // 08:00
        const max = setHours(setMinutes(date, 1), 20); // 20:01
        return { minTime: min, maxTime: max };
    }, [date]);


    if (loading || authLoading || !user) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }
    
    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: 'background.default', minHeight: '100vh' }}>
            <Container maxWidth="xl"> {/* Auf xl geändert für mehr Platz */}
                <Typography variant="h4" fontWeight={800} sx={{ mb: 3, mt: 2 }}>
                    Mein Kalender
                </Typography>
                
                {/* START: Geteilte Kalender-Komponente wird hier gerendert */}
                <BookingCalendar
                    // WICHTIG: Props an die neue Komponente übergeben
                    localizer={localizer}
                    messages={messages}
                    events={calendarEvents}
                    resources={staffResource} // Nur den eigenen Mitarbeiter als Ressource
                    view={view}
                    date={date}
                    onNavigate={handleNavigate}
                    onView={handleView}
                    onSelectEvent={(event: any) => handleEventClick(event.original)}
                    onEventDrop={handleEventDrop}
                    onSelectSlot={() => {}} // Kein "Einfügen" für Staff
                    min={minTime} 
                    max={maxTime} 
                    staffColors={staffColors}
                />
                {/* ENDE: Geteilte Kalender-Komponente */}

                
                {/* Dialog für Termindetails und Bearbeitung (unverändert) */}
                <Dialog open={!!selectedBooking} onClose={() => setSelectedBooking(null)}>
                    <DialogTitle>{editMode ? 'Termin bearbeiten' : 'Termindetails'}</DialogTitle>
                    <DialogContent>
                        {selectedBooking && (
                            editMode ? (
                                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                                    <FormControl fullWidth>
                                        <InputLabel>Service</InputLabel>
                                        <Select
                                            value={editedData.serviceId}
                                            label="Service"
                                            onChange={(e) => setEditedData(prev => ({ ...prev, serviceId: e.target.value }))}
                                        >
                                            {services
                                                // KORREKTUR: Prüfe skills auf User-Objekt
                                                .filter(service => user?.skills?.some(s => (typeof s === 'string' ? s : s._id) === service._id))
                                                .map(service => (
                                                <MenuItem key={service._id} value={service._id}>{service.title}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        label="Datum und Uhrzeit"
                                        type="datetime-local"
                                        value={editedData.dateTime}
                                        onChange={(e) => setEditedData(prev => ({ ...prev, dateTime: e.target.value }))}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Box>
                            ) : (
                                <List>
                                    <ListItem><ListItemText primary="Kunde" secondary={`${selectedBooking.user.firstName} ${selectedBooking.user.lastName}`} /></ListItem>
                                    <ListItem><ListItemText primary="Service" secondary={selectedBooking.service.title} /></ListItem>
                                    <ListItem><ListItemText primary="Datum & Uhrzeit" secondary={dayjs(selectedBooking.dateTime).format('dddd, D. MMMM YYYY, HH:mm')} /></ListItem>
                                </List>
                            )
                        )}
                    </DialogContent>
                    <DialogActions>
                        {editMode ? (
                            <>
                                <Button onClick={() => setEditMode(false)}>Abbrechen</Button>
                                <Button onClick={handleUpdateBooking} variant="contained">Speichern</Button>
                            </>
                        ) : (
                            <>
                                <Button onClick={() => setSelectedBooking(null)}>Schließen</Button>
                                {selectedBooking && isCancellable(selectedBooking.dateTime) ? (
                                    <Button onClick={handleCancelBooking} color="error">Stornieren</Button>
                                ) : (
                                    <Tooltip title="Stornierung nicht mehr möglich (Frist abgelaufen)">
                                        <span><Button disabled>Stornieren</Button></span>
                                    </Tooltip>
                                )}
                                <Button onClick={() => setEditMode(true)} variant="contained">Bearbeiten</Button>
                            </>
                        )}
                    </DialogActions>
                </Dialog>

                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={6000}
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                >
                    <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Container>
        </Box>
    );
}

