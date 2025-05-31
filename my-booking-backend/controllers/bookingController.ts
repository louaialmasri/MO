import { Response } from 'express'
import { Booking } from '../models/Booking'
import { Service } from '../models/Service'
import { AuthRequest } from '../middlewares/authMiddleware'

// ➡ Booking erstellen
export const createBooking = async (req: AuthRequest, res: Response) => {
  const { serviceId, dateTime } = req.body

  if (!serviceId || !dateTime) {
    return res.status(400).json({ success: false, message: 'ServiceId und Datum/Uhrzeit erforderlich' })
  }

  try {
    const service = await Service.findById(serviceId)
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    }

    const booking = new Booking({
      user: req.user?.userId,
      service: serviceId,
      dateTime,
    })

    await booking.save()

    return res.status(201).json({ success: true, message: 'Buchung erstellt', booking })
  } catch (err) {
    console.error('Fehler beim Erstellen der Buchung:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Buchen' })
  }
}

// ➡ Buchungen des Users abrufen
export const getBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find({ user: req.user?.userId }).populate('service')
    return res.status(200).json({ success: true, bookings })
  } catch (err) {
    console.error('Fehler beim Abrufen der Buchungen:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Laden der Buchungen' })
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
