import { Response, NextFunction } from 'express'
import { AuthRequest } from './authMiddleware'
import { User } from '../models/User'

export interface SalonRequest extends AuthRequest {
  salonId?: string | null
}

export const activeSalon = async (req: SalonRequest, res: Response, next: NextFunction) => {
  try {
    const headerSalonId = req.header('x-salon-id') || null

    // 1) Kein Login? -> trotzdem per Header scopen (z.B. öffentliche /services-Liste)
    if (!req.user) {
      req.salonId = headerSalonId
      return next()
    }

    // 2) Eingeloggt: Rolle ermitteln
    const userDoc = await User.findById(req.user.userId).select('role salon')
    const role = userDoc?.role || req.user.role

    if (role === 'admin') {
      // Admin darf per Header den aktiven Salon wählen; sonst eigener Salon (falls gesetzt)
      req.salonId = headerSalonId || (userDoc?.salon ? String(userDoc.salon) : null)
      return next()
    }

    if (role === 'staff' || role === 'user') {
      // Staff/User werden IMMER auf den eigenen Salon festgenagelt (Header wird ignoriert)
      req.salonId = userDoc?.salon ? String(userDoc.salon) : null
      return next()
    }

    // Fallback
    req.salonId = headerSalonId || null
    next()
  } catch (e) {
    console.error('activeSalon error:', e)
    const headerSalonId = req.header('x-salon-id') || null
    req.salonId = headerSalonId || null
    next()
  }
}
