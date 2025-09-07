"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  CircularProgress,
  Box,
  Paper,
  Alert
} from '@mui/material';
import api from '../../../services/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setError('');
        const res = await api.get('/users?role=staff');
        
        // Korrektur: Wir greifen auf res.data.users zu
        if (res.data && Array.isArray(res.data.users)) {
          setUsers(res.data.users);
        } else {
          console.error('API did not return a user array:', res.data);
          setError('Mitarbeiterdaten konnten nicht korrekt geladen werden.');
          setUsers([]); 
        }
      } catch (err: any) {
        console.error('Fehler beim Laden der Mitarbeiter:', err);
        setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  if (loading) return <CircularProgress />;

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Mitarbeiter verwalten
      </Typography>
      
      {error && <Alert severity="error">{error}</Alert>}

      <Paper>
        <List>
          {users.length > 0 ? (
            users.map((user) => (
              <ListItem key={user._id} divider>
                <ListItemText
                  primary={`${user.firstName} ${user.lastName}`}
                  secondary={user.email}
                />
                <Box sx={{ ml: 2 }}>
                  <Link href={`/admin/staff/${user._id}/skills`} passHref>
                    <Button variant="outlined" size="small">
                      Fähigkeiten verwalten
                    </Button>
                  </Link>
                </Box>
              </ListItem>
            ))
          ) : (
            <ListItem>
              <ListItemText primary="Keine Mitarbeiter für diesen Salon gefunden." />
            </ListItem>
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default AdminUsersPage;