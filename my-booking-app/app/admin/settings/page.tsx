'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { fetchSalons, updateSalon, type Salon, type OpeningHours } from '@/services/api'
import {
  Container,
  Typography,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Box,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material'
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'
import SaveIcon from '@mui/icons-material/Save'

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export default function AdminSettingsPage() {
  const { user, token } = useAuth()
  const [salons, setSalons] = useState<Salon[]>([])
  const [selectedSalonId, setSelectedSalonId] = useState<string>('')
  const [openingHours, setOpeningHours] = useState<OpeningHours[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' })

  useEffect(() => {
    const loadSalons = async () => {
      try {
        const salonData = await fetchSalons();
        setSalons(salonData);
        if (salonData.length > 0) {
          const firstSalon = salonData[0];
          setSelectedSalonId(firstSalon._id);
          setOpeningHours(firstSalon.openingHours);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Salons", err);
        setToast({ open: true, msg: 'Salons konnten nicht geladen werden.', sev: 'error' });
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      loadSalons();
    }
  }, [token]);

  const handleSalonChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const salonId = event.target.value;
    const selected = salons.find(s => s._id === salonId);
    if (selected) {
      setSelectedSalonId(selected._id);
      setOpeningHours(selected.openingHours);
    }
  };

  const handleOpeningHoursChange = (weekday: number, field: keyof OpeningHours, value: any) => {
    const updatedHours = openingHours.map(day => 
      day.weekday === weekday ? { ...day, [field]: value } : day
    );
    setOpeningHours(updatedHours);
  };
  
  const handleSave = async () => {
    try {
      await updateSalon(selectedSalonId, { openingHours });
      setToast({ open: true, msg: 'Öffnungszeiten erfolgreich gespeichert!', sev: 'success' });
    } catch (err) {
      setToast({ open: true, msg: 'Fehler beim Speichern.', sev: 'error' });
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Öffnungszeiten' }]} />
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ flexGrow: 1 }}>
          Öffnungszeiten verwalten
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!selectedSalonId || loading}
        >
          Speichern
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <TextField
            select
            label="Salon auswählen"
            value={selectedSalonId}
            onChange={handleSalonChange}
            fullWidth
            sx={{ mb: 3 }}
          >
            {salons.map(salon => (
              <MenuItem key={salon._id} value={salon._id}>{salon.name}</MenuItem>
            ))}
          </TextField>

          <Stack spacing={2} divider={<Divider />}>
            {openingHours.sort((a,b) => a.weekday - b.weekday).map(day => (
              <Box key={day.weekday}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 1 }}>
                  <Typography fontWeight={600} sx={{ width: '120px' }}>{WEEKDAYS[day.weekday]}</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={day.isOpen}
                        onChange={(e) => handleOpeningHoursChange(day.weekday, 'isOpen', e.target.checked)}
                      />
                    }
                    label={day.isOpen ? "Geöffnet" : "Geschlossen"}
                  />
                  {day.isOpen && (
                    <>
                      <TextField
                        type="time"
                        label="Von"
                        value={day.open}
                        onChange={(e) => handleOpeningHoursChange(day.weekday, 'open', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        type="time"
                        label="Bis"
                        value={day.close}
                        onChange={(e) => handleOpeningHoursChange(day.weekday, 'close', e.target.value)}
                        InputLabelProps={{ shrink: true }}
                      />
                    </>
                  )}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Paper>
      )}
       <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast(p => ({...p, open: false}))}>
          <Alert onClose={() => setToast(p => ({...p, open: false}))} severity={toast.sev} sx={{ width: '100%' }}>
              {toast.msg}
          </Alert>
      </Snackbar>
    </Container>
  )
}