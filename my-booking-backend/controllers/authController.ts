import { Request, Response } from 'express'
import { User } from '../models/User'
import { generateToken } from '../utils/jwt'
import bcrypt from 'bcrypt'



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

    // ➡ Hier würdest du ein sicheres Password Hashing verwenden (bcrypt)
    if (!await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ success: false, message: 'Ungültige Anmeldedaten' })
    }

    // JWT erzeugen
    const token = generateToken(
      { userId: user._id, email: user.email, role: user.role })

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
  const { email, password, name, address, phone, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'E-Mail und Passwort sind erforderlich' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ message: 'E-Mail ist bereits registriert' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = new User({
    email,
    password: hashedPassword,
    name: name || '',
    address: address || '',
    phone: phone || '',
    role: role || 'user', // Default ist 'user'
  });

  await newUser.save();

  res.status(201).json({ message: 'Benutzer erfolgreich erstellt', user: newUser });
};
