'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
    Container, Box, Stepper, Step, StepLabel, Button, Typography, CircularProgress,
    Grid, Card, CardActionArea, CardContent, Avatar, Chip, Alert, TextField, MenuItem, Paper
} from '@mui/material'
import api, { 
    fetchGlobalServices, // KORREKTUR: Wir nutzen explizit die globalen Services
    fetchAllUsers, 
    createBooking, 
    fetchTimeslots, 
    type Service, 
    type User 
} from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import dayjs from 'dayjs'

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type Staff = { _id: string; email: string; name?: string; firstName?: string; lastName?: string; skills?: string[] }

const steps = ['Kunde wählen', 'Service wählen', 'Mitarbeiter wählen', 'Datum & Zeit wählen', 'Bestätigung'];

const getInitials = (name = '') => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';

export default function BookingPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  
  const [activeStep, setActiveStep] = useState(isAdminOrStaff ? 0 : 1);

  // Data states
  const [services, setServices] = useState<Service[]>([])
  const [allCustomers, setAllCustomers] = useState<User[]>([]);
  const [staffForService, setStaffForService] = useState<Staff[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState({ services: true, staff: false, slots: false, customers: isAdminOrStaff });

  // Selection states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(isAdminOrStaff ? null : user?._id || null);
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  
  const [error, setError] = useState('');

  // Lade initiale Daten
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // KORREKTUR: Rufe immer die globalen Services ab
        const svc = await fetchGlobalServices();
        setServices(svc);
        setLoading(p => ({...p, services: false}));

        if (isAdminOrStaff && token) {
            // KORREKTUR: Rufe explizit alle 'user' ab
            const customerUsers = await fetchAllUsers(token, 'user');
            setAllCustomers(customerUsers);
            setLoading(p => ({...p, customers: false}));
        }
      } catch {
        setError('Daten konnten nicht geladen werden.');
        setLoading(p => ({...p, services: false, customers: false}));
      }
    };
    loadInitialData();
  }, [token, isAdminOrStaff]);


  // Lade Mitarbeiter, wenn ein Service gewählt wurde
  useEffect(() => {
    if (!selectedService) return;
    const loadStaff = async () => {
      setLoading(p => ({...p, staff: true}));
      try {
        const res = await api.get(`/staff/service/${selectedService._id}`);
        setStaffForService(res.data);
      } catch (error) {
        setError('Mitarbeiter für diesen Service konnten nicht geladen werden.');
      } finally {
        setLoading(p => ({...p, staff: false}));
      }
    };
    loadStaff();
  }, [selectedService]);

  // Lade Zeitslots, wenn Datum, Service und Mitarbeiter gewählt sind
  useEffect(() => {
    if (!selectedService || !selectedStaff || !selectedDate) return;
    const loadSlots = async () => {
        setLoading(p => ({...p, slots: true}));
        setSelectedSlot(null);
        try {
            const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
            const { slots } = await fetchTimeslots({ staffId: selectedStaff._id, serviceId: selectedService._id, date: dateStr }, token!);
            setAvailableSlots(slots);
        } catch {
            setError('Verfügbare Zeiten konnten nicht geladen werden.');
        } finally {
            setLoading(p => ({...p, slots: false}));
        }
    }
    loadSlots();
  }, [selectedService, selectedStaff, selectedDate, token]);
  
  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleBookingSubmit = async () => {
      if (!token || !selectedService || !selectedStaff || !selectedSlot) {
          setError('Alle Angaben sind erforderlich.');
          return;
      }
      const targetUserId = isAdminOrStaff ? selectedCustomerId : user?._id;
      if (!targetUserId) {
          setError('Bitte wählen Sie einen Kunden aus.');
          return;
      }

      try {
          await createBooking(selectedService._id, selectedSlot, selectedStaff._id, token, targetUserId);
          handleNext();
      } catch (e: any) {
          setError(e?.response?.data?.message || 'Buchung fehlgeschlagen.');
      }
  }
  
  const effectiveSteps = isAdminOrStaff ? steps : steps.slice(1);
  const currentStepContent = isAdminOrStaff ? activeStep : activeStep + 1;

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
            <Box>
                <Typography variant="h6" gutterBottom>Für wen wird der Termin gebucht?</Typography>
                {loading.customers ? <CircularProgress /> : (
                    <TextField
                        select
                        label="Kunde auswählen"
                        value={selectedCustomerId || ''}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        fullWidth
                        variant="outlined"
                    >
                        {allCustomers.map(c => (
                            <MenuItem key={c._id} value={c._id}>
                                {`${c.firstName} ${c.lastName}` || c.name || c.email}
                            </MenuItem>
                        ))}
                    </TextField>
                )}
            </Box>
        );
      // ... (Fälle 1, 2, 3, 4 bleiben unverändert)
      case 1: // Service wählen
        return (
          <Grid container spacing={2}>
            {loading.services ? <CircularProgress /> : services.map(service => (
              <Grid item xs={12} sm={6} md={4} key={service._id}>
                <Card variant="outlined" sx={{ borderColor: selectedService?._id === service._id ? 'primary.main' : undefined, borderWidth: selectedService?._id === service._id ? 2 : 1 }}>
                  <CardActionArea onClick={() => { setSelectedService(service); handleNext(); }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>{service.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{service.duration} Minuten</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
      case 2: // Mitarbeiter wählen
        return (
          <Grid container spacing={2}>
            {loading.staff ? <CircularProgress /> : staffForService.map(staff => (
              <Grid item xs={12} sm={6} md={4} key={staff._id}>
                <Card variant="outlined" sx={{ borderColor: selectedStaff?._id === staff._id ? 'primary.main' : undefined, borderWidth: selectedStaff?._id === staff._id ? 2 : 1 }}>
                  <CardActionArea onClick={() => { setSelectedStaff(staff); handleNext(); }}>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1, bgcolor: 'primary.light' }}>
                        {getInitials(staff.name || `${staff.firstName} ${staff.lastName}`)}
                      </Avatar>
                      <Typography variant="h6">{staff.name || `${staff.firstName} ${staff.lastName}`}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
      case 3: // Datum & Zeit
        return (
            <Box>
                <Typography variant="h6" gutterBottom>Wähle ein Datum</Typography>
                <TextField type="date" value={dayjs(selectedDate).format('YYYY-MM-DD')} onChange={(e) => setSelectedDate(new Date(e.target.value))} fullWidth sx={{ mb: 3 }} />
                
                <Typography variant="h6" gutterBottom>Wähle eine Uhrzeit</Typography>
                {loading.slots ? <CircularProgress /> : (
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                        {availableSlots.length > 0 ? availableSlots.map(slot => (
                            <Chip
                                key={slot}
                                label={dayjs(slot).format('HH:mm')}
                                onClick={() => setSelectedSlot(slot)}
                                color={selectedSlot === slot ? 'primary' : 'default'}
                                variant={selectedSlot === slot ? 'filled' : 'outlined'}
                                clickable
                            />
                        )) : <Typography color="text.secondary">Keine verfügbaren Zeiten an diesem Tag.</Typography>}
                    </Stack>
                )}
            </Box>
        );
      case 4: // Zusammenfassung
        const customer = allCustomers.find(c => c._id === selectedCustomerId) || user;
        return (
            <Paper sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>Bitte bestätigen</Typography>
                <Typography><strong>Kunde:</strong> {customer?.name || `${customer?.firstName} ${customer?.lastName}` || customer?.email}</Typography>
                <Typography><strong>Service:</strong> {selectedService?.title}</Typography>
                <Typography><strong>Mitarbeiter:</strong> {selectedStaff?.name || `${selectedStaff?.firstName} ${selectedStaff?.lastName}`}</Typography>
                <Typography><strong>Datum & Zeit:</strong> {dayjs(selectedSlot).format('dd, DD.MM.YYYY [um] HH:mm [Uhr]')}</Typography>
            </Paper>
        );
      case 5: // Bestätigung
        return (
            <Box sx={{ textAlign: 'center' }}>
                <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
                <Typography variant="h5">Termin erfolgreich gebucht!</Typography>
                <Typography color="text.secondary">Der Kunde wurde per E-Mail benachrichtigt.</Typography>
                <Button variant="contained" sx={{ mt: 3 }} onClick={() => router.push(isAdminOrStaff ? '/admin' : '/dashboard')}>
                    {isAdminOrStaff ? 'Zurück zum Kalender' : 'Zu meinen Terminen'}
                </Button>
            </Box>
        )
      default:
        return <Typography>Unbekannter Schritt</Typography>;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
        {effectiveSteps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box>
        {renderStepContent(currentStepContent)}
        
        {activeStep < effectiveSteps.length && (
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4 }}>
            <Button
                color="inherit"
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ mr: 1 }}
            >
                Zurück
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            {activeStep === effectiveSteps.length - 1 ? (
                <Button variant="contained" color="secondary" onClick={handleBookingSubmit}>
                    Termin bestätigen
                </Button>
            ) : (
                <Button onClick={handleNext} disabled={
                    (currentStepContent === 0 && !selectedCustomerId) ||
                    (currentStepContent === 1 && !selectedService) ||
                    (currentStepContent === 2 && !selectedStaff) ||
                    (currentStepContent === 3 && !selectedSlot)
                }>
                    Weiter
                </Button>
            )}
            </Box>
        )}
      </Box>
    </Container>
  );
}