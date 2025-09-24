'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Rating,
  Stack,
  Typography,
  Grid,
  Card,
  CardContent,
  IconButton
} from '@mui/material'
import { fetchServices, type Service } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import HeroSlider from '@/components/HeroSlider' // Stellt sicher, dass du diese Komponente wie besprochen erstellst

import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import InstagramIcon from '@mui/icons-material/Instagram'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'

// --- Shop-Daten (können später aus dem Backend kommen) ---
const SALON_NAME = "Mo's Barbershop"
const SALON_ADDRESS = 'Musterstraße 7, 85055 Ingolstadt'
const SALON_PHONE = '+49 151 23456789'
const INSTAGRAM = 'https://instagram.com/'

const OPENING_HOURS = [
  { day: 'Montag', range: '10:00 – 19:00' },
  { day: 'Dienstag', range: '10:00 – 19:00' },
  { day: 'Mittwoch', range: '10:00 – 19:00' },
  { day: 'Donnerstag', range: '10:00 – 19:00' },
  { day: 'Freitag', range: '09:00 – 19:00' },
  { day: 'Samstag', range: '09:00 – 15:00' },
  { day: 'Sonntag', range: '', closed: true },
]

const MOCK_REVIEWS = [
    { author: 'Maik', date: '07.08.2025', text: 'Bin sehr zufrieden. Gerne wieder!' },
    { author: 'Dennis', date: '07.08.2025', text: 'Richtig genialer Barbershop – auf Wünsche wird eingegangen!' },
    { author: 'Kai', date: '05.08.2025', text: 'Wie immer super. Alles perfekt!' },
]

type ServiceWithCategory = Service & { category?: string };

export default function LandingPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchServices(token, { global: true }) as ServiceWithCategory[];
        setServices(data) // Lädt alle Services
      } catch (e) {
        console.error('Service-Liste konnte nicht geladen werden', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const servicesByCategory = useMemo(() => {
    return services.reduce((acc, service) => {
      const categoryName = (service as any).category?.name || 'Allgemein';
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      acc[categoryName].push(service);
      return acc;
    }, {} as Record<string, ServiceWithCategory[]>);
  }, [services]);


  function Step({ text }: { text: string }) {
        return (
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="flex-start"
            sx={{ mb: 1 }}
          >
            <span style={{ fontSize: 20 }}>💇‍♀️</span>
            <Typography>{text}</Typography>
          </Stack>
        )
      }

      const MOCK_REVIEWS = [
        { author: 'Maik', date: '07.08.2025', text: 'Bin sehr zufrieden. Gerne wieder!' },
        { author: 'Dennis', date: '07.08.2025', text: 'Richtig genialer Barbershop – auf Wünsche wird eingegangen!' },
        { author: 'Kai', date: '05.08.2025', text: 'Wie immer super. Alles perfekt!' },
      ]

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <HeroSlider />

      {/* SERVICES SECTION */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {Object.entries(servicesByCategory).map(([category, servicesInCategory]) => (
          <Box key={category} sx={{ mb: 6 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
              {category}
            </Typography>
            {servicesInCategory.map(service => (
              <Card key={service._id} variant="outlined" sx={{ mb: 2, '&:hover': { borderColor: 'secondary.main' } }}>
                <CardContent>
                    <Grid container alignItems="center" spacing={2}>
                        <Grid size={{xs: 12, md: 6}}>
                            <Typography variant="h6">{service.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {service.duration} Minuten
                            </Typography>
                        </Grid>
                        <Grid  size={{xs: 6, md: 3}} sx={{ textAlign: {xs: 'left', md: 'right'} }}>
                            <Typography variant="h6" fontWeight="bold">
                                {service.price.toFixed(2)} €
                            </Typography>
                        </Grid>
                        <Grid  size={{xs: 6, md: 3}} sx={{ textAlign: 'right' }}>
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={() => router.push('/booking')}
                            >
                                Buchen
                            </Button>
                        </Grid>
                    </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>
        ))}
      </Container>
      
      {/* REVIEWS / TRUST (Wiederhergestellt) */}
      <Box sx={{ py: 8, backgroundColor: '#fff' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
            Was Kund:innen sagen
          </Typography>

          <Grid container spacing={3}>
            {MOCK_REVIEWS.map((r, i) => (
              <Grid key={i} size={{ xs: 12, md: 4 }}>
                <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Rating value={5} readOnly size="small" />
                    <Typography variant="body2" color="text.secondary">
                      Verifiziert
                    </Typography>
                  </Stack>

                  <Typography sx={{ mt: 1.5 }}>{r.text}</Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1.5, display: 'block' }}
                  >
                    {r.author} • {r.date}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* INFO: Opening hours + Contact */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTimeIcon />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Öffnungszeiten
                </Typography>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1}>
                {OPENING_HOURS.map((o) => (
                  <Stack
                    key={o.day}
                    direction="row"
                    justifyContent="space-between"
                  >
                    <Typography>{o.day}</Typography>
                    <Typography color="text.secondary">
                      {o.closed ? 'Geschlossen' : o.range}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LocationOnIcon />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Kontakt & Standort
                </Typography>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1.5}>
                <Typography>{SALON_NAME}</Typography>
                <Typography color="text.secondary">{SALON_ADDRESS}</Typography>

                <Stack direction="row" alignItems="center" spacing={1}>
                  <PhoneIphoneIcon fontSize="small" />
                  <Typography>{SALON_PHONE}</Typography>
                </Stack>

                <Stack direction="row" spacing={1}>
                  {INSTAGRAM && (
                    <IconButton
                      color="inherit"
                      onClick={() => window.open(INSTAGRAM, '_blank')}
                    >
                      <InstagramIcon />
                    </IconButton>
                  )}
                </Stack>

                <Button
                  variant="contained"
                  startIcon={<CalendarMonthIcon />}
                  onClick={() => router.push('/booking')}
                  sx={{ mt: 1 }}
                >
                  Termin jetzt sichern
                </Button>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Container>

    </Box>
  )
}