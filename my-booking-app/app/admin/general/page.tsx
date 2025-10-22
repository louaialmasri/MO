'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { getCurrentSalon, updateSalon, setDashboardPin, Salon, OpeningHours } from '@/services/api'
import {
  Container, Typography, Paper, Tabs, Tab, Box, CircularProgress,
  TextField, Button, Stack, Switch, FormControlLabel, Divider,
  Snackbar, Alert, Grid, Tooltip, IconButton
} from '@mui/material'
import AdminBreadcrumbs from '@/components/AdminBreadcrumbs'
import SaveIcon from '@mui/icons-material/Save'
import BusinessIcon from '@mui/icons-material/Business';
import ScheduleIcon from '@mui/icons-material/Schedule';
import RuleIcon from '@mui/icons-material/Rule';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SecurityIcon from '@mui/icons-material/Security';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';

const WEEKDAYS = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

// Initialer Leerer Zustand für Formulare
const initialSalonState: Partial<Salon> = {
    name: '', address: '', phone: '', email: '', websiteUrl: '', logoUrl: '',
    socialMedia: { instagram: '', facebook: '' },
    openingHours: [],
    bookingRules: { cancellationDeadlineHours: 24, bookingLeadTimeMinutes: 60, bookingHorizonDays: 90, sendReminderEmails: true },
    invoiceSettings: { footerText: '' },
    datevSettings: { revenueAccountServices: '8400', revenueAccountProducts: '8400', cashAccount: '1000', cardAccount: '1360', consultantNumber: '', clientNumber: '' },
};
const initialPinState = { currentPassword: '', newPin: '', confirmPin: '' };

