'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Button,
  Container,
  Divider,
  Typography,
  Grid,
  Card,
  CardContent,
  Stack
} from '@mui/material'
import { fetchServices, type Service } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import HeroSlider from '@/components/HeroSlider' // Stellt sicher, dass du diese Komponente wie besprochen erstellst

// Definiert den Service-Typ inklusive der neuen optionalen Kategorie
type ServiceWithCategory = Service & { category?: string };

export default function LandingPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [services, setServices] = useState<ServiceWithCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Lädt alle Services vom Backend, sobald die Komponente geladen wird
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchServices(token) as ServiceWithCategory[];
        setServices(data)
      } catch (e) {
        console.error('Service-Liste konnte nicht geladen werden', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  // Gruppiert die geladenen Services nach ihrer Kategorie
  const servicesByCategory = useMemo(() => {
    return services.reduce((acc, service) => {
      const category = service.category || 'Allgemein'; // Fallback-Kategorie
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(service);
      return acc;
    }, {} as Record<string, ServiceWithCategory[]>);
  }, [services]);

  return (
    <Box sx={{ bgcolor: 'background.default' }}>
      {/* 1. Dynamischer Bilder-Slider */}
      <HeroSlider />

      {/* 2. Sektion für alle Leistungen, nach Kategorie gruppiert */}
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
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6">{service.title}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {service.duration} Minuten
                            </Typography>
                        </Grid>
                        <Grid item xs={6} md={3} sx={{ textAlign: {xs: 'left', md: 'right'} }}>
                            <Typography variant="h6" fontWeight="bold">
                                {service.price.toFixed(2)} €
                            </Typography>
                        </Grid>
                        <Grid item xs={6} md={3} sx={{ textAlign: 'right' }}>
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
      
      {/* 3. Informations-Sektion */}
      <Box sx={{ bgcolor: 'white', py: 8 }}>
        <Container maxWidth="lg">
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
                Informationen
            </Typography>
            <Grid container spacing={4} justifyContent="center" textAlign="center">
                <Grid item xs={12} md={5}>
                    <Typography variant="h5" gutterBottom>Öffnungszeiten</Typography>
                    <Typography>Montag - Freitag: 10:00 – 19:00</Typography>
                    <Typography>Samstag: 09:00 – 15:00</Typography>
                </Grid>
                <Grid item xs={12} md={5}>
                    <Typography variant="h5" gutterBottom>Kontakt</Typography>
                    <Typography>Musterstraße 7, 85055 Ingolstadt</Typography>
                    <Typography>+49 151 23456789</Typography>
                </Grid>
            </Grid>
        </Container>
      </Box>

      {/* 4. Bewertungs-Sektion (Platzhalter) */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 4, textAlign: 'center' }}>
            Bewertungen
          </Typography>
          <Typography textAlign="center" color="text.secondary">
            Hier werden bald die Bewertungen unserer Kunden angezeigt.
          </Typography>
      </Container>
    </Box>
  )
}