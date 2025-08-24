import { Response } from 'express'
import mongoose, { Types } from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Salon } from '../models/Salon'
import { User } from '../models/User'
import { Service } from '../models/Service'
import { Booking } from '../models/Booking'
import { Availability } from '../models/Availability'

export const getMySalons = async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
  const salons = await Salon.find({ /* optional: owner: req.user.userId */ }).sort({ name: 1 })
  res.json({ success:true, salons })
}

export const createSalon = async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
  const { name, logoUrl } = req.body
  const salon = await Salon.create({ name, logoUrl /* , owner: req.user.userId */ })
  res.status(201).json({ success:true, salon })
}

export const deleteSalon = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success:false, message:'Nur Admin' })
    }
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success:false, message:'Ungültige ID' })
    }

    const salon = await Salon.findById(id)
    if (!salon) return res.status(404).json({ success:false, message:'Salon nicht gefunden' })

    const salonId = new Types.ObjectId(id)

    // 1) Direkte Referenzen
    const [userCount, serviceCount] = await Promise.all([
      User.countDocuments({ salon: salonId }),
      Service.countDocuments({ salon: salonId }),
    ])

    // 2) Bookings & Availability über staff.salon (Join)
    const [{ count: bookingCount } = { count: 0 }] = await Booking.aggregate([
      { $lookup: { from: 'users', localField: 'staff', foreignField: '_id', as: 'staffDoc' } },
      { $unwind: '$staffDoc' },
      { $match: { 'staffDoc.salon': salonId } },
      { $count: 'count' },
    ])

    const [{ count: availCount } = { count: 0 }] = await Availability.aggregate([
      { $lookup: { from: 'users', localField: 'staff', foreignField: '_id', as: 'staffDoc' } },
      { $unwind: '$staffDoc' },
      { $match: { 'staffDoc.salon': salonId } },
      { $count: 'count' },
    ])

    if (userCount > 0 || serviceCount > 0 || bookingCount > 0 || availCount > 0) {
      return res.status(409).json({
        success:false,
        message:'Salon kann nicht gelöscht werden. Entferne zuerst Mitarbeiter, Services, Buchungen und Abwesenheiten.',
        details: { userCount, serviceCount, bookingCount, availCount }
      })
    }

    await Salon.findByIdAndDelete(id)
    return res.json({ success:true, message:'Salon gelöscht' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Serverfehler beim Löschen' })
  }
}

export const migrateDefaultSalon = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success:false, message:'Nur Admin' })
    }

    // 1) "Mein Salon" holen/erstellen (idempotent)
    let salon = await Salon.findOne({ name: 'Mein Salon' })
    if (!salon) {
      salon = await Salon.create({ name: 'Mein Salon' })
    }

    // 2) Alle User & Services ohne salon -> auf "Mein Salon" setzen
    const userFilter = { $or: [{ salon: { $exists: false } }, { salon: null }] }
    const svcFilter  = { $or: [{ salon: { $exists: false } }, { salon: null }] }

    const [uRes, sRes] = await Promise.all([
      User.updateMany(userFilter, { $set: { salon: salon._id } }),
      Service.updateMany(svcFilter, { $set: { salon: salon._id } }),
    ])

    // 3) Admin selbst bekommt diesen Salon als Default, falls er keinen hat
    await User.updateOne(
      { _id: req.user.userId, $or: [{ salon: { $exists: false } }, { salon: null }] },
      { $set: { salon: salon._id } }
    )

    return res.json({
      success: true,
      salon,
      updated: { users: uRes.modifiedCount, services: sRes.modifiedCount }
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Migration fehlgeschlagen' })
  }
}