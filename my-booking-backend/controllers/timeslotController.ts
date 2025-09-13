import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Booking } from '../models/Booking';
import { Availability } from '../models/Availability';
import { Service } from '../models/Service';
import { Salon } from '../models/Salon';
import { SalonRequest } from '../middlewares/activeSalon';

// Hilfsfunktionen
function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60000);
}
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export const getTimeslots = async (req: AuthRequest & SalonRequest, res: Response) => {
  try {
    const { staffId, serviceId, date, step } = req.query as { staffId: string; serviceId: string; date: string; step?: string };

    if (!staffId || !serviceId || !date) {
      return res.status(400).json({ success: false, message: 'staffId, serviceId, date erforderlich' });
    }
    if (!mongoose.Types.ObjectId.isValid(staffId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: 'Ungültige ID' });
    }
    if (!req.salonId) {
      return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt. Bitte wählen Sie einen Salon aus der Navigationsleiste aus.' });
    }

    const service = await Service.findById(serviceId).select('duration');
    const duration = service?.duration ?? 30;
    const stepMinutes = Math.max(5, Math.min(60, Number(step) || 15));

    // 1. Salon-Öffnungszeiten als primäre Grenze laden
    const salon = await Salon.findById(req.salonId);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon nicht gefunden.' });
    }

    // Datum im lokalen Kontext des Servers erstellen, um Zeitzonenfehler zu vermeiden
    const requestedDate = new Date(date); 
    const dayOfWeek = requestedDate.getDay(); // Sonntag = 0, Montag = 1, ...
    const openingHourRule = salon.openingHours.find(h => h.weekday === dayOfWeek);

    if (!openingHourRule || !openingHourRule.isOpen) {
      return res.json({ success: true, slots: [], duration }); // Geschlossen
    }

    const [openH, openM] = openingHourRule.open.split(':').map(Number);
    const [closeH, closeM] = openingHourRule.close.split(':').map(Number);

    const salonOpenTime = new Date(requestedDate);
    salonOpenTime.setHours(openH, openM, 0, 0);

    const salonCloseTime = new Date(requestedDate);
    salonCloseTime.setHours(closeH, closeM, 0, 0);

    // 2. Arbeitsfenster des Mitarbeiters abrufen oder Öffnungszeiten als Standard verwenden
    let workWindows = await Availability.find({
      staff: staffId,
      type: 'work',
      start: { $lt: salonCloseTime },
      end: { $gt: salonOpenTime },
    }).lean();

    if (workWindows.length === 0) {
      // Wenn keine spezifischen Arbeitszeiten gesetzt sind, gelten die Öffnungszeiten des Salons
      workWindows = [{ start: salonOpenTime, end: salonCloseTime }] as any;
    }

    // 3. Alle Blocker abrufen
    const blocks = await Availability.find({
      staff: staffId,
      type: { $in: ['absence', 'break'] },
      start: { $lt: salonCloseTime },
      end: { $gt: salonOpenTime },
    }).lean();

    const bookings = await Booking.find({
      staff: staffId,
      dateTime: { $gte: salonOpenTime, $lt: salonCloseTime },
    }).populate('service', 'duration').lean();

    // 4. Slots generieren und filtern
    const slots: string[] = [];
    const now = new Date();

    for (const window of workWindows) {
      // Sicherstellen, dass die Arbeitszeitfenster die Salon-Öffnungszeiten nicht überschreiten
      let t = new Date(window.start) > salonOpenTime ? new Date(window.start) : salonOpenTime;
      const windowEnd = new Date(window.end) < salonCloseTime ? new Date(window.end) : salonCloseTime;

      while (addMinutes(t, duration) <= windowEnd) {
        // Slot darf nicht in der Vergangenheit liegen
        if (t < now) {
          t = addMinutes(t, stepMinutes);
          continue;
        }

        const slotEnd = addMinutes(t, duration);

        const isBlocked = blocks.some(b => overlaps(t, slotEnd, new Date(b.start), new Date(b.end)));
        if (isBlocked) {
          t = addMinutes(t, stepMinutes);
          continue;
        }

        const hasClash = bookings.some(b => {
          const bookingStart = new Date(b.dateTime as any);
          const bookingDuration = (b as any).service?.duration ?? 30;
          const bookingEnd = addMinutes(bookingStart, bookingDuration);
          return overlaps(t, slotEnd, bookingStart, bookingEnd);
        });

        if (!hasClash) {
          slots.push(t.toISOString());
        }

        t = addMinutes(t, stepMinutes);
      }
    }

    return res.json({ success: true, slots, duration });

  } catch (e) {
    console.error('Fehler bei getTimeslots:', e);
    return res.status(500).json({ success: false, message: 'Serverfehler beim Laden der Timeslots' });
  }
};