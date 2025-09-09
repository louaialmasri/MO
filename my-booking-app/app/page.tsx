'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  IconButton,
  Paper,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { motion } from 'framer-motion'
import { fetchServices } from '@/services/api'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import InstagramIcon from '@mui/icons-material/Instagram'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward'
import { GridLegacy as Grid } from '@mui/material';
import { Token } from '@mui/icons-material'
import { useAuth } from '@/context/AuthContext'


type Service = { _id: string; title: string; duration?: number }

type OpeningHour = { day: string; range: string; closed?: boolean }

// --- Demo shop meta (replace with real salon data or move to .env) ---
const SALON_NAME = "Mo's Barbershop"
const SALON_ADDRESS = 'Musterstraße 7, 85055 Ingolstadt'
const SALON_PHONE = '+49 151 23456789'
const INSTAGRAM = 'https://instagram.com/' // optional

const OPENING_HOURS: OpeningHour[] = [
  { day: 'Montag', range: '10:00 – 19:00' },
  { day: 'Dienstag', range: '10:00 – 19:00' },
  { day: 'Mittwoch', range: '10:00 – 19:00' },
  { day: 'Donnerstag', range: '10:00 – 19:00' },
  { day: 'Freitag', range: '09:00 – 19:00' },
  { day: 'Samstag', range: '09:00 – 15:00' },
  { day: 'Sonntag', range: '', closed: true },
]

export default function LandingPage() {
  const router = useRouter()
  const { user, token } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchServices(token)
        setServices(data)
      } catch (e) {
        console.error('Service-Liste konnte nicht geladen werden', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!query) return services
    return services.filter(s => s.title.toLowerCase().includes(query.toLowerCase()))
  }, [query, services])

  return (
    <Box>
      {/* HERO */}
      <Box
        component={motion.section}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          position: 'relative',
          pt: { xs: 10, md: 14 },
          pb: { xs: 8, md: 12 },
          background:
            'radial-gradient(1200px 600px at 10% -10%, rgba(59,130,246,0.15), transparent), radial-gradient(900px 500px at 90% 0%, rgba(245,158,11,0.12), transparent)',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={7}>
              <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }} gutterBottom>
                Dein Look. Dein Termin.
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
                {SALON_NAME} – buche deinen Termin in Sekunden. Wähle Leistung, Mitarbeiter:in und die Zeit, die dir passt.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button size="large" variant="contained" startIcon={<CalendarMonthIcon />} onClick={() => router.push('/booking')}>
                  Termin buchen
                </Button>
                <Button size="large" variant="outlined" onClick={() => router.push('/login')}>
                  Meine Buchungen
                </Button>
              </Stack>

              <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
                <Chip icon={<LocationOnIcon />} label={SALON_ADDRESS} variant="outlined" />
                <Chip icon={<AccessTimeIcon />} label="Heute geöffnet – siehe Zeiten" variant="outlined" />
              </Stack>
            </Grid>

            <Grid item xs={12} md={5}>
              <Paper elevation={6} sx={{ p: 3, backdropFilter: 'blur(6px)', backgroundColor: 'rgba(255,255,255,0.85)' }}>
                <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
                  So einfach geht’s
                </Typography>
                <Step text="Leistung wählen (Haarschnitt, Farbe, Bart, …)" />
                <Step text="Mitarbeiter:in auswählen" />
                <Step text="Datum & Uhrzeit im Kalender wählen" />
                <Step text="Bestätigen – fertig!" />
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* SERVICES */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 3 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, flex: 1 }}>Leistungen</Typography>
          <TextField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nach Leistung suchen…"
            size="small"
            sx={{ width: { xs: '100%', md: 320 } }}
          />
        </Stack>

        <Grid container spacing={3}>
          {(loading ? Array.from({ length: 6 }) : filtered).map((s, idx) => (
            <Grid key={(s as Service)?._id ?? idx} item xs={12} sm={6} md={4}>
              <Paper
                component={motion.div}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18 }}
                elevation={3}
                sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {(s as Service)?.title ?? '…'}
                </Typography>
                <Typography color="text.secondary">
                  Dauer: {(s as Service)?.duration ? `${(s as Service).duration} Min.` : '—'}
                </Typography>
                <Box sx={{ mt: 'auto' }}>
                  <Button endIcon={<ArrowOutwardIcon />} onClick={() => router.push('/booking')}>
                    Jetzt buchen
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {!loading && filtered.length === 0 && (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography color="text.secondary">Keine Leistungen gefunden.</Typography>
          </Paper>
        )}
      </Container>

      {/* REVIEWS / TRUST */}
      <Box sx={{ py: 8, backgroundColor: '#fff' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Was Kund:innen sagen</Typography>
          <Grid container spacing={3}>
            {MOCK_REVIEWS.map((r, i) => (
              <Grid key={i} item xs={12} md={4}>
                <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Rating value={5} readOnly size="small" />
                    <Typography variant="body2" color="text.secondary">Verifiziert</Typography>
                  </Stack>
                  <Typography sx={{ mt: 1.5 }}>{r.text}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
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
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTimeIcon />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Öffnungszeiten</Typography>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Stack spacing={1}>
                {OPENING_HOURS.map((o) => (
                  <Stack key={o.day} direction="row" justifyContent="space-between">
                    <Typography>{o.day}</Typography>
                    <Typography color="text.secondary">{o.closed ? 'Geschlossen' : o.range}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LocationOnIcon />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Kontakt & Standort</Typography>
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
                    <IconButton color="inherit" onClick={() => window.open(INSTAGRAM, '_blank') }>
                      <InstagramIcon />
                    </IconButton>
                  )}
                </Stack>
                <Button variant="contained" startIcon={<CalendarMonthIcon />} onClick={() => router.push('/booking')} sx={{ mt: 1 }}>
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

function Step({ text }: { text: string }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 1 }}>
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