import { User } from '../models/User'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Booking } from '../models/Booking'

export const getAllUsers = async (req: any, res: Response) => {
  try {
    const q: any = {}
    if (req.query.role) q.role = req.query.role
    if (req.salonId) q.salon = req.salonId
    const users = await User.find(q).populate('skills')
    res.json({ success: true, users })
  } catch (e) {
    res.status(500).json({ success:false, message:'Fehler beim Laden der Nutzer' })
  }
}

export const updateUserRole = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  const { id } = req.params
  const { role } = req.body

  if (!['user', 'staff', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Ungültige Rolle' })
  }

  try {
    // When promoting to staff, attach the current active salon; when demoting, remove salon
    const updateData: any = { role }
    if (role === 'staff') {
      if (req.salonId) updateData.salon = req.salonId
    } else {
      updateData.salon = null
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password')
    res.json({ user })
  } catch (err) {
    console.error('Rollen-Update fehlgeschlagen:', err)
    res.status(500).json({ message: 'Rollen-Update fehlgeschlagen' })
  }
}

export const createUserManually = async (req: Request, res: Response) => {
  try {
    const { email, password, role, name, address, phone, salonId } = req.body

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
      salon: salonId || null,
    })

    await newUser.save()
    res.status(201).json({ success: true, user: newUser })
  } catch (err) {
    console.error('Fehler beim manuellen Anlegen:', err)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
}

export const deleteStaff = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success:false, message:'Ungültige ID' })
    const staff = await User.findById(id).select('role salon')
    if (!staff) return res.status(404).json({ success:false, message:'User nicht gefunden' })
    if (staff.role !== 'staff') return res.status(400).json({ success:false, message:'Nur Mitarbeiter können gelöscht werden' })
    // darf nur im aktiven Salon gelöscht werden
    if (req.salonId && String(staff.salon) !== String(req.salonId)) {
      return res.status(403).json({ success:false, message:'Falscher Salon' })
    }
    const now = new Date()
    const future = await Booking.countDocuments({ staff: staff._id, dateTime: { $gte: now } })
    if (future > 0) {
      return res.status(409).json({
        success:false,
        message:'Mitarbeiter hat noch zukünftige Termine. Bitte umbuchen/stornieren.',
        details:{ futureBookings: future }
      })
    }
    // Statt den User-Datensatz zu löschen, entfernen wir nur die Salon-Zuordnung und setzen die Rolle zurück
    await User.findByIdAndUpdate(staff._id, { role: 'user', salon: null })
    return res.json({ success:true, message:'Mitarbeiter aus diesem Salon entfernt' })
  } catch (e) {
    res.status(500).json({ success:false, message:'Serverfehler beim Löschen' })
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