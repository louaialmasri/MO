import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// Idealerweise aus .env holen
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    email: string
    role: 'user' | 'admin'
  }
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Kein Token übergeben' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      role: 'user' | 'admin'
    }

    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Ungültiger Token' })
  }
}
