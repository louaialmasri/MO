import { NextFunction, Response } from 'express'
import { AuthRequest } from './authMiddleware'

export const verifyStaff = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === 'staff') {
    next()
  } else {
    res.status(403).json({ success: false, message: 'Zugriff nur für Mitarbeiter erlaubt' })
  }
}
