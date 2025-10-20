'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Container, Box, Stepper, Step, StepLabel, Button, Typography, CircularProgress,
  Card, CardActionArea, Avatar, Chip, Alert, TextField, MenuItem, Paper, Stack, Grid,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Backdrop
} from '@mui/material'
import {
  fetchServices as fetchGlobalServices,
  fetchAllUsers,
  createBooking,
  fetchTimeslots,
  fetchLastBookingForUser,
  fetchStaffForService,
  type Service,
  type User
} from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import dayjs from 'dayjs'
import { motion, AnimatePresence } from 'framer-motion'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

type Staff = { _id: string; email: string; name?: string; firstName?: string; lastName?: string; skills?: { _id: string }[] }
const steps = ['Kunde wählen', 'Service wählen', 'Mitarbeiter wählen', 'Datum & Zeit wählen', 'Bestätigung']
const getInitials = (name = '') => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : ''

export default function BookingPage() {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams() // Next.js Hook für URL-Parameter

  const [isAdminOrStaff, setIsAdminOrStaff] = useState(false)
  const [activeStep, setActiveStep] = useState(0)

  const [services, setServices] = useState<Service[]>([])
  const [allCustomers, setAllCustomers] = useState<User[]>([])
  const [staffForService, setStaffForService] = useState<Staff[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState({ initial: true, slots: false, staff: false })
  const [error, setError] = useState('')

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<{ service: string; staff: string } | null>(null)
  const [loginRequiredDialogOpen, setLoginRequiredDialogOpen] = useState(false);

  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user && (user.role === 'admin' || user.role === 'staff')) {
      setIsAdminOrStaff(true);
    } else {
      setIsAdminOrStaff(false);
      if (user) {
        setSelectedCustomerId(user._id);
      }
    }
    // setActiveStep wird nun im nächsten useEffect gesetzt, um Race Conditions zu vermeiden
  }, [user, authLoading]);

  // Initiale Daten laden & URL-Parameter verarbeiten
  useEffect(() => {
    const loadPrerequisites = async () => {
      setLoading(p => ({ ...p, initial: true }));
      try {
        const [svcs, users] = await Promise.all([
          fetchGlobalServices(),
          token && isAdminOrStaff ? fetchAllUsers(token, 'user') : Promise.resolve([]),
        ]);
        setServices(svcs as Service[]);
        setAllCustomers(users as User[]);
      } catch {
        setError('Wichtige Daten konnten nicht geladen werden.');
      } finally {
        setLoading(p => ({ ...p, initial: false }));
      }
    };

    if (token || !authLoading) {
      loadPrerequisites();
    }
  }, [token, isAdminOrStaff, authLoading]);

  // Vorschlag für letzten Termin laden
  useEffect(() => {
    if (isAdminOrStaff && selectedCustomerId && token) {
      setSuggestion(null)
      const loadSuggestion = async () => {
        try {
          const lastBooking = await fetchLastBookingForUser(selectedCustomerId, token)
          if (lastBooking) setSuggestion(lastBooking)
        } catch {
          console.log('Kein vorheriger Termin für Vorschlag gefunden.')
        }
      }
      loadSuggestion()
    }
  }, [selectedCustomerId, isAdminOrStaff, token])

  // Mitarbeiter laden, nachdem ein Service ausgewählt wurde (nur wenn nicht schon durch URL gesetzt)
  useEffect(() => {
    if (!selectedService || staffForService.length > 0) {
      return
    }
    const loadStaff = async () => {
      setLoading(p => ({ ...p, staff: true }));
      setSelectedStaff(null);
      try {
        const skilledStaff = await fetchStaffForService(selectedService._id);
        setStaffForService(skilledStaff as Staff[]);
        if (user?.role === 'staff') {
          const self = skilledStaff.find(s => s._id === user._id);
          if (self) {
            setSelectedStaff(self);
          }
        }
      } catch {
        setError('Mitarbeiter für diesen Service konnten nicht geladen werden.');
      } finally {
        setLoading(p => ({ ...p, staff: false }));
      }
    };
    loadStaff();
  }, [selectedService, user]);


  // Zeitslots laden
  useEffect(() => {
    // Verhindere das Neuladen der Slots, wenn bereits einer aus dem localStorage wiederhergestellt wurde.
    if (!selectedService || !selectedStaff || !selectedDate || selectedSlot) return

    const loadSlots = async () => {
      setLoading(p => ({ ...p, slots: true }))
      setSelectedSlot(null) // Dies wird jetzt nicht mehr fälschlicherweise ausgelöst.
      try {
        const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')
        const { slots } = await fetchTimeslots({ staffId: selectedStaff._id, serviceId: selectedService._id, date: dateStr }, token)
        setAvailableSlots(slots)
      } catch {
        setError('Verfügbare Zeiten konnten nicht geladen werden.')
      } finally {
        setLoading(p => ({ ...p, slots: false }))
      }
    }
    loadSlots()
  }, [selectedService, selectedStaff, selectedDate, token, selectedSlot])

  const handleNext = () => {
    // Ermittle den nächsten Schritt basierend auf der aktuellen Position.
    // Für einen normalen Benutzer ist die Zeitauswahl Schritt 3.
    // Für einen Admin/Mitarbeiter ist es ebenfalls Schritt 3, da wir die absoluten Indizes von 'steps' betrachten (0-basiert).
    const isTimeSelectionStep = isAdminOrStaff ? activeStep === 3 : activeStep === 2;
    
    // Prüfen, ob wir uns im Zeitauswahl-Schritt befinden UND der Benutzer nicht eingeloggt ist.
    if (isTimeSelectionStep && !token) {
        // Speichere die Auswahl im localStorage.
        localStorage.setItem('bookingSelection', JSON.stringify({
            service: selectedService,
            staff: selectedStaff,
            date: dayjs(selectedDate).format('YYYY-MM-DD'),
            slot: selectedSlot,
        }));
        // Öffne den Login-Dialog und pausiere den Prozess.
        setLoginRequiredDialogOpen(true);
        return; // WICHTIG: Die Funktion hier beenden, um ein Weiterschalten zu verhindern.
    }

    // Wenn die obige Bedingung nicht zutrifft, gehe normal zum nächsten Schritt.
    // Behandelt auch den Fall, dass ein Mitarbeiter die Mitarbeiterauswahl überspringt.
    if (activeStep === (isAdminOrStaff ? 1 : 0) && user?.role === 'staff' && selectedStaff) {
      setActiveStep(prev => prev + 2); // Springe direkt zur Datumsauswahl
    } else {
      setActiveStep(prev => prev + 1);
    }
};


  const handleBack = () => {
    // Wenn man von Datum zurückspringt und per URL kam, muss man zu Schritt 0
    const serviceIdFromUrl = searchParams.get('serviceId');
    if(serviceIdFromUrl && activeStep === (isAdminOrStaff ? 3 : 2)) {
        router.push('/dashboard'); // Oder zurück zum Start der Buchung
        return;
    }
    setActiveStep(prev => prev - 1);
  }

  // Vorschlag übernehmen
  const applySuggestion = async () => {
    if (!suggestion) return
    const suggestedService = services.find(s => s._id === suggestion.service)
    if (!suggestedService) return;

    setSelectedService(suggestedService)
    const skilledStaff = await fetchStaffForService(suggestedService._id);
    setStaffForService(skilledStaff as Staff[]);
    const suggestedStaff = skilledStaff.find(s => s._id === suggestion.staff);

    if (suggestedStaff) {
      setSelectedStaff(suggestedStaff)
      setActiveStep(3)
    } else {
      setActiveStep(2)
    }
    setSuggestion(null)
  }

  useEffect(() => {
    // Nur ausführen, wenn der Ladevorgang abgeschlossen ist und ein Benutzer eingeloggt ist.
     if (!authLoading && token && user) {
      const pendingBookingJSON = localStorage.getItem('bookingSelection');

     if (pendingBookingJSON) {
        try {
          const pendingBooking = JSON.parse(pendingBookingJSON);

          // Wenn eine valide, wartende Buchung im Speicher gefunden wird
          if (pendingBooking.service && pendingBooking.staff && pendingBooking.slot) {
            // Stelle alle Auswahl-States wieder her
            setSelectedService(pendingBooking.service);
            setSelectedStaff(pendingBooking.staff);
            setSelectedDate(dayjs(pendingBooking.date).toDate());
            setSelectedSlot(pendingBooking.slot);

            // Springe direkt zum Zusammenfassungs-Schritt
            setActiveStep(4);
            // Räume den Speicher auf, da die Daten jetzt im State sind
            localStorage.removeItem('bookingSelection');
          }
        } catch {
          // Bei Fehlern (z.B. ungültiges JSON), einfach aufräumen
          localStorage.removeItem('bookingSelection');
        }
      }
    }
  }, [authLoading, token, user]); // Dieser Effekt wird immer dann ausgeführt, wenn sich der Login-Status ändert.


  const handleBookingSubmit = async () => {
    if (!selectedService || !selectedStaff || !selectedSlot) {
      setError('Alle Angaben sind erforderlich.')
      return
    }
    
    // Die alte Prüfung auf '!token' ist hier entfernt. 
    // An diesem Punkt MUSS der Benutzer eingeloggt sein.
    const targetUserId = isAdminOrStaff ? selectedCustomerId : user?._id;

    if (!targetUserId) {
      setError('Kunde konnte nicht identifiziert werden. Bitte loggen Sie sich erneut ein.')
      return
    }

    try {
      // Wir verwenden wieder den Ladezustand für ein besseres UI-Feedback
      setIsFinalizing(true); 
      await createBooking(selectedService._id, selectedSlot, selectedStaff._id, token!, targetUserId)
      
      // handleNext() wird hier direkt aufgerufen, um zum finalen Erfolgs-Screen zu gelangen.
      setActiveStep(prev => prev + 1);

    } catch (e: any) {
      setError(e?.response?.data?.message || 'Buchung fehlgeschlagen.')
    } finally {
      // Ladezustand in jedem Fall beenden
      setIsFinalizing(false); 
    }
  }

  // Logik für die Anzeige der Schritte und Inhalte
  const effectiveSteps = isAdminOrStaff ? steps : steps.slice(1);
  const stepContentIndex = isAdminOrStaff ? activeStep : activeStep + 1;


  const renderStepContent = (step: number) => {
    if (loading.initial) {
      return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
    }

    switch (step) {
      case 0:
        if (!isAdminOrStaff) return null;
        const suggestedServiceDetails = suggestion ? services.find(s => s._id === suggestion.service) : null
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

            <AnimatePresence>
              {suggestion && suggestedServiceDetails && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Paper variant="outlined" sx={{ p: 2, mt: 3, borderColor: 'secondary.main' }}>
                    <Typography variant="subtitle2" gutterBottom>Vorschlag (letzter Termin):</Typography>
                    <Typography>
                      <strong>{suggestedServiceDetails.title}</strong>
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button variant="contained" size="small" onClick={applySuggestion}>Übernehmen</Button>
                      <Button variant="text" size="small" onClick={() => setSuggestion(null)}>Ignorieren</Button>
                    </Stack>
                  </Paper>
                </motion.div>
              )}
            </AnimatePresence>
          </Box>
        )

      case 1:
        return (
          <Grid container spacing={2}>
            {services.map((service) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service._id}>
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
                      setSelectedService(service)
                    }}
                    sx={{ p: 2 }}
                  >
                    <Typography variant="h6" gutterBottom>{service.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{service.duration} Minuten</Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )

      case 2:
        if (user?.role === 'staff' && selectedStaff) {
          return null;
        }
        if (loading.staff) {
          return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
        }
        return (
          <Grid container spacing={2}>
            {staffForService.length === 0 ? (
              <Typography sx={{ mt: 2, ml: 2 }}>Keine verfügbaren Mitarbeiter für diesen Service gefunden.</Typography>
            ) : (
              staffForService.map((staff) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={staff._id}>
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
                        setSelectedStaff(staff)
                      }}
                      sx={{ p: 2, textAlign: 'center' }}
                    >
                      <Avatar sx={{ width: 64, height: 64, mx: 'auto', mb: 1, bgcolor: 'primary.light' }}>
                        {getInitials(staff.name || `${staff.firstName} ${staff.lastName}`)}
                      </Avatar>
                      <Typography variant="h6">{staff.name || `${staff.firstName} ${staff.lastName}`}</Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
        )

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Typography variant="h6" gutterBottom>Wähle ein Datum</Typography>
              <TextField
                type="date"
                value={dayjs(selectedDate).format('YYYY-MM-DD')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                fullWidth
                InputLabelProps={{ shrink: true }}
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
                      <Typography color="text.secondary">Keine verfügbaren Zeiten an diesem Tag.</Typography>
                    )}
                  </Stack>
                </Paper>
              )}
            </Grid>
          </Grid>
        )

      case 4:
        const selectedCustomer = allCustomers.find(c => c._id === selectedCustomerId) || user
        return (
          <Paper sx={{ p: 3, borderRadius: 4 }}>
            <Typography variant="h5" gutterBottom>Bitte bestätigen</Typography>
            <Typography><strong>Kunde:</strong> {`${selectedCustomer?.firstName} ${selectedCustomer?.lastName}`.trim() || selectedCustomer?.email}</Typography>
            <Typography><strong>Service:</strong> {selectedService?.title}</Typography>
            <Typography><strong>Mitarbeiter:</strong> {`${selectedStaff?.firstName} ${selectedStaff?.lastName}`.trim() || selectedStaff?.email}</Typography>
            <Typography><strong>Datum & Zeit:</strong> {dayjs(selectedSlot).format('dd, DD.MM.YYYY [um] HH:mm [Uhr]')}</Typography>
          </Paper>
        )

      case 5:
        return (
          <Box sx={{ textAlign: 'center' }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            </motion.div>
            <Typography variant="h5">Termin erfolgreich gebucht!</Typography>
            <Typography color="text.secondary">Du erhältst eine Bestätigung per E-Mail.</Typography>
            <Button variant="contained" sx={{ mt: 3 }} onClick={() => router.push(isAdminOrStaff ? '/admin' : '/dashboard')}>
              {isAdminOrStaff ? 'Zurück zum Kalender' : 'Zu meinen Terminen'}
            </Button>
          </Box>
        )

      default:
        return <Typography>Unbekannter Schritt</Typography>
    }
  }

    return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* NEU: Lade-Overlay */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={isFinalizing}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress color="inherit" />
          <Typography>Termin wird gebucht...</Typography>
        </Box>
      </Backdrop>

      {/* Bestehender Content wird nur angezeigt, wenn nicht finalisiert wird */}
      {!isFinalizing && (
        <>
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
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
                {renderStepContent(stepContentIndex)}
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
                        (stepContentIndex === 0 && !selectedCustomerId) ||
                        (stepContentIndex === 1 && !selectedService) ||
                        (stepContentIndex === 2 && !selectedStaff) ||
                        (stepContentIndex === 3 && !selectedSlot)
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
          <Dialog
            open={loginRequiredDialogOpen}
            onClose={() => setLoginRequiredDialogOpen(false)}
            aria-labelledby="login-required-dialog-title"
          >
            <DialogTitle id="login-required-dialog-title">
              Fast geschafft!
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                Um Ihren Termin verbindlich zu buchen, melden Sie sich bitte an oder erstellen Sie ein neues, kostenloses Konto.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setLoginRequiredDialogOpen(false)}>Abbrechen</Button>
              <Button onClick={() => router.push('/register?redirect=/booking')}>Registrieren</Button>
              <Button
                onClick={() => router.push('/login?redirect=/booking')}
                variant="contained"
                autoFocus
              >
                Zum Login
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Container>
  )
}