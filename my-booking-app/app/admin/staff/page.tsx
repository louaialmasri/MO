"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Button,
  CircularProgress,
  ListItemButton
} from '@mui/material';
import api  from '../../../services/api';

interface Service {
  id: number;
  name: string;
}

interface Staff {
  id: number;
  firstName: string;
  lastName: string;
  services: Service[];
}

const StaffSkillsPage = () => {
  const params = useParams();
  const staffId = params.staffId as string;

  const [staff, setStaff] = useState<Staff | null>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (staffId) {
      const fetchStaffAndServices = async () => {
        try {
          const [staffRes, servicesRes] = await Promise.all([
            api.get(`/users/${staffId}`),
            api.get('/services')
          ]);
          setStaff(staffRes.data);
          setAllServices(servicesRes.data);
          setSelectedServices(staffRes.data.services.map((s: Service) => s.id));
        } catch (error) {
          console.error('Fehler beim Laden der Daten:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchStaffAndServices();
    }
  }, [staffId]);

  const handleToggle = (serviceId: number) => {
    const currentIndex = selectedServices.indexOf(serviceId);
    const newChecked = [...selectedServices];

    if (currentIndex === -1) {
      newChecked.push(serviceId);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setSelectedServices(newChecked);
  };

  const handleSave = async () => {
    try {
        // Zuerst alle bestehenden Zuweisungen entfernen
        await Promise.all(staff?.services.map(s => api.delete(`/staff/${staffId}/services/${s.id}`)) || []);
        // Dann die neuen Zuweisungen hinzufügen
        await Promise.all(selectedServices.map(serviceId => api.post(`/staff/${staffId}/services`, { serviceId })));
        alert('Fähigkeiten erfolgreich gespeichert!');
    } catch (error) {
        console.error('Fehler beim Speichern der Fähigkeiten:', error);
        alert('Fehler beim Speichern der Fähigkeiten.');
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Fähigkeiten für {staff?.firstName} {staff?.lastName}
      </Typography>
      <List>
        {allServices.map((service) => (
          <ListItem key={service.id} dense>
            <ListItemButton onClick={() => handleToggle(service.id)}>
              <Checkbox
                edge="start"
                checked={selectedServices.indexOf(service.id) !== -1}
                tabIndex={-1}
                disableRipple
              />
              <ListItemText primary={service.name} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Button variant="contained" color="primary" onClick={handleSave}>
        Speichern
      </Button>
    </Container>
  );
};

export default StaffSkillsPage;