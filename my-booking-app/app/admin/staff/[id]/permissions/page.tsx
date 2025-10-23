'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../../../../context/AuthContext'
import {
  fetchAllUsers,
  updateStaffPermissions,
  type User,
} from '../../../../../services/api'
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Button,
  Snackbar,
  Alert,
  Stack,
  Divider,
} from '@mui/material'
// KORREKTUR: Relativer Pfad
import AdminBreadcrumbs from '../../../../../components/AdminBreadcrumbs'
import SaveIcon from '@mui/icons-material/Save'

// Definiere hier die verfügbaren Berechtigungen
// WICHTIG: Die Schlüssel müssen mit denen übereinstimmen, die in der checkPermission Middleware verwendet werden!
const AVAILABLE_PERMISSIONS: Record<string, string> = {
  'dashboard-access': 'Zugriff auf Dashboard (Umsätze)',
  'cash-register-access': 'Zugriff auf Kasse / Sofortverkauf',
  'cash-closing-access': 'Zugriff auf Kassenabschluss',
  // Füge hier bei Bedarf weitere Berechtigungen hinzu
  // 'manage-products': 'Produkte verwalten',
}

export default function StaffPermissionsPage() {
  const { user: adminUser, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const staffId = params.id as string // ID aus der URL holen

  const [staffMember, setStaffMember] = useState<User | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ open: boolean; msg: string; sev: 'success' | 'error' }>({ open: false, msg: '', sev: 'success' })

  // Lade die Daten des spezifischen Mitarbeiters
  useEffect(() => {
    // ... (Logik bleibt gleich) ...
    if (authLoading || !token || !staffId) return;

    // Sicherstellen, dass der aktuelle User ein Admin ist
    if (adminUser?.role !== 'admin') {
      router.replace('/admin'); // Oder eine Fehlerseite
      return;
    }

    const loadStaffMember = async () => {
      setLoading(true);
      try {
        // Wir verwenden fetchAllUsers, da wir keine spezifische "get by id" haben,
        // aber filtern dann den gewünschten User heraus.
        // Alternativ: Eine neue API-Route /api/staff/:id erstellen.
        const allStaff = await fetchAllUsers(token, 'staff'); // Nur Staff-User laden
        const targetStaff = (allStaff as User[]).find(u => u._id === staffId);

        if (targetStaff) {
          setStaffMember(targetStaff);
          // Initialisiere die ausgewählten Berechtigungen basierend auf den Daten des Mitarbeiters
          setSelectedPermissions(new Set(targetStaff.permissions || []));
        } else {
          setToast({ open: true, msg: 'Mitarbeiter nicht gefunden.', sev: 'error' });
          // Optional: Zurück zur Übersicht oder Fehlerseite navigieren
        }
      } catch (err) {
        console.error("Fehler beim Laden des Mitarbeiters:", err);
        setToast({ open: true, msg: 'Mitarbeiterdaten konnten nicht geladen werden.', sev: 'error' });
      } finally {
        setLoading(false);
      }
    };

    loadStaffMember();
  }, [staffId, token, authLoading, adminUser, router]);


  const handlePermissionChange = (permissionKey: string, isChecked: boolean) => {
    // ... (Logik bleibt gleich) ...
     setSelectedPermissions(prev => {
      const next = new Set(prev);
      if (isChecked) {
        next.add(permissionKey);
      } else {
        next.delete(permissionKey);
      }
      return next;
    });
  };

  const handleSave = async () => {
    // ... (Logik bleibt gleich) ...
    if (!token || !staffMember) return;

    setIsSaving(true);
    try {
      const permissionsArray = Array.from(selectedPermissions);
      const updatedUser = await updateStaffPermissions(staffMember._id, permissionsArray, token);
      // Optional: Update local state if needed, though usually re-fetching is safer
      setStaffMember(updatedUser);
      setSelectedPermissions(new Set(updatedUser.permissions || []));
      setToast({ open: true, msg: 'Berechtigungen erfolgreich gespeichert!', sev: 'success' });
    } catch (err: any) {
      console.error("Fehler beim Speichern der Berechtigungen:", err);
      setToast({ open: true, msg: err.response?.data?.message || 'Speichern fehlgeschlagen.', sev: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // ... (Restlicher Code bleibt gleich, inkl. JSX) ...
  if (loading || authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  if (!staffMember) {
    // Falls der Mitarbeiter nicht gefunden wurde (Fehlermeldung wird schon angezeigt)
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
             <AdminBreadcrumbs items={[
                { label: 'Mein Salon', href: '/admin' },
                { label: 'Katalog', href: '/admin/catalog'},
                { label: 'Berechtigungen' }
             ]} />
             <Alert severity="error">Mitarbeiter nicht gefunden.</Alert>
             <Button onClick={() => router.back()} sx={{mt: 2}}>Zurück</Button>
        </Container>
    );
  }

   // Verhindere das Bearbeiten von Nicht-Staff-Benutzern (Sicherheitsnetz)
   if (staffMember.role !== 'staff') {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                 <AdminBreadcrumbs items={[
                    { label: 'Mein Salon', href: '/admin' },
                    { label: 'Katalog', href: '/admin/catalog'},
                    { label: 'Berechtigungen' }
                 ]} />
                 <Alert severity="warning">Berechtigungen können nur für Mitarbeiter (Staff) festgelegt werden.</Alert>
                 <Button onClick={() => router.back()} sx={{mt: 2}}>Zurück</Button>
            </Container>
        );
    }


  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <AdminBreadcrumbs items={[
        { label: 'Mein Salon', href: '/admin' },
        { label: 'Katalog', href: '/admin/catalog'},
        { label: `${staffMember.firstName} ${staffMember.lastName}`, }, // Dynamischer Breadcrumb
        { label: 'Berechtigungen' }
      ]} />

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
            <Typography variant="h4" fontWeight={800}>
                Berechtigungen verwalten
            </Typography>
            <Typography variant="h6" color="text.secondary" fontWeight={500}>
                {staffMember.firstName} {staffMember.lastName}
            </Typography>
        </Box>
        <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
        >
            {isSaving ? 'Speichern...' : 'Speichern'}
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Wähle aus, auf welche zusätzlichen Bereiche dieser Mitarbeiter zugreifen darf. Admins haben immer vollen Zugriff.
        </Typography>
        <Divider sx={{ mb: 3 }}/>
        <FormGroup>
          {Object.entries(AVAILABLE_PERMISSIONS).map(([key, label]) => (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  checked={selectedPermissions.has(key)}
                  onChange={(e) => handlePermissionChange(key, e.target.checked)}
                />
              }
              label={label}
              sx={{ mb: 1 }}
            />
          ))}
        </FormGroup>
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={toast.sev} sx={{ width: '100%' }} variant="filled" onClose={() => setToast(p => ({ ...p, open: false }))}>
          {toast.msg}
        </Alert>
      </Snackbar>
    </Container>
  )
}

