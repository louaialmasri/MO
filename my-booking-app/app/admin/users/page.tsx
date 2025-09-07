"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Container, Typography, List, ListItem, ListItemText, Button,
  CircularProgress, Box, Paper, Alert, Dialog, DialogTitle, Chip, Snackbar,
  DialogContent, DialogActions, FormGroup, FormControlLabel, Checkbox, IconButton
} from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune'; // Importieren wir das Icon
import { fetchAllUsers, fetchGlobalServices, fetchServices, updateStaffSkills, type Service } from '../../../services/api';

// User-Interface erweitern, um Skills zu beinhalten
interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  skills: string[] | { _id: string }[]; // Kann Array von Strings oder Objekten sein
}

const AdminUsersPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // States für den Skill-Dialog
  const [skillDlgOpen, setSkillDlgOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<User | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (token) {
      const fetchData = async () => {
        try {
          setError('');
          const [usersData, servicesData] = await Promise.all([
            fetchAllUsers(token, 'staff'),
            fetchGlobalServices()
          ]);
          setUsers(usersData);
          setAllServices(servicesData);
        } catch (err: any) {
          console.error('Fehler beim Laden der Daten:', err);
          setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [token]);

  const openSkillDialog = (user: User) => {
    setCurrentStaff(user);
    // Initialisiere die ausgewählten Skills basierend auf den Daten des Users
    const staffSkillIds = new Set(user.skills.map(skill => typeof skill === 'string' ? skill : skill._id));
    setSelectedServices(staffSkillIds);
    setSkillDlgOpen(true);
  };

  const handleSkillToggle = (serviceId: string) => {
    const newSelection = new Set(selectedServices);
    if (newSelection.has(serviceId)) {
      newSelection.delete(serviceId);
    } else {
      newSelection.add(serviceId);
    }
    setSelectedServices(newSelection);
  };

  const handleSaveSkills = async () => {
    if (!currentStaff || !token) return;
    try {
      const skillsArray = Array.from(selectedServices);
      await updateStaffSkills(currentStaff._id, skillsArray, token);
      setUsers(users.map(u =>
        u._id === currentStaff._id
          ? { ...u, skills: skillsArray.map(id => ({ _id: id })) }
          : u
      ));
      setSkillDlgOpen(false);
      setCurrentStaff(null);
      setSuccessMsg('Fähigkeiten erfolgreich gespeichert!');
    } catch (err) {
      console.error('Fehler beim Speichern der Fähigkeiten:', err);
      setError('Fähigkeiten konnten nicht gespeichert werden.');
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Mitarbeiter & Fähigkeiten verwalten
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper>
        <List>
          {users.length > 0 ? (
            users.map((user) => {
              // Skills als Chips anzeigen
              const skillIds = user.skills.map(s => typeof s === 'string' ? s : s._id);
              const skillTitles = allServices.filter(svc => skillIds.includes(svc._id));
              return (
                <ListItem key={user._id} divider alignItems="flex-start">
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary={
                      <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {skillTitles.length > 0
                          ? skillTitles.map(svc => (
                              <Chip key={svc._id} label={svc.title} size="small" />
                            ))
                          : <Typography variant="body2" color="text.secondary">Keine Fähigkeiten zugewiesen</Typography>
                        }
                      </Box>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  <Box sx={{ ml: 2 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<TuneIcon />}
                      onClick={() => openSkillDialog(user)}
                    >
                      Fähigkeiten
                    </Button>
                  </Box>
                </ListItem>
              );
            })
          ) : (
            <ListItem>
              <ListItemText primary="Keine Mitarbeiter gefunden." />
            </ListItem>
          )}
        </List>
      </Paper>

      {/* Dialog zur Verwaltung der Fähigkeiten */}
      <Dialog open={skillDlgOpen} onClose={() => setSkillDlgOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Fähigkeiten für {currentStaff?.firstName} {currentStaff?.lastName}</DialogTitle>
        <DialogContent>
          <FormGroup>
            {allServices.map((service) => (
              <FormControlLabel
                key={service._id}
                control={
                  <Checkbox
                    checked={selectedServices.has(service._id)}
                    onChange={() => handleSkillToggle(service._id)}
                  />
                }
                label={service.title}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkillDlgOpen(false)}>Abbrechen</Button>
          <Button variant="contained" onClick={handleSaveSkills}>Speichern</Button>
        </DialogActions>
      </Dialog>
      {/* Success Snackbar */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={2000}
        onClose={() => setSuccessMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={successMsg}
      />
    </Container>
  );
};

export default AdminUsersPage;