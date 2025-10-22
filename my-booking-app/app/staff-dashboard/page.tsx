'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getStaffBookings, fetchServices, updateBooking, fetchAllUsers, deleteBooking, Service, User, StaffBooking } from '@/services/api';
import {
    Box, Typography, CircularProgress, Dialog, DialogTitle, DialogContent,
    DialogActions, Button, TextField, Tooltip, MenuItem, List, ListItem,
    ListItemText, Select, Container, Paper, Alert, Snackbar, FormControl, InputLabel
} from '@mui/material';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

// NEU: Imports für react-big-calendar
import { Calendar, dateFnsLocalizer, Views, EventProps } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { de } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// Lokalisierung für date-fns einrichten
dayjs.locale('de');
const locales = { 'de': de };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// Unser benutzerdefinierter Event-Typ für Typsicherheit
interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    original: StaffBooking;
}

// Komponente für das Aussehen der Termine
const CalendarEventContent = ({ event }: EventProps<CalendarEvent>) => {
    const serviceName = event.original.service?.title || 'Service';
    const clientName = `${event.original.user?.firstName || ''} ${event.original.user?.lastName || ''}`.trim();

    return (
        <Box sx={{ height: '100%', overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {clientName}
            </Typography>
            <Typography variant="caption" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                {serviceName}
            </Typography>
        </Box>
    );
};

export default function StaffDashboardPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [bookings, setBookings] = useState<StaffBooking[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedBooking, setSelectedBooking] = useState<StaffBooking | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editedData, setEditedData] = useState<{ serviceId: string; dateTime: string }>({ serviceId: '', dateTime: '' });
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'staff')) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    const fetchData = useCallback(async () => {
        if (token) {
            try {
                setLoading(true);
                const [staffBookings, allServices, allUsers] = await Promise.all([
                    getStaffBookings(token),
                    fetchServices(token),
                    fetchAllUsers(token, 'customer')
                ]);
                setBookings(staffBookings);
                setServices(allServices);
                setUsers(allUsers);
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
    
    const calendarEvents: CalendarEvent[] = useMemo(() => bookings.map(booking => ({
        id: booking._id,
        title: `${booking.service?.title || 'Service'} - ${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim(),
        start: new Date(booking.dateTime),
        end: new Date(new Date(booking.dateTime).getTime() + (booking.service?.duration || 30) * 60000),
        original: booking
    })), [bookings]);

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

    if (loading || authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }
    
    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box>
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Mein Dashboard
                </Typography>
                <Paper sx={{ p: 2, height: '80vh' }}>
                    <Calendar
                        localizer={localizer}
                        culture='de'
                        events={calendarEvents}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        onSelectEvent={handleEventClick}
                        views={[Views.WEEK, Views.DAY, Views.AGENDA]}
                        defaultView={Views.WEEK}
                        step={15}
                        timeslots={4}
                        components={{
                            event: CalendarEventContent,
                        }}
                        messages={{
                            allDay: 'Ganztägig',
                            previous: 'Zurück',
                            next: 'Weiter',
                            today: 'Heute',
                            month: 'Monat',
                            week: 'Woche',
                            day: 'Tag',
                            agenda: 'Liste',
                            date: 'Datum',
                            time: 'Zeit',
                            event: 'Termin',
                            noEventsInRange: 'Keine Termine in diesem Zeitraum.',
                        }}
                    />
                </Paper>
                
                {/* Dialog für Termindetails und Bearbeitung */}
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
                                            {services.map(service => (
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
                                    <Tooltip title="Stornierung nicht mehr möglich (weniger als 24h)">
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