export default function GeneralSettingsPage() {
  const { user, token, loading: authLoading, salonId: activeSalonId, selectSalon } = useAuth()
  const router = useRouter()
  const [salonData, setSalonData] = useState<Partial<Salon>>(initialSalonState)
  const [pinData, setPinData] = useState(initialPinState)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' | 'info' }>({ open: false, msg: '', sev: 'success' })
  const [activeTab, setActiveTab] = useState(0)

  // Laden der Salon-Daten
  const loadSalonData = useCallback(async () => {
    if (token) {
      setLoading(true);
      try {
        const { salon } = await getCurrentSalon(token);
        // Stelle sicher, dass alle Felder, auch die neuen, initialisiert werden
        setSalonData(prev => ({
          ...initialSalonState, // Starte mit dem leeren Zustand
          ...prev, // Überschreibe mit ggf. schon vorhandenen Teilen
          ...salon, // Lade die Daten vom Server
          // Stelle sicher, dass verschachtelte Objekte korrekt initialisiert werden
          socialMedia: { ...initialSalonState.socialMedia, ...salon.socialMedia },
          bookingRules: { ...initialSalonState.bookingRules, ...salon.bookingRules },
          invoiceSettings: { ...initialSalonState.invoiceSettings, ...salon.invoiceSettings },
          datevSettings: { ...initialSalonState.datevSettings, ...salon.datevSettings },
          openingHours: salon.openingHours?.length ? salon.openingHours : initialSalonState.openingHours,
        }));
         // Sicherstellen, dass der AuthContext auch die geladene Salon-ID kennt
        if (salon._id !== activeSalonId) {
            selectSalon(salon._id);
        }
      } catch (err) {
        console.error("Fehler beim Laden der Salon-Daten", err);
        setToast({ open: true, msg: 'Salon-Daten konnten nicht geladen werden.', sev: 'error' });
      } finally {
        setLoading(false);
      }
    }
  }, [token, activeSalonId, selectSalon]); // Abhängigkeiten hinzugefügt

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadSalonData();
    } else if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login'); // Oder zur passenden Seite weiterleiten
    }
  }, [user, token, authLoading, router, loadSalonData]); // loadSalonData hinzugefügt

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = event.target;
    const keys = name.split('.'); // Für verschachtelte Objekte wie socialMedia.instagram

    setSalonData(prev => {
      const newData = { ...prev };
      let currentLevel: any = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!currentLevel[keys[i]]) {
          currentLevel[keys[i]] = {}; // Initialisiere verschachteltes Objekt, falls nicht vorhanden
        }
        currentLevel = currentLevel[keys[i]];
      }

      currentLevel[keys[keys.length - 1]] = type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : Number(value)) : value;
      return newData;
    });
  };

   const handlePinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPinData(prev => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleOpeningHoursChange = (weekday: number, field: keyof OpeningHours, value: any) => {
    setSalonData(prev => ({
      ...prev,
      openingHours: (prev.openingHours || []).map(day =>
        day.weekday === weekday ? { ...day, [field]: value } : day
      )
    }));
  };

  const handleSave = async () => {
    if (!token || !salonData._id) return;
    setIsSaving(true);
    try {
      // Filtere leere Strings bei Social Media Links heraus
      const cleanedSocialMedia = { ...salonData.socialMedia };
      if (cleanedSocialMedia.instagram === '') delete cleanedSocialMedia.instagram;
      if (cleanedSocialMedia.facebook === '') delete cleanedSocialMedia.facebook;

      const payload = {
          ...salonData,
          socialMedia: cleanedSocialMedia,
      };
      // Entferne die _id und andere nicht updatebare Felder vor dem Senden
      delete payload._id;
      delete (payload as any).createdAt;
      delete (payload as any).updatedAt;

      await updateSalon(activeSalonId || salonData._id!, payload, token); // Verwende activeSalonId oder die ID aus salonData
      setToast({ open: true, msg: 'Einstellungen erfolgreich gespeichert!', sev: 'success' });
      loadSalonData(); // Daten neu laden, um Konsistenz sicherzustellen
    } catch (err: any) {
      console.error("Fehler beim Speichern", err);
      setToast({ open: true, msg: err.response?.data?.message || 'Fehler beim Speichern.', sev: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePin = async () => {
    if (!token) return;
     if (pinData.newPin.length < 4 || pinData.newPin.length > 6 || !/^\d+$/.test(pinData.newPin)) {
      setToast({ open: true, msg: 'Die PIN muss zwischen 4 und 6 Ziffern lang sein.', sev: 'error' });
      return;
    }
    if (pinData.newPin !== pinData.confirmPin) {
      setToast({ open: true, msg: 'Die PINs stimmen nicht überein.', sev: 'error' });
      return;
    }
    if (!pinData.currentPassword) {
      setToast({ open: true, msg: 'Bitte gib dein Passwort zur Bestätigung ein.', sev: 'error' });
      return;
    }
    setIsSaving(true);
    try {
        await setDashboardPin(pinData.currentPassword, pinData.newPin, token);
        setToast({ open: true, msg: 'Dashboard-PIN erfolgreich gespeichert!', sev: 'success' });
        setPinData(initialPinState); // Formular zurücksetzen
    } catch (err: any) {
        setToast({ open: true, msg: err.response?.data?.message || 'Fehler beim Speichern der PIN.', sev: 'error' });
    } finally {
        setIsSaving(false);
    }
  };

  if (loading || authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[{ label: 'Mein Salon', href: '/admin' }, { label: 'Einstellungen' }]} />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>
          Salon-Einstellungen
        </Typography>
         <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={activeTab === 4 ? handleSavePin : handleSave} // Unterschiedliche Speicherfunktion je nach Tab
            disabled={isSaving || !salonData._id}
        >
            {isSaving ? 'Speichern...' : 'Speichern'}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<BusinessIcon />} iconPosition="start" label="Stammdaten" />
          <Tab icon={<ScheduleIcon />} iconPosition="start" label="Öffnungszeiten" />
          <Tab icon={<RuleIcon />} iconPosition="start" label="Buchungsregeln" />
          <Tab icon={<AttachMoneyIcon />} iconPosition="start" label="Finanzen & DATEV" />
          <Tab icon={<SecurityIcon />} iconPosition="start" label="Sicherheit (PIN)" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: Stammdaten */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}><TextField fullWidth label="Salon-Name" name="name" value={salonData.name || ''} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Logo URL" name="logoUrl" value={salonData.logoUrl || ''} onChange={handleInputChange} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Adresse" name="address" value={salonData.address || ''} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Telefonnummer" name="phone" value={salonData.phone || ''} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="E-Mail" name="email" value={salonData.email || ''} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} md={6}><TextField fullWidth label="Website URL" name="websiteUrl" value={salonData.websiteUrl || ''} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} md={6}></Grid> {/* Platzhalter */}
              <Grid item xs={12} md={6}>
                 <TextField
                    fullWidth
                    label="Instagram URL"
                    name="socialMedia.instagram"
                    value={salonData.socialMedia?.instagram || ''}
                    onChange={handleInputChange}
                    InputProps={{ startAdornment: <InstagramIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                 />
              </Grid>
               <Grid item xs={12} md={6}>
                 <TextField
                    fullWidth
                    label="Facebook URL"
                    name="socialMedia.facebook"
                    value={salonData.socialMedia?.facebook || ''}
                    onChange={handleInputChange}
                    InputProps={{ startAdornment: <FacebookIcon sx={{ mr: 1, color: 'action.active' }} /> }}
                 />
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Öffnungszeiten */}
          {activeTab === 1 && (
            <Stack spacing={2} divider={<Divider />}>
              {(salonData.openingHours || []).sort((a,b) => a.weekday - b.weekday).map(day => (
                <Box key={day.weekday}>
                  <Stack direction={{xs: 'column', sm: 'row'}} alignItems="center" spacing={2} sx={{ p: 1 }}>
                    <Typography fontWeight={600} sx={{ width: {sm: '120px'}, textAlign: {xs: 'left', sm: 'right'} }}>{WEEKDAYS[day.weekday]}</Typography>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={day.isOpen}
                          onChange={(e) => handleOpeningHoursChange(day.weekday, 'isOpen', e.target.checked)}
                        />
                      }
                      label={day.isOpen ? "Geöffnet" : "Geschlossen"}
                      sx={{ mr: 'auto' }}
                    />
                    {day.isOpen && (
                      <>
                        <TextField
                          type="time"
                          label="Von"
                          value={day.open}
                          onChange={(e) => handleOpeningHoursChange(day.weekday, 'open', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          sx={{width: 130}}
                        />
                        <TextField
                          type="time"
                          label="Bis"
                          value={day.close}
                          onChange={(e) => handleOpeningHoursChange(day.weekday, 'close', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                           sx={{width: 130}}
                        />
                      </>
                    )}
                     {!day.isOpen && <Box sx={{ minWidth: 284 }} /> /* Platzhalter */}
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          {/* Tab 2: Buchungsregeln */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth type="number" label="Stornierungsfrist (Stunden)"
                  name="bookingRules.cancellationDeadlineHours"
                  value={salonData.bookingRules?.cancellationDeadlineHours ?? 24} onChange={handleInputChange}
                  InputProps={{ endAdornment: 'Std.', inputProps: { min: 0 } }}
                  helperText="Wie viele Stunden vor dem Termin kann ein Kunde spätestens stornieren?"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth type="number" label="Mindestvorlaufzeit (Minuten)"
                  name="bookingRules.bookingLeadTimeMinutes"
                  value={salonData.bookingRules?.bookingLeadTimeMinutes ?? 60} onChange={handleInputChange}
                  InputProps={{ endAdornment: 'Min.', inputProps: { min: 0 } }}
                  helperText="Wie viele Minuten vor einem freien Slot kann dieser noch gebucht werden?"
                 />
              </Grid>
               <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth type="number" label="Buchungshorizont (Tage)"
                  name="bookingRules.bookingHorizonDays"
                  value={salonData.bookingRules?.bookingHorizonDays ?? 90} onChange={handleInputChange}
                  InputProps={{ endAdornment: 'Tage', inputProps: { min: 1 } }}
                  helperText="Wie viele Tage im Voraus können Kunden maximal buchen?"
                 />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                 <FormControlLabel
                    control={
                        <Switch
                          checked={salonData.bookingRules?.sendReminderEmails ?? true}
                          onChange={handleInputChange}
                          name="bookingRules.sendReminderEmails"
                        />
                    }
                    label="Automatische Terminerinnerungen senden"
                  />
                  <Tooltip title="Sendet 24 Stunden vor dem Termin eine Erinnerungs-E-Mail an den Kunden.">
                     <IconButton size="small"><InfoOutlinedIcon fontSize="small"/></IconButton>
                  </Tooltip>
              </Grid>
            </Grid>
          )}

           {/* Tab 3: Finanzen & DATEV */}
          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}><Typography variant="h6">DATEV-Einstellungen</Typography></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Beraternummer" name="datevSettings.consultantNumber" value={salonData.datevSettings?.consultantNumber || ''} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Mandantennummer" name="datevSettings.clientNumber" value={salonData.datevSettings?.clientNumber || ''} onChange={handleInputChange} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Erlöskonto Dienstleistungen" name="datevSettings.revenueAccountServices" value={salonData.datevSettings?.revenueAccountServices || ''} onChange={handleInputChange} helperText="Standard: 8400 (SKR03)" /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Erlöskonto Produkte" name="datevSettings.revenueAccountProducts" value={salonData.datevSettings?.revenueAccountProducts || ''} onChange={handleInputChange} helperText="Standard: 8400 (SKR03)" /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Kassenkonto" name="datevSettings.cashAccount" value={salonData.datevSettings?.cashAccount || ''} onChange={handleInputChange} helperText="Standard: 1000 (SKR03)" /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Geldtransitkonto (Karte)" name="datevSettings.cardAccount" value={salonData.datevSettings?.cardAccount || ''} onChange={handleInputChange} helperText="Standard: 1360 (SKR03)" /></Grid>
              <Grid item xs={12}><Divider sx={{ my: 2 }} /></Grid>
              <Grid item xs={12}><Typography variant="h6">Rechnungseinstellungen</Typography></Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth multiline rows={3} label="Standard-Fußzeile für Rechnungen"
                  name="invoiceSettings.footerText"
                  value={salonData.invoiceSettings?.footerText || ''} onChange={handleInputChange}
                  helperText="z.B. Bankverbindung, Steuernummer, Grüße etc."
                />
              </Grid>
            </Grid>
          )}

           {/* Tab 4: Sicherheit (PIN) */}
          {activeTab === 4 && (
            <Stack spacing={3} sx={{ maxWidth: 400 }}>
              <Typography color="text.secondary">
                Lege hier eine 4- bis 6-stellige PIN fest, um den Zugriff auf das Dashboard mit Finanzdaten zusätzlich abzusichern.
              </Typography>
              <TextField
                label="Neue PIN" type="password" name="newPin"
                inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                value={pinData.newPin} onChange={handlePinChange}
                />
              <TextField
                label="Neue PIN bestätigen" type="password" name="confirmPin"
                inputProps={{ maxLength: 6, pattern: '[0-9]*' }}
                value={pinData.confirmPin} onChange={handlePinChange}
                />
              <TextField
                label="Aktuelles Login-Passwort (zur Bestätigung)"
                type="password" name="currentPassword"
                value={pinData.currentPassword} onChange={handlePinChange}
               />
               {/* Speicherbutton ist oben */}
            </Stack>
          )}

        </Box>
      </Paper>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.sev} sx={{ width: '100%' }} variant="filled">{toast.msg}</Alert>
      </Snackbar>
    </Container>
  )
}
