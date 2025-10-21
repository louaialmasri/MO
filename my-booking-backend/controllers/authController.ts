import { Request, Response } from 'express'
import { User } from '../models/user'
import { generateToken } from '../utils/jwt'
import bcrypt from 'bcrypt'

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string }

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-Mail und Passwort sind erforderlich' })
    }

    const user = await User.findOne({ email }).select('+password')
    if (!user || typeof user.password !== 'string') {
      return res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' })
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      return res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' })
    }

    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    })
    
    // KORREKTUR: Typsicheres Entfernen des Passworts
    const userObject = user.toObject();
    delete (userObject as any).password;

    return res.json({ success: true, token, user: userObject })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Login' })
  }
}

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, address, phone, role } = req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
      return res.status(400).json({ message: 'E-Mail, Passwort, Vor- und Nachname sowie Telefonnummer sind erforderlich' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'E-Mail ist bereits registriert' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      address: address || '',
      phone: phone,
      role: role || 'user',
    });

    await newUser.save();

    // KORREKTUR: Typsicheres Entfernen des Passworts
    const safeUser = { ...newUser.toObject() };
    delete (safeUser as any).password;

    res.status(201).json({ message: 'Benutzer erfolgreich erstellt', user: safeUser });

  } catch (err: any) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Diese E-Mail-Adresse ist bereits vergeben.' });
    }
    // Detailliertere Fehlermeldung bei Validierungsfehlern
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validierungsfehler', details: err.errors });
    }
    return res.status(500).json({ message: 'Serverfehler bei der Registrierung' });
  }
};