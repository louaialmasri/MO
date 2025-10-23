'use client'
// KORREKTUR: Relativen Pfad verwenden
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Box, CircularProgress } from '@mui/material'; // Für Ladeanzeige

// NEU: Props erweitern
interface ProtectedRouteProps {
  children: React.ReactNode;
  role?: 'admin' | 'staff' | 'user'; // Optionale Rollenprüfung (bestehend)
  permission?: string; // NEU: Optionale Berechtigungsprüfung
  redirectTo?: string; // Optionale Weiterleitungs-URL
}

export default function ProtectedRoute({ children, role, permission, redirectTo = '/login' }: ProtectedRouteProps) {
  const { user, loading, hasPermission } = useAuth(); // NEU: hasPermission aus dem Kontext holen
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return; // Warten, bis der Auth-Status geladen ist
    }

    let isAuthorized = false;

    if (user) {
      // Standard: Benutzer ist eingeloggt
      isAuthorized = true;

      // Zusätzliche Rollenprüfung, falls 'role' angegeben ist
      if (role && user.role !== role) {
          // Spezifischer Fall: Admin darf alles sehen, was für Staff erlaubt ist
          if (!(role === 'staff' && user.role === 'admin')) {
              isAuthorized = false;
          }
      }


      // NEU: Zusätzliche Berechtigungsprüfung, falls 'permission' angegeben ist
      if (permission && !hasPermission(permission)) {
        isAuthorized = false;
      }
    }

    // Wenn nicht autorisiert (entweder nicht eingeloggt oder Rolle/Permission passt nicht), weiterleiten
    if (!isAuthorized) {
      router.push(redirectTo);
    }
  }, [user, loading, role, permission, hasPermission, router, redirectTo]); // NEU: permission, hasPermission, redirectTo als Abhängigkeiten

  // Während des Ladens oder wenn nicht autorisiert (Weiterleitung läuft), nichts anzeigen
  if (loading || !user) {
     return (
       <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
         <CircularProgress />
       </Box>
     );
  }
   // NEU: Zusätzliche Prüfung, ob die Berechtigungen passen, bevor Kinder gerendert werden
   if (role && user.role !== role && !(role === 'staff' && user.role === 'admin')) {
       return null; // Wird eh weitergeleitet
   }
   if (permission && !hasPermission(permission)) {
       return null; // Wird eh weitergeleitet
   }

  // Wenn alles passt, die Kinder rendern
  return <>{children}</>;
}
