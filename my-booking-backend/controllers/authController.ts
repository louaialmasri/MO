import { Request, Response } from 'express'
import { User } from '../models/User'
import jwt from 'jsonwebtoken'

// Geheimschlüssel (am besten aus .env)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey'

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'E-Mail und Passwort erforderlich' })
  }

  try {
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' })
    }

    // ➡ (Optional) Hier würdest du ein sicheres Password Hashing verwenden (bcrypt)
    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' })
    }

    // JWT erzeugen
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '2h' }
    )

    return res.status(200).json({
      success: true,
      message: 'Login erfolgreich',
      token,
      user: {
        email: user.email,
        role: user.role,
      },
    })
  } catch (err) {
    console.error('Login Fehler:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Login' })
  }
}

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'E-Mail und Passwort erforderlich' })
  }

  const exists = await User.findOne({ email })
  if (exists) {
    return res.status(409).json({ success: false, message: 'Benutzer existiert bereits' })
  }

  const role = email === 'admin@booking.com' ? 'admin' : 'user'

  const user = new User({ email, password, role })
  await user.save()

  return res.status(201).json({ success: true, message: 'Registrierung erfolgreich' })
}