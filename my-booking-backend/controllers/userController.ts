import { User } from '../models/User'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const filter: any = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select('-password').populate('skills');
    res.json({ users });
  } catch {
    res.status(500).json({ message: 'Fehler beim Laden der Nutzer' });
  }
}

export const updateUserRole = async (req: Request, res: Response) => {
  const { id } = req.params
  const { role } = req.body

  if (!['user', 'staff', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Ungültige Rolle' })
  }

  try {
    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password')
    res.json({ user })
  } catch {
    res.status(500).json({ message: 'Rollen-Update fehlgeschlagen' })
  }
}

export const createUserManually = async (req: Request, res: Response) => {
  try {
    const { email, password, role, name, address, phone } = req.body

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: 'E-Mail bereits registriert' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({
      email,
      password: hashedPassword,
      role: role || 'user',
      name,
      address,
      phone,
    })

    await newUser.save()
    res.status(201).json({ success: true, user: newUser })
  } catch (err) {
    console.error('Fehler beim manuellen Anlegen:', err)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
}

export const updateUserSkills = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { skills } = req.body // Array von Service-IDs

    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: 'skills muss ein Array sein' })
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !skills.every(mongoose.Types.ObjectId.isValid)) {
      return res.status(400).json({ message: 'Ungültige ID' })
    }

    const user = await User.findByIdAndUpdate(
      id,
      { skills },
      { new: true }
    ).populate('skills')

    if (!user) return res.status(404).json({ message: 'User nicht gefunden' })
    res.json(user)
  } catch (e) {
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Skills' })
  }
}