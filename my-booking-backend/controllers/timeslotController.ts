import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Booking } from '../models/Booking'
import { Availability } from '../models/Availability'
import { Service } from '../models/Service'
import { Salon } from '../models/Salon'
import { SalonRequest } from '../middlewares/activeSalon'

function addMinutes(d: Date, mins: number) { return new Date(d.getTime() + mins*60000) }
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) { return aStart < bEnd && bStart < aEnd }

export const getTimeslots = async (req: AuthRequest & SalonRequest, res: Response) => {
  try {
    const { staffId, serviceId, date, step } = req.query as { staffId: string; serviceId: string; date: string; step?: string }
    if (!staffId || !serviceId || !date) return res.status(400).json({ success:false, message:'staffId, serviceId, date erforderlich' })
    if (!mongoose.Types.ObjectId.isValid(staffId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success:false, message:'Ungültige ID' })
    }

    const service = await Service.findById(serviceId).select('duration')
    const duration = service?.duration ?? 30
    const stepMinutes = Math.max(5, Math.min(60, Number(step) || 15))

    // NEU: Salon und seine Öffnungszeiten abrufen
    const salon = await Salon.findById(req.salonId);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon nicht gefunden oder konfiguriert.' });
    }

    const dayOfWeek = new Date(date).getUTCDay(); // getUTCDay() für konsistente Wochentage (So=0)
    const openingHour = salon.openingHours.find(h => h.weekday === dayOfWeek);

    if (!openingHour || !openingHour.isOpen) {
      return res.json({ success: true, slots: [], duration }); // Salon ist an diesem Tag geschlossen
    }

    // NEU: Tagesfenster basierend auf Öffnungszeiten
    const [openH, openM] = openingHour.open.split(':').map(Number);
    const [closeH, closeM] = openingHour.close.split(':').map(Number);

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    dayStart.setUTCHours(openH, openM, 0, 0);

    const dayEnd = new Date(`${date}T00:00:00.000Z`);
    dayEnd.setUTCHours(closeH, closeM, 0, 0);

    // 1) Arbeitsfenster: Standard sind die Öffnungszeiten. Spezifische Arbeitszeiten pro Mitarbeiter können diese überschreiben.
    let workWindows = await Availability.find({
      staff: staffId, type: 'work', start: { $lt: dayEnd }, end: { $gt: dayStart }
    }).lean()

    if (workWindows.length === 0) {
      workWindows = [{ start: dayStart, end: dayEnd } as any]
    }

    // 2) Abwesenheiten & Pausen (Logik bleibt gleich)
    const blocks = await Availability.find({
      staff: staffId, type: { $in: ['absence','break'] },
      start: { $lt: dayEnd }, end: { $gt: dayStart }
    }).lean()

    // 3) Bestehende Buchungen des Tages (Logik bleibt gleich)
    const bookings = await Booking.find({
      staff: staffId, dateTime: { $gte: dayStart, $lte: dayEnd }
    }).populate('service', 'duration').lean()

    // 4) Slots generieren
    const slots: string[] = []
    const now = new Date(); // Aktuelle Zeit für den Vergleich

    for (const w of workWindows) {
      let t = new Date(w.start)
      if (t < dayStart) t = new Date(dayStart)

      while (addMinutes(t, duration) <= new Date(w.end) && addMinutes(t, duration) <= dayEnd) {
        const end = addMinutes(t, duration)

        // NEU: Prüfen, ob der Slot in der Vergangenheit liegt
        if (t < now) {
            t = addMinutes(t, stepMinutes);
            continue; // Diesen Slot überspringen
        }

        const blocked = blocks.some(b => overlaps(t, end, new Date(b.start), new Date(b.end)))
        if (!blocked) {
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