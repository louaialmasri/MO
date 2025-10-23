import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware'; // Stellt sicher, dass req.user existiert
import { User } from '../models/User'; // Importieren des User-Modells für DB-Abfrage

/**
 * Erzeugt eine Middleware-Funktion, die prüft, ob der eingeloggte Benutzer
 * eine bestimmte Berechtigung hat. Admins haben immer Zugriff.
 * Staff-Benutzer benötigen die explizite Berechtigung im 'permissions'-Array.
 *
 * @param requiredPermission Die Zeichenkette der erforderlichen Berechtigung (z.B. 'dashboard-access').
 * @returns Eine Express Middleware-Funktion.
 */
export const checkPermission = (requiredPermission: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 1. Prüfen, ob überhaupt ein Benutzer eingeloggt ist (sollte durch verifyToken sichergestellt sein)
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert.' });
    }

    const { userId, role } = req.user;

    // 2. Admins haben immer Zugriff
    if (role === 'admin') {
      return next(); // Zugriff gewährt
    }

    // 3. Normale Benutzer ('user') haben keinen Zugriff auf Routen, die diese Middleware verwenden
    if (role !== 'staff') {
      return res.status(403).json({ success: false, message: 'Zugriff verweigert.' });
    }

    // 4. Staff-Benutzer: Berechtigungen aus der Datenbank laden und prüfen
    try {
      // WICHTIG: Erneut aus der DB laden, um sicherzustellen, dass wir die `permissions` haben.
      // Das User-Objekt aus `verifyToken` enthält sie möglicherweise nicht.
      const staffUser = await User.findById(userId).select('permissions').lean(); // Nur 'permissions' laden

      if (!staffUser) {
        // Sollte nicht passieren, wenn verifyToken funktioniert hat, aber sicher ist sicher.
        return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden.' });
      }

      // Prüfen, ob die erforderliche Berechtigung im Array vorhanden ist
      if (staffUser.permissions && staffUser.permissions.includes(requiredPermission)) {
        return next(); // Zugriff gewährt
      } else {
        return res.status(403).json({ success: false, message: 'Fehlende Berechtigung.' });
      }
    } catch (error) {
      console.error("Fehler beim Prüfen der Berechtigungen:", error);
      return res.status(500).json({ success: false, message: 'Serverfehler bei der Berechtigungsprüfung.' });
    }
  };
};

// Beispiel für spezifische Berechtigungs-Middlewares (optional, aber praktisch)
export const canAccessDashboard = checkPermission('dashboard-access');
export const canAccessCashRegister = checkPermission('cash-register-access');
// Füge hier weitere hinzu, wenn nötig...
