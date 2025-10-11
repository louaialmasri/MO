import { Response } from 'express'
import mongoose, { Types } from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Salon } from '../models/Salon'
import { User } from '../models/User'
import { Service } from '../models/Service'
import { Booking } from '../models/Booking'
import { Availability } from '../models/Availability'
import { ServiceSalon } from '../models/ServiceSalon'
import { StaffSalon } from '../models/StaffSalon'
import { SalonRequest } from '../middlewares/activeSalon'

export const getMySalons = async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
  const salons = await Salon.find({ /* optional: owner: req.user.userId */ }).sort({ name: 1 })
  res.json({ success:true, salons })
}

export const getCurrentSalon = async (req: SalonRequest, res: Response) => {
    try {
        const salon = await Salon.findById(req.salonId);
        if (!salon) {
            return res.status(404).json({ message: 'Aktiver Salon nicht gefunden.' });
        }
        res.json({ success: true, salon });
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler' });
    }
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

export const listSalonGuards = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success:false, message:'Nur Admin' })
    }

    const salons = await Salon.find({}).lean()
    const total = salons.length
    const now = new Date()

    // Alle Counts in einem Rutsch je Salon
    const salonIds = salons.map(s => new Types.ObjectId(String(s._id)))

    const [staffCounts, serviceCounts, futureBookingCounts, availabilityCounts] = await Promise.all([
      StaffSalon.aggregate([
        { $match: { salon: { $in: salonIds }, active: true } },
        { $group: { _id: '$salon', cnt: { $sum: 1 } } }
      ]),
      ServiceSalon.aggregate([
        { $match: { salon: { $in: salonIds }, active: true } },
        { $group: { _id: '$salon', cnt: { $sum: 1 } } }
      ]),
      // zukünftige Buchungen zählen (über Staff)
      Booking.aggregate([
        { $match: { dateTime: { $gte: now } } },
        { $lookup: { from: 'staffsalons', localField: 'staff', foreignField: 'staff', as: 'ss' } },
        { $unwind: '$ss' },
        { $match: { 'ss.active': true, 'ss.salon': { $in: salonIds } } },
        { $group: { _id: '$ss.salon', cnt: { $sum: 1 } } }
      ]),
      // Availability pro Salon (falls dein Modell salon speichert)
      Availability.aggregate([
        { $match: { salon: { $in: salonIds } } },
        { $group: { _id: '$salon', cnt: { $sum: 1 } } }
      ]),
    ])

    const idx = (arr: any[]) => Object.fromEntries(arr.map(r => [String(r._id), r.cnt]))
    const staffBy = idx(staffCounts)
    const svcBy = idx(serviceCounts)
    const bookBy = idx(futureBookingCounts)
    const avBy = idx(availabilityCounts)

    const result = salons.map(s => {
      const id = String(s._id)
      const counts = {
        staff: staffBy[id] || 0,
        services: svcBy[id] || 0,
        futureBookings: bookBy[id] || 0,
        availabilities: avBy[id] || 0,
      }
      const isLast = total <= 1
      const reasons: string[] = []
      if (isLast) reasons.push('Letzter Salon')
      if (counts.staff > 0) reasons.push(`${counts.staff} Mitarbeiter zugeordnet`)
      if (counts.services > 0) reasons.push(`${counts.services} Services zugeordnet`)
      if (counts.futureBookings > 0) reasons.push(`${counts.futureBookings} zukünftige Buchungen`)
      if (counts.availabilities > 0) reasons.push(`${counts.availabilities} Abwesenheiten/Arbeitszeiten`)
      const deletable = !isLast && Object.values(counts).every(n => n === 0)
      return { _id: s._id, name: s.name, logoUrl: (s as any).logoUrl ?? null, deletable, reasons, counts }
    })

    return res.json({ success:true, salons: result })
  } catch (e) {
    console.error('listSalonGuards error', e)
    return res.status(500).json({ success:false, message:'Serverfehler' })
  }
}

export const updateSalon = async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Nur Admin' });
  }
  try {
    const { id } = req.params;
    const { name, address, phone, email, openingHours } = req.body;

    const salon = await Salon.findById(id);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon nicht gefunden' });
    }

    // Update fields if they are provided
    if (name) salon.name = name;
    if (address) salon.address = address;
    if (phone) salon.phone = phone;
    if (email) salon.email = email;
    if (openingHours) salon.openingHours = openingHours;

    await salon.save();

    res.json({ success: true, salon });
  } catch (e) {
    console.error('Update Salon Error:', e);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Salons' });
  }
};
