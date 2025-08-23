import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Booking } from '../models/Booking'
import { Availability } from '../models/Availability'
import { Service } from '../models/Service'

function addMinutes(d: Date, mins: number) { return new Date(d.getTime() + mins*60000) }
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) { return aStart < bEnd && bStart < aEnd }

export const getTimeslots = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, serviceId, date, step } = req.query as { staffId: string; serviceId: string; date: string; step?: string }
    if (!staffId || !serviceId || !date) return res.status(400).json({ success:false, message:'staffId, serviceId, date erforderlich' })
    if (!mongoose.Types.ObjectId.isValid(staffId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success:false, message:'Ungültige ID' })
    }

    const service = await Service.findById(serviceId).select('duration')
    const duration = service?.duration ?? 30
    const stepMinutes = Math.max(5, Math.min(60, Number(step) || 15))

    // Tagesfenster
    const dayStart = new Date(`${date}T00:00:00.000Z`)
    const dayEnd   = new Date(`${date}T23:59:59.999Z`)

    // 1) Arbeitsfenster (type='work'); falls keine vorhanden => Default 08:00-20:00
    let workWindows = await Availability.find({
      staff: staffId, type: 'work', start: { $lt: dayEnd }, end: { $gt: dayStart }
    }).lean()

    if (workWindows.length === 0) {
      const defStart = new Date(`${date}T08:00:00.000Z`)
      const defEnd   = new Date(`${date}T20:00:00.000Z`)
      workWindows = [{ start: defStart, end: defEnd } as any]
    }

    // 2) Abwesenheiten & Pausen
    const blocks = await Availability.find({
      staff: staffId, type: { $in: ['absence','break'] },
      start: { $lt: dayEnd }, end: { $gt: dayStart }
    }).lean()

    // 3) Bestehende Buchungen des Tages (mit Service-Dauer)
    const bookings = await Booking.find({
      staff: staffId, dateTime: { $gte: dayStart, $lte: dayEnd }
    }).populate('service', 'duration').lean()

    // 4) Slots generieren
    const slots: string[] = []
    for (const w of workWindows) {
      let t = new Date(w.start)
      // Stelle sicher, dass wir im Tagesfenster bleiben
      if (t < dayStart) t = new Date(dayStart)
      while (addMinutes(t, duration) <= new Date(w.end) && addMinutes(t, duration) <= dayEnd) {
        const end = addMinutes(t, duration)

        // blockierte Zeiten?
        const blocked = blocks.some(b => overlaps(t, end, new Date(b.start), new Date(b.end)))
        if (!blocked) {
          // overlap mit Buchungen?
          const clash = bookings.some(b => {
            const bs = new Date(b.dateTime as any)
            const bd = (b as any).service?.duration ?? 30
            const be = addMinutes(bs, bd)
            return overlaps(t, end, bs, be)
          })
          if (!clash) slots.push(t.toISOString())
        }

        t = addMinutes(t, stepMinutes)
      }
    }

    return res.json({ success:true, slots, duration })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Serverfehler bei Timeslots' })
  }
}
