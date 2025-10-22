'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Button, Container, Paper, Stack, Typography, Grid, Card, CardContent,
  CircularProgress, List, ListItemButton, ListItemText, Divider, IconButton,
  Rating, Tab, Tabs, Link as MuiLink, // MuiLink importiert
  Tooltip
} from '@mui/material'
import { fetchServices, type Service, fetchSalons, type Salon, fetchGlobalServices } from '@/services/api' // fetchSalons und Salon importiert
import { useAuth } from '@/context/AuthContext'
import HeroSlider from '@/components/HeroSlider'

// Icons
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone'
import InstagramIcon from '@mui/icons-material/Instagram'
import FacebookIcon from '@mui/icons-material/Facebook'; // Facebook Icon importiert
import LanguageIcon from '@mui/icons-material/Language'; // Website Icon importiert
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ContentCutIcon from '@mui/icons-material/ContentCut';
import BrushIcon from '@mui/icons-material/Brush';
import FaceIcon from '@mui/icons-material/Face';
import SpaIcon from '@mui/icons-material/Spa';

// Statische Daten entfernt (werden jetzt dynamisch geladen)

const MOCK_REVIEWS = [
    { author: 'Maik', date: '07.08.2025', text: 'Bin sehr zufrieden. Gerne wieder!' },
    { author: 'Dennis', date: '07.08.2025', text: 'Richtig genialer Barbershop – auf Wünsche wird eingegangen!' },
    { author: 'Kai', date: '05.08.2025', text: 'Wie immer super. Alles perfekt!' },
]

type ServiceWithCategory = Service & { category?: string };

const categoryIcons: { [key: string]: React.ReactElement } = {
  'Haarschnitt': <ContentCutIcon />,
  'Färben': <BrushIcon />,
  'Bart': <FaceIcon />,
  'Pflege': <SpaIcon />,
  'Allgemein': <SpaIcon /> // Fallback-Icon
};

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];


export default function LandingPage() {
  const router = useRouter()
  const { token } = useAuth() // Token für Service-Laden
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [salonInfo, setSalonInfo] = useState<Salon | null>(null); // State für Salon-Infos
  const [loading, setLoading] = useState({ services: true, salon: true }); // Separate Ladezustände
  const [selectedCategory, setSelectedCategory] = useState<string | false>(false);

  // Lade Services und Salon-Informationen
  useEffect(() => {
    const loadData = async () => {
      // Services laden
      setLoading(prev => ({ ...prev, services: true }));
      try {
        // Services global laden (ohne Salon-Filter)
        const serviceData = await fetchGlobalServices() as ServiceWithCategory[];
        setServices(serviceData);
      } catch (e) {
        console.error('Service-Liste konnte nicht geladen werden', e);
      } finally {
        setLoading(prev => ({ ...prev, services: false }));
      }

      // Salon-Infos laden (wir nehmen den ersten Salon als Standard für die Landing Page)
      setLoading(prev => ({ ...prev, salon: true }));
      try {
        const salons = await fetchSalons(); // Nimmt an, dass fetchSalons ohne Token funktioniert oder ein Fallback hat
        if (salons && salons.length > 0) {
          setSalonInfo(salons[0]); // Nimm den ersten Salon
        }
      } catch (e) {
        console.error('Salon-Informationen konnten nicht geladen werden', e);
      } finally {
        setLoading(prev => ({ ...prev, salon: false }));
      }
    };
    loadData();
  }, [token]); // Lädt neu, wenn sich der Token ändert (optional, je nach Logik von fetchSalons)


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

 useEffect(() => {
    const categories = Object.keys(servicesByCategory);
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [servicesByCategory, selectedCategory]);

  const handleCategoryChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedCategory(newValue);
  };

  const isLoading = loading.services || loading.salon;

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      <HeroSlider />

      {/* Service-Sektion */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
          Unsere Dienstleistungen
        </Typography>

        {loading.services ? (
          <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
        ) : services.length === 0 ? (
           <Typography sx={{ textAlign: 'center', mt: 4 }}>Keine Dienstleistungen gefunden.</Typography>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs
                value={selectedCategory}
                onChange={handleCategoryChange}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="Service-Kategorien"
              >
                {Object.keys(servicesByCategory).map((category) => (
                  <Tab
                    key={category}
                    icon={categoryIcons[category] || <SpaIcon />}
                    iconPosition="start"
                    label={category}
                    value={category}
                  />
                ))}
              </Tabs>
            </Box>

            {selectedCategory && servicesByCategory[selectedCategory] ? (
              servicesByCategory[selectedCategory].map(service => (
                <Card key={service._id} variant="outlined" sx={{ mb: 2, '&:hover': { borderColor: 'primary.main' } }}>
                  <CardContent>
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6">{service.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{service.duration} Minuten</Typography>
                      </Grid>
                      <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                        <Typography variant="h6" fontWeight="bold">{service.price.toFixed(2)} €</Typography>
                      </Grid>
                      <Grid item xs={12} md={3} sx={{ textAlign: 'right' }}>
                        <Button variant="contained" color="primary" onClick={() => router.push('/booking')}>
                          Buchen
                        </Button>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Typography sx={{ textAlign: 'center', mt: 4 }}>Bitte eine Kategorie auswählen.</Typography>
            )}
          </>
        )}
      </Container>

      {/* Review-Sektion (unverändert) */}
      <Box sx={{ py: 8, backgroundColor: '#fff' }}>
        <Container maxWidth="lg">
           {/* ... Review Grid ... */}
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>
                Was Kund:innen sagen
            </Typography>
            <Grid container spacing={3}>
                {MOCK_REVIEWS.map((r, i) => (
                <Grid item xs = {12} md = {4} key={i}>
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

      {/* Info-Sektion (ANGEPASST für dynamische Daten) */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        {loading.salon ? (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>
        ) : !salonInfo ? (
            <Typography sx={{ textAlign: 'center' }}>Salon-Informationen nicht verfügbar.</Typography>
        ) : (
          <Grid container spacing={3}>
            {/* Öffnungszeiten */}
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <AccessTimeIcon />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Öffnungszeiten</Typography>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1}>
                  {salonInfo.openingHours.sort((a,b) => a.weekday - b.weekday).map((o) => (
                    <Stack key={o.weekday} direction="row" justifyContent="space-between">
                      <Typography>{WEEKDAYS[o.weekday]}</Typography>
                      <Typography color={o.isOpen ? "text.secondary" : "error.main"}>
                        {o.isOpen ? `${o.open} – ${o.close}` : 'Geschlossen'}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Kontakt & Standort */}
            <Grid item xs={12} md={4}>
              <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LocationOnIcon />
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Kontakt & Standort</Typography>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1.5}>
                  <Typography>{salonInfo.name}</Typography>
                  {salonInfo.address && <Typography color="text.secondary">{salonInfo.address}</Typography>}
                  {salonInfo.phone && (
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <PhoneIphoneIcon fontSize="small" />
                      <Typography>{salonInfo.phone}</Typography>
                    </Stack>
                  )}
                   {salonInfo.email && <Typography color="text.secondary">{salonInfo.email}</Typography>}

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                     {salonInfo.websiteUrl && (
                        <Tooltip title="Website besuchen">
                          <IconButton component={MuiLink} href={salonInfo.websiteUrl} target="_blank" color="inherit">
                              <LanguageIcon />
                          </IconButton>
                        </Tooltip>
                    )}
                    {salonInfo.socialMedia?.instagram && (
                      <Tooltip title="Instagram">
                        <IconButton component={MuiLink} href={salonInfo.socialMedia.instagram} target="_blank" color="inherit">
                          <InstagramIcon />
                        </IconButton>
                       </Tooltip>
                    )}
                     {salonInfo.socialMedia?.facebook && (
                       <Tooltip title="Facebook">
                          <IconButton component={MuiLink} href={salonInfo.socialMedia.facebook} target="_blank" color="inherit">
                            <FacebookIcon />
                          </IconButton>
                        </Tooltip>
                    )}
                  </Stack>

                  <Button
                    variant="contained"
                    startIcon={<CalendarMonthIcon />}
                    onClick={() => router.push('/booking')}
                    sx={{ mt: 2 }}
                  >
                    Termin jetzt sichern
                  </Button>
                </Stack>
              </Paper>
            </Grid>
            {/* Optional: Dritte Spalte für Karte oder Bild */}
             <Grid item xs = {12} md = {4}>
                {/* Hier könnte eine Google Maps Einbettung oder ein weiteres Bild sein */}
                <Paper elevation={2} sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">(Platz für Karte/Bild)</Typography>
                 </Paper>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  )
}
