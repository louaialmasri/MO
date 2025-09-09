'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Container, Box, Stepper, Step, StepLabel, Button, Typography, CircularProgress,
  Card, CardActionArea, CardContent, Avatar, Chip, Alert, Paper, Stack
} from '@mui/material'
import Grid from '@mui/material/Grid' // Grid v2 (aktuell)
import api, { fetchServices, createBooking, fetchTimeslots, type Service } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import dayjs from 'dayjs'

// Icons
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

type Staff = { _id: string; email: string; name?: string; firstName?: string; lastName?: string; skills?: string[] }

const steps = ['Service wählen', 'Mitarbeiter wählen', 'Datum & Zeit wählen', 'Bestätigung'];

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase();

export default function BookingPage() {
  const { user, token } = useAuth()
  const router = useRouter()

  const [activeStep, setActiveStep] = useState(0);

  // Data states
  const [services, setServices] = useState<Service[]>([])
  const [staffForService, setStaffForService] = useState<Staff[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loading, setLoading] = useState({ services: true, staff: false, slots: false });

  // Selection states
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const [error, setError] = useState('');

  // Lade initiale Services
  useEffect(() => {
    (async () => {
      try {
        const svc = await fetchServices(token)
        setServices(svc)
      } catch {
        setError('Dienstleistungen konnten nicht geladen werden.')
      } finally {
        setLoading(p => ({ ...p, services: false }))
      }
    })()
  }, [])

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
        const { slots } = await fetchTimeslots(
          { staffId: selectedStaff._id, serviceId: selectedService._id, date: dateStr },
          token!
        );
        setAvailableSlots(slots);
      } catch {
        setError('Verfügbare Zeiten konnten nicht geladen werden.');
      } finally {
        setLoading(p => ({ ...p, slots: false }));
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
    try {
      await createBooking(selectedService._id, selectedSlot, selectedStaff._id, token);
      handleNext(); // Zum Bestätigungsschritt
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Buchung fehlgeschlagen.');
    }
  }

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // Service wählen
        return (
          <Grid container spacing={2}>
            {loading.services ? <CircularProgress /> : services.map(service => (
              <Grid key={service._id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ borderColor: selectedService?._id === service._id ? 'primary.main' : undefined }}>
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
      case 1: // Mitarbeiter wählen
        return (
          <Grid container spacing={2}>
            {loading.staff ? <CircularProgress /> : staffForService.map(staff => (
              <Grid key={staff._id} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ borderColor: selectedStaff?._id === staff._id ? 'primary.main' : undefined }}>
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
      case 2: // Datum & Zeit
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Wähle ein Datum</Typography>
            {/* Hier würde man einen schönen Kalender-Komponente einfügen */}
            <input
              type="date"
              value={dayjs(selectedDate).format('YYYY-MM-DD')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
            />

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Wähle eine Uhrzeit</Typography>
            {loading.slots ? <CircularProgress /> : (
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {availableSlots.map(slot => (
                  <Chip
                    key={slot}
                    label={dayjs(slot).format('HH:mm')}
                    onClick={() => setSelectedSlot(slot)}
                    color={selectedSlot === slot ? 'primary' : 'default'}
                    variant="outlined"
                  />
                ))}
              </Stack>
            )}
          </Box>
        );
      case 3: // Zusammenfassung
        return (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Deine Buchung</Typography>
            <Typography><strong>Service:</strong> {selectedService?.title}</Typography>
            <Typography><strong>Mitarbeiter:</strong> {selectedStaff?.name || `${selectedStaff?.firstName} ${selectedStaff?.lastName}`}</Typography>
            <Typography><strong>Datum & Zeit:</strong> {dayjs(selectedSlot).format('dd, DD.MM.YYYY [um] HH:mm [Uhr]')}</Typography>
          </Paper>
        );
      case 4: // Bestätigung
        return (
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h5">Termin erfolgreich gebucht!</Typography>
            <Typography color="text.secondary">Eine Bestätigung wurde an deine E-Mail-Adresse gesendet.</Typography>
            <Button variant="contained" sx={{ mt: 3 }} onClick={() => router.push('/dashboard')}>Zu meinen Terminen</Button>
          </Box>
        )
      default:
        return <Typography>Unbekannter Schritt</Typography>;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box>
        {renderStepContent(activeStep)}

        {activeStep < 4 && (
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
            {activeStep === 3 ? (
              <Button variant="contained" onClick={handleBookingSubmit}>
                Termin bestätigen
              </Button>
            ) : activeStep < 3 && (
              <Button onClick={handleNext} disabled={
                (activeStep === 0 && !selectedService) ||
                (activeStep === 1 && !selectedStaff) ||
                (activeStep === 2 && !selectedSlot)
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
