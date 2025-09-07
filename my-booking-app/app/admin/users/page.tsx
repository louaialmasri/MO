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
        
        // --- START DER KORREKTUR ---
        let userList: User[] = [];
        
        // Fall 1: Die API sendet ein Objekt { users: [...] }
        if (res.data && Array.isArray(res.data.users)) {
          userList = res.data.users;
        } 
        // Fall 2: Die API sendet direkt ein Array [...]
        else if (Array.isArray(res.data)) {
          userList = res.data;
        } 
        // Fall 3: Unerwartete Antwort
        else {
          console.error('Unerwartetes API-Antwortformat:', res.data);
          setError('Mitarbeiterdaten konnten nicht korrekt geladen werden.');
        }
        
        setUsers(userList);
        // --- ENDE DER KORREKTUR ---

      } catch (err: any) {
        console.error('Fehler beim Laden der Mitarbeiter:', err);
        setError(err.message || 'Ein unbekannter Fehler ist aufgetreten.');
        setUsers([]); // Sicherstellen, dass users ein Array bleibt
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
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
            !error && (
              <ListItem>
                <ListItemText primary="Keine Mitarbeiter für diesen Salon gefunden." />
              </ListItem>
            )
          )}
        </List>
      </Paper>
    </Container>
  );
};

export default AdminUsersPage;