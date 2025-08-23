import { Response, NextFunction } from 'express'
import { AuthRequest } from './authMiddleware'
import { User } from '../models/User'

// erweitert AuthRequest um salonId
export interface SalonRequest extends AuthRequest {
  salonId?: string | null
}

// Liest aktiven Salon aus Header (x-salon-id) oder vom Benutzer
export const activeSalon = async (req: SalonRequest, res: Response, next: NextFunction) => {
  try {
    const headerSalonId = req.header('x-salon-id') || null

    // Benutzer laden (brauchen wir für role + salon)
    const uid = req.user?.userId
    const userDoc = uid ? await User.findById(uid).select('role salon') : null
    const role = userDoc?.role || req.user?.role

    if (!role) {
      req.salonId = null
      return next()
    }

    // Admin: darf Salon aus Header setzen (wenn vorhanden), sonst sein eigener/fallback null
    if (role === 'admin') {
      req.salonId = headerSalonId || (userDoc?.salon ? String(userDoc.salon) : null)
      return next()
    }

    // Staff/User: immer an eigenen Salon binden; Header ignorieren
    if (role === 'staff' || role === 'user') {
      req.salonId = userDoc?.salon ? String(userDoc.salon) : null
      return next()
    }

    req.salonId = null
    next()
  } catch (e) {
    console.error('activeSalon error:', e)
    req.salonId = null
    next()
  }
}
