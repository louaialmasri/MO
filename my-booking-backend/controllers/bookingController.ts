import { Request, Response } from 'express'
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

  try {
    const service = await Service.findById(serviceId)
    const staff = await User.findById(staffId)

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    }

    if (!staff || staff.role !== 'staff') {
      return res.status(404).json({ success: false, message: 'Mitarbeiter nicht gefunden oder ungültig' })
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
    .populate('service')
    .populate('staff') // Mitarbeiterdaten mitliefern

    res.status(200).json({ success: true, bookings })
  } catch (error) {
    console.error('Fehler beim Laden der User-Buchungen:', error)
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Buchungen' })
  }
}

// ➡ Buchung stornieren (nur eigene)
export const cancelBooking = async (req: AuthRequest, res: Response) => {
  const bookingId = req.params.id

  try {
    const booking = await Booking.findOne({ _id: bookingId, user: req.user?.userId })

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Buchung nicht gefunden oder nicht autorisiert' })
    }

    await Booking.deleteOne({ _id: bookingId })

    return res.status(200).json({ success: true, message: 'Buchung storniert' })
  } catch (err) {
    console.error('Fehler beim Stornieren der Buchung:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Stornieren' })
  }
}

export const getAllBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find().populate('service').populate('user')
    return res.status(200).json({ success: true, bookings })
  } catch (err) {
    console.error('Fehler beim Abrufen aller Buchungen:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Laden der Buchungen' })
  }
}

// Bestellungen eines einzelnen Mitarbeiters
export const getStaffBookings = async (req: AuthRequest, res: Response) => {
  const staffId = req.user?.userId

  if (!staffId) {
    return res.status(401).json({ success: false, message: 'Nicht autorisiert' })
  }

  try {
    const bookings = await Booking.find({ staff: staffId })
      .populate('user', 'email')     // zeigt den Kunden
      .populate('service', 'name duration' )  // zeigt den Service
      .sort({ dateTime: 1 }) // nach Datum sortieren
    res.status(200).json({ success: true, bookings })
  } catch (error) {
    console.error('Fehler beim Laden der Mitarbeiter-Buchungen:', error)
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Buchungen' })
  }
}

