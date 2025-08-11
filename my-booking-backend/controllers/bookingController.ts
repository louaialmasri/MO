import { Request, Response } from 'express'
import mongoose from 'mongoose'
import { Booking } from '../models/Booking'
import { Service } from '../models/Service'
import { AuthRequest } from '../middlewares/authMiddleware'
import { User } from '../models/User'

// Booking erstellen
export const createBooking = async (req: AuthRequest, res: Response) => {
  const { serviceId, dateTime, staffId } = req.body

  if (!serviceId || !dateTime || !staffId) {
    return res.status(400).json({ success: false, message: 'ServiceId, Datum/Uhrzeit und Mitarbeiter erforderlich' })
  }

  if (!mongoose.Types.ObjectId.isValid(serviceId) || !mongoose.Types.ObjectId.isValid(staffId)) {
    return res.status(400).json({ success: false, message: 'Ungültige ID' })
  }

  try {
    const service = await Service.findById(serviceId)
    const staff = await User.findById(staffId).select('role skills')

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    }

    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ success: false, message: 'Mitarbeiter nicht gefunden oder ungültig' })
    }

    // Skill-Check
    const canDo = (staff.skills || []).some((id: any) => String(id) === String(serviceId))
    if (!canDo) {
      return res.status(400).json({ success: false, message: 'Mitarbeiter hat nicht die erforderlichen Skills für diesen Service' })
    }

    const booking = new Booking({
      user: req.user?.userId,
      service: serviceId,
      staff: staffId,
      dateTime,
    })

    await booking.save()

    return res.status(201).json({ success: true, message: 'Buchung erstellt', booking })
  } catch (err) {
    console.error('Fehler beim Erstellen der Buchung:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Buchen' })
  }
}

// GET /api/bookings/user
export const getUserBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Nicht autorisiert' })
    }

    const bookings = await Booking.find({ user: userId })
      .populate('service', 'name duration')
      .populate('staff', 'email name')

    res.status(200).json({ success: true, bookings })
  } catch (error) {
    console.error('Fehler beim Laden der User-Buchungen:', error)
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Buchungen' })
  }
}

// ➡ Buchung stornieren (nur eigene, außer Staff/Admin)
export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id)

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Buchung nicht gefunden' })
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Nicht autorisiert' })
    }

    const userRole = req.user.role
    const userId = req.user.userId

    // User darf nur seine eigenen Buchungen stornieren
    if (userRole === 'user' && booking.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Nicht autorisiert' })
    }

    // ⏰ 24h-Regel für User
    const now = new Date()
    const bookingTime = new Date(booking.dateTime)
    const diffInHours = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (userRole === 'user' && diffInHours < 24) {
      return res.status(403).json({
        success: false,
        message: 'Stornierung nur bis 24 Stunden vor Termin möglich',
      })
    }

    await Booking.findByIdAndDelete(req.params.id)

    res.json({ success: true, message: 'Buchung erfolgreich storniert' })
  } catch (error) {
    console.error('Fehler beim Stornieren der Buchung:', error)
    res.status(500).json({ success: false, message: 'Serverfehler' })
  }
}

// PATCH /api/bookings/:id  (einfaches Update)
export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = req.params.id
    const { serviceId, dateTime, staffId } = req.body

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Buchung nicht gefunden' })
    }

    // Berechtigungsprüfung (Staff/Admin oder Besitzer)
    if (req.user?.role !== 'staff' && req.user?.role !== 'admin' && booking.user.toString() !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Nicht autorisiert' })
    }

    // Effektive IDs bestimmen (Body > Bestand)
    const effectiveServiceId = serviceId || String(booking.service)
    const effectiveStaffId = staffId || String(booking.staff)

    if (!mongoose.Types.ObjectId.isValid(effectiveServiceId) || !mongoose.Types.ObjectId.isValid(effectiveStaffId)) {
      return res.status(400).json({ success: false, message: 'Ungültige ID' })
    }

    // Staff validieren + Skill-Check
    const staff = await User.findById(effectiveStaffId).select('skills role')
    if (!staff || staff.role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Ungültiger Mitarbeiter' })
    }
    const canDo = (staff.skills || []).some((id: any) => String(id) === String(effectiveServiceId))
    if (!canDo) {
      return res.status(400).json({ success: false, message: 'Mitarbeiter hat nicht die erforderlichen Skills für diesen Service' })
    }

    // Update anwenden
    if (serviceId) booking.service = serviceId
    if (dateTime) booking.dateTime = dateTime
    if (staffId) booking.staff = staffId

    await booking.save()
    res.json({ success: true, booking })
  } catch (err) {
    console.error('Fehler beim Aktualisieren der Buchung:', err)
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren der Buchung' })
  }
}

// GET /api/bookings (alle – Admin-Übersicht)
export const getAllBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find()
      .populate('service', 'name duration')
      .populate('user', 'email name phone')
      .populate('staff', 'email name')
      .sort({ dateTime: 1 })
      .lean()

    return res.status(200).json({ success: true, bookings })
  } catch (err) {
    console.error('Fehler beim Abrufen aller Buchungen:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Laden der Buchungen' })
  }
}

// GET /api/bookings/staff (Bestellungen eines einzelnen Mitarbeiters)
export const getStaffBookings = async (req: AuthRequest, res: Response) => {
  const staffId = req.user?.userId

  if (!staffId) {
    return res.status(401).json({ success: false, message: 'Nicht autorisiert' })
  }

  try {
    const bookings = await Booking.find({ staff: staffId })
      .populate('user', 'email')
      .populate('service', 'name duration')
      .sort({ dateTime: 1 })

    res.status(200).json({ success: true, bookings })
  } catch (error) {
    console.error('Fehler beim Laden der Mitarbeiter-Buchungen:', error)
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Buchungen' })
  }
}

// PATCH /api/bookings/:id/admin (Admin-/Drag&Drop-Update)
export const updateBookingController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { dateTime, serviceId, staffId } = req.body

    const existing = await Booking.findById(id)
    if (!existing) return res.status(404).json({ success: false, message: 'Booking not found' })

    // Effektive Werte bestimmen
    const effectiveServiceId = serviceId || String(existing.service)
    const effectiveStaffId = staffId || String(existing.staff)

    if (!mongoose.Types.ObjectId.isValid(effectiveServiceId) || !mongoose.Types.ObjectId.isValid(effectiveStaffId)) {
      return res.status(400).json({ success: false, message: 'Ungültige ID' })
    }

    // Staff validieren + Skill-Check
    const staff = await User.findById(effectiveStaffId).select('skills role')
    if (!staff || staff.role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Ungültiger Mitarbeiter' })
    }
    const canDo = (staff.skills || []).some((id: any) => String(id) === String(effectiveServiceId))
    if (!canDo) {
      return res.status(400).json({ success: false, message: 'Mitarbeiter hat nicht die erforderlichen Skills für diesen Service' })
    }

    const patch: any = {}
    if (dateTime) patch.dateTime = new Date(dateTime)
    if (serviceId) patch.service = serviceId
    if (staffId) patch.staff = staffId

    const updated = await Booking.findByIdAndUpdate(id, patch, { new: true })
      .populate('service', 'name duration')
      .populate('user', 'email name')
      .populate('staff', 'email name')

    if (!updated) return res.status(404).json({ success: false, message: 'Booking not found' })
    return res.json({ success: true, booking: updated })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success: false, message: 'Update failed' })
  }
}
