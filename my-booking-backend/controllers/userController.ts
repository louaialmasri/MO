import { User } from '../models/User'
import { Request, Response } from 'express'

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select('-password')
    res.json({ users })
  } catch {
    res.status(500).json({ message: 'Fehler beim Laden der Nutzer' })
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
