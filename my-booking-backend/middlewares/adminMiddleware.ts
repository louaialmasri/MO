import { Response, NextFunction } from 'express'
import { AuthRequest } from './authMiddleware'

export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Nur für Admins erlaubt' })
  }
  next()
}
