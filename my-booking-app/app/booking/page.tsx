'use client'
import { useRouter, useSearchParams } from 'next/navigation' 
import { useEffect, useState } from 'react'
import {
  Container, Box, Stepper, Step, StepLabel, Button, Typography, CircularProgress,
  Card, CardActionArea, CardContent, Avatar, Chip, Alert, TextField, MenuItem, Paper, Stack, Grid
} from '@mui/material'
import api, {
  fetchServices as fetchGlobalServices,
  fetchAllUsers,
  createBooking,
  fetchTimeslots,
  fetchLastBookingForUser, // WICHTIG: Importiert
  type Service,
  type User
} from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import dayjs from 'dayjs'
import { motion, AnimatePresence } from 'framer-motion' // Für die Animation

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

type Staff = { _id: string; email: string; name?: string; firstName?: string; lastName?: string; skills?: string[] }

const steps = ['Kunde wählen', 'Service wählen', 'Mitarbeiter wählen', 'Datum & Zeit wählen', 'Bestätigung'];

const getInitials = (name = '') => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';

export default function BookingPage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams() 

  const [isAdminOrStaff, setIsAdminOrStaff] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Data states
  const [services, setServices] = useState<Service[]>([])
  const [allCustomers, setAllCustomers] = useState<User[]>([]);
  const [staffForService, setStaffForService] = useState<Staff[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState({ services: true, staff: false, slots: false, customers: false });
  const [suggestion, setSuggestion] = useState<{service: string, staff: string} | null>(null); // State für den Vorschlag

  // Selection states
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      const isAdmin = user.role === 'admin';
      const isStaff = user.role === 'staff';
      setIsAdminOrStaff(isAdmin || isStaff);
      setActiveStep(isAdmin || isStaff ? 0 : 1);
    }
  }, [user]);

  // Lade initiale Daten
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const svc = await fetchGlobalServices();
        setServices(svc);
        setLoading(p => ({ ...p, services: false }));

        if (isAdminOrStaff && token) {
          setLoading(p => ({ ...p, customers: true }));
          const customerUsers = await fetchAllUsers(token, 'user');
          setAllCustomers(customerUsers);
          setLoading(p => ({ ...p, customers: false }));
        }
      } catch {
        setError('Daten konnten nicht geladen werden.');
        setLoading(p => ({ ...p, services: false, customers: false }));
      }
    };
    if (!authLoading) {
        loadInitialData();
    }
  }, [token, isAdminOrStaff, authLoading]);

  // useEffect to handle copied data
  useEffect(() => {
    if (loading.services || loading.customers) return;

    const copyUserId = searchParams.get('copyUser');
    const copyServiceId = searchParams.get('copyService');
    const copyStaffId = searchParams.get('copyStaff');

    if (copyUserId && copyServiceId && copyStaffId) {
      const customer = allCustomers.find(c => c._id === copyUserId);
      const service = services.find(s => s._id === copyServiceId);
      
      if (customer) setSelectedCustomerId(customer._id);
      if (service) setSelectedService(service);
      
      if(customer && service) {
          setActiveStep(3); // Springt zu Datum & Zeit
      }
    }
  }, [searchParams, services, allCustomers, loading.services, loading.customers]);

  // NEU: Dieser Hook lädt einen Vorschlag, sobald ein Kunde ausgewählt wurde.
  useEffect(() => {
    if (isAdminOrStaff && selectedCustomerId && token) {
        // Alten Vorschlag zurücksetzen, wenn Kunde wechselt
        setSuggestion(null);

        const loadSuggestion = async () => {
            try {
                const lastBooking = await fetchLastBookingForUser(selectedCustomerId, token);
                if (lastBooking) {
                    setSuggestion(lastBooking);
                }
            } catch (error) {
                console.log("Kein vorheriger Termin für Vorschlag gefunden.");
            }
        };
        loadSuggestion();
    }
  }, [selectedCustomerId, isAdminOrStaff, token]);
  
  // Lade Mitarbeiter, wenn ein Service gewählt wurde
  useEffect(() => {
    if (!selectedService) return;
    const loadStaff = async () => {
      setLoading(p => ({ ...p, staff: true }));
      try {
        const res = await api.get(`/staff/service/${selectedService._id}`);
        setStaffForService(res.data);
      } catch (error) {
        setError('Mitarbeiter für diesen Service konnten nicht geladen werden.');
      } finally {
        setLoading(p => ({ ...p, staff: false }));
      }
    };
    loadStaff();
  }, [selectedService]);

  // Lade Zeitslots, wenn Datum, Service und Mitarbeiter gewählt sind
  useEffect(() => {
    if (!selectedService || !selectedStaff || !selectedDate) return;
    const loadSlots = async () => {
      setLoading(p => ({ ...p, slots: true }));
      setSelectedSlot(null);
      try {
        const dateStr = dayjs(selectedDate).format('YYYY-MM-DD');
        const { slots } = await fetchTimeslots({ staffId: selectedStaff._id, serviceId: selectedService._id, date: dateStr }, token!);
        setAvailableSlots(slots);
      } catch {
        setError('Verfügbare Zeiten konnten nicht geladen werden.');
      } finally {
        setLoading(p => ({ ...p, slots: false }));
      }
    }
    loadSlots();
  }, [selectedService, selectedStaff, selectedDate, token]);

  const handleNext = () => {
    if (suggestion) setSuggestion(null); 
    setActiveStep((prev) => prev + 1);
  };
  const handleBack = () => setActiveStep((prev) => prev - 1);

  // NEU: Handler, um einen Vorschlag zu übernehmen
  const applySuggestion = () => {
    if (!suggestion) return;
    const suggestedService = services.find(s => s._id === suggestion.service);
    if (suggestedService) {
      setSelectedService(suggestedService);
      // Wir setzen den Mitarbeiter für den nächsten Schritt und springen dorthin
      // Die Logik im nächsten Schritt wird ihn dann automatisch auswählen
      handleNext(); // Springe zu Service-Auswahl (die wird übersprungen) -> Mitarbeiter
    }
    setSuggestion(null); // Vorschlag ausblenden nach Übernahme
  };

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
      case 0: // Kundenauswahl
        const suggestedServiceDetails = suggestion ? services.find(s => s._id === suggestion.service) : null;
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Für wen wird der Termin gebucht?</Typography>
            <TextField
              select
              label="Kunde auswählen"
              value={selectedCustomerId || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              fullWidth
            >
              {allCustomers.map(c => (
                <MenuItem key={c._id} value={c._id}>{`${c.firstName} ${c.lastName}`.trim() || c.email}</MenuItem>
              ))}
            </TextField>
            
            {/* KORREKTUR: Die Vorschlags-Box */}
            <AnimatePresence>
            {suggestion && suggestedServiceDetails && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Paper variant="outlined" sx={{ p: 2, mt: 3, borderColor: 'secondary.main', bgcolor: 'secondary.lightest' }}>
                    <Typography variant="subtitle2" gutterBottom>Vorschlag (letzter Termin):</Typography>
                    <Typography><strong>{suggestedServiceDetails.title}</strong></Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button variant="contained" size="small" onClick={applySuggestion}>Übernehmen</Button>
                      <Button variant="text" size="small" onClick={() => setSuggestion(null)}>Ignorieren</Button>
                    </Stack>
                </Paper>
              </motion.div>
            )}
            </AnimatePresence>
          </Box>
        );

      case 1:
        return (
          <Grid container spacing={2}>
            {loading.services ? (
              <CircularProgress />
            ) : (
              services.map((service) => (
                <Grid key={service._id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: selectedService?._id === service._id ? 'primary.main' : undefined,
                      borderWidth: selectedService?._id === service._id ? 2 : 1,
                      borderRadius: 3,
                      transition: 'all 0.2s'
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        setSelectedService(service);
                        handleNext();
                      }}
                      sx={{ p: 2 }}
                    >
                      <Typography variant="h6" gutterBottom>
                        {service.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {service.duration} Minuten
                      </Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={2}>
            {loading.staff ? (
              <CircularProgress />
            ) : (
              staffForService.map((staff) => (
                <Grid key={staff._id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderColor: selectedStaff?._id === staff._id ? 'primary.main' : undefined,
                      borderWidth: selectedStaff?._id === staff._id ? 2 : 1,
                      borderRadius: 3
                    }}
                  >
                    <CardActionArea
                      onClick={() => {
                        setSelectedStaff(staff);
                        handleNext();
                      }}
                      sx={{ p: 2, textAlign: 'center' }}
                    >
                      <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1, bgcolor: 'primary.light' }}>
                        {getInitials(staff.name || `${staff.firstName} ${staff.lastName}`)}
                      </Avatar>
                      <Typography variant="h6">
                        {staff.name || `${staff.firstName} ${staff.lastName}`}
                      </Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid  size={{ xs: 12, md: 5 }}>
              <Typography variant="h6" gutterBottom>Wähle ein Datum</Typography>
              <TextField
                type="date"
                value={dayjs(selectedDate).format('YYYY-MM-DD')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Typography variant="h6" gutterBottom>Wähle eine Uhrzeit</Typography>
              {loading.slots ? (
                <CircularProgress />
              ) : (
                <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflowY: 'auto' }}>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => (
                        <Chip
                          key={slot}
                          label={dayjs(slot).format('HH:mm')}
                          onClick={() => setSelectedSlot(slot)}
                          color={selectedSlot === slot ? 'primary' : 'default'}
                          variant={selectedSlot === slot ? 'filled' : 'outlined'}
                          clickable
                        />
                      ))
                    ) : (
                      <Typography color="text.secondary">
                        Keine verfügbaren Zeiten an diesem Tag.
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              )}
            </Grid>
          </Grid>
        );


      case 4:
        const selectedCustomer = allCustomers.find(c => c._id === selectedCustomerId) || user;
        return (
          <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="h5" gutterBottom>Bitte bestätigen</Typography>
            <Typography><strong>Kunde:</strong> {`${selectedCustomer?.firstName} ${selectedCustomer?.lastName}`.trim() || selectedCustomer?.email}</Typography>
            <Typography><strong>Service:</strong> {selectedService?.title}</Typography>
            <Typography><strong>Mitarbeiter:</strong> {`${selectedStaff?.firstName} ${selectedStaff?.lastName}`.trim() || selectedStaff?.email}</Typography>
            <Typography><strong>Datum & Zeit:</strong> {dayjs(selectedSlot).format('dd, DD.MM.YYYY [um] HH:mm [Uhr]')}</Typography>
          </Paper>
        );

      case 5:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            </motion.div>
            <Typography variant="h5">Termin erfolgreich gebucht!</Typography>
            <Typography color="text.secondary">Der Kunde wurde per E-Mail benachrichtigt.</Typography>
            <Button variant="contained" sx={{ mt: 3 }} onClick={() => router.push(isAdminOrStaff ? '/admin' : '/dashboard')}>
              {isAdminOrStaff ? 'Zurück zum Kalender' : 'Zu meinen Terminen'}
            </Button>
          </Box>
        );

      default:
        return <Typography>Unbekannter Schritt</Typography>;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 4 }}>
            <Stepper activeStep={activeStep} orientation="vertical">
              {effectiveSteps.map((label, index) => (
                <Step key={label} completed={activeStep > index}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ minHeight: 400 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {renderStepContent(currentStepContent)}
          </Box>

          {activeStep < effectiveSteps.length && (
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 4, mt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                color="inherit"
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ mr: 1 }}
                startIcon={<ArrowBackIcon />}
              >
                Zurück
              </Button>
              <Box sx={{ flex: '1 1 auto' }} />
              {activeStep === effectiveSteps.length - 1 ? (
                <Button variant="contained" color="secondary" onClick={handleBookingSubmit} endIcon={<CheckCircleIcon />}>
                  Termin bestätigen
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStepContent === 0 && !selectedCustomerId) ||
                    (currentStepContent === 1 && !selectedService) ||
                    (currentStepContent === 2 && !selectedStaff) ||
                    (currentStepContent === 3 && !selectedSlot)
                  }
                  endIcon={<ArrowForwardIcon />}
                >
                  Weiter
                </Button>
              )}
            </Box>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}