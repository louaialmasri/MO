import { Request, Response } from 'express'
import { users, getNextUserId } from '../models/user'
import { generateToken } from '../utils/jwt'

export const register = (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'E-Mail und Passwort erforderlich' })
  }

  const exists = users.find(u => u.email === email)
  if (exists) {
    return res.status(409).json({ success: false, message: 'Benutzer existiert bereits' })
  }

  const role = email === 'admin@booking.com' ? 'admin' : 'user'

  users.push({
    id: getNextUserId(),
    email,
    password,
    role
  })

  return res.status(201).json({ success: true, message: 'Registrierung erfolgreich' })
}

export const login = (req: Request, res: Response) => {
    const { email, password } = req.body
  
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-Mail und Passwort erforderlich' })
    }
  
    const user = users.find(u => u.email === email && u.password === password)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' })
    }
  
    const token = generateToken({ email: user.email, role: user.role })
  
    return res.status(200).json({
      success: true,
      message: 'Login erfolgreich',
      token,
      user: {
        email: user.email,
        role: user.role
      }
    })
  }
  