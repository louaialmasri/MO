import { Response, NextFunction } from 'express'
import { AuthRequest } from './authMiddleware'

export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // DEBUG: Logge den Benutzer, der geprüft wird
  console.log('Verifying admin access for user:', req.user);

  if (req.user?.role !== 'admin') {
    // Wenn kein Admin, logge den Grund und sende Fehler
    console.error(`Access denied: User role is "${req.user?.role}", required "admin".`);
    return res.status(403).json({ success: false, message: 'Nur für Admins erlaubt' })
  }
  // Wenn Admin, logge Erfolg und fahre fort
  console.log('Admin access granted.');
  next()
}
