import { User } from '../models/User'
import { StaffSalon } from '../models/StaffSalon'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Booking } from '../models/Booking'

export const getAllUsers = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { role } = req.query as { role?: string };
    const sid = req.salonId;

    // Nur Admins dürfen den Salon-Filter umgehen
    if (req.user?.role === 'admin' && (role === 'staff' || role === 'user')) {
      const users = await User.find({ role }).populate('skills').lean();
      return res.json({ success: true, users });
    }

    // Für alle anderen (Staff, etc.) oder wenn kein spezieller Rollen-Filter gesetzt ist:
    if (!sid) return res.json({ success: true, users: [] });

    const q: any = { salon: sid };
    if (role) q.role = role;
    const users = await User.find(q).populate('skills').lean();
    return res.json({ success: true, users });

  } catch (e) {
    console.error('getAllUsers error', e);
    return res.status(500).json({ success: false, message: 'Fehler beim Laden der Nutzer' });
  }
};

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

export const createUserManually = async (req: Request & { salonId?: string }, res: Response) => {
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
      salon: req.salonId ?? null, // <-- Patch: Salon aus Middleware!
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

    // tatsächliche Löschung des Dokuments (statt nur Demote)
    await User.findByIdAndDelete(staff._id)

    return res.json({ success:true, message:'Mitarbeiter gelöscht' })
  } catch (e) {
    console.error('Fehler beim Löschen des Mitarbeiters:', e)
    res.status(500).json({ success:false, message:'Serverfehler beim Löschen' })
  }
}

export const deleteUserById = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success:false, message:'Ungültige ID' })

    const user = await User.findById(id).select('role salon')
    if (!user) return res.status(404).json({ success:false, message:'User nicht gefunden' })

    // nur innerhalb des aktiven Salons erlauben
    if (req.salonId && user.salon && String(user.salon) !== String(req.salonId)) {
      return res.status(403).json({ success:false, message:'Nicht autorisiert (Salon)' })
    }

    // Verhindern, falls der User noch zukünftige Buchungen hat
    const now = new Date()
    const futureCount = await Booking.countDocuments({
      $or: [{ user: user._id }, { staff: user._id }],
      dateTime: { $gte: now }
    })
    if (futureCount > 0) {
      return res.status(409).json({ success:false, message:'User hat noch zukünftige Termine', details:{ future: futureCount } })
    }

    await User.findByIdAndDelete(id)
    return res.json({ success:true, message:'User gelöscht' })
  } catch (e:any) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Fehler beim Löschen' })
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

export const getOrCreateWalkInCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const walkInEmail = 'laufkunde@shop.local';
    let walkInCustomer = await User.findOne({ email: walkInEmail });

    if (!walkInCustomer) {
      walkInCustomer = await User.create({
        email: walkInEmail,
        firstName: 'Laufkunde',
        lastName: '',
        role: 'user',
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
      });
    } else if (walkInCustomer.lastName === '(Bar)') {
      walkInCustomer.lastName = '';
      await walkInCustomer.save();
    }
    
    res.json(walkInCustomer);
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Abrufen des Laufkunden-Kontos' });
  }
};