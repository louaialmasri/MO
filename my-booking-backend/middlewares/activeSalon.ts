import { Response, NextFunction } from 'express'
import { AuthRequest } from './authMiddleware'
import { User } from '../models/user'

export interface SalonRequest extends AuthRequest {
  salonId?: string | null
}

export const activeSalon = async (req: SalonRequest, res: Response, next: NextFunction) => {
  try {
    const headerSalonId = req.header('x-salon-id') || null

    // Fall 1: Nicht eingeloggt oder ein normaler Kunde.
    // Der Header hat immer Priorität, da Kunden an keinen Salon gebunden sind.
    if (!req.user || req.user.role === 'user') {
      req.salonId = headerSalonId
      return next()
    }

    // Fall 2: Eingeloggter Admin oder Mitarbeiter.
    const userDoc = await User.findById(req.user.userId).select('role salon')
    if (!userDoc) {
      // Falls der Benutzer aus irgendeinem Grund nicht in der DB ist, als Gast behandeln.
      req.salonId = headerSalonId
      return next()
    }

    const role = userDoc.role

    if (role === 'admin') {
      // Admin darf per Header den aktiven Salon wählen;
      // ansonsten wird der im Profil hinterlegte Salon als Fallback genutzt.
      req.salonId = headerSalonId || (userDoc.salon ? String(userDoc.salon) : null)
      return next()
    }

    if (role === 'staff') {
      // Mitarbeiter werden IMMER auf ihren eigenen Salon festgenagelt.
      // Der Header wird für sie ignoriert, um sicherzustellen, dass sie nur im eigenen Salon agieren.
      req.salonId = userDoc.salon ? String(userDoc.salon) : null
      return next()
    }

    // Fallback für unerwartete Fälle.
    req.salonId = headerSalonId
    next()
  } catch (e) {
    console.error('activeSalon middleware error:', e)
    // Sicherer Fallback, falls die DB-Abfrage fehlschlägt.
    req.salonId = req.header('x-salon-id') || null
    next()
  }
}

