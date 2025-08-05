import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'


export const authOnly = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Token fehlt oder ungültig' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyToken(token)
    // @ts-ignore: wir hängen User an Request
    req.user = decoded
    next()
  } catch {
    return res.status(403).json({ success: false, message: 'Token ungültig oder abgelaufen' })
  }
}

export const adminOnly = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin-Rechte erforderlich' })
  }
  next()
}