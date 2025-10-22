import { Response } from 'express';
import mongoose from 'mongoose';
import dayjs from 'dayjs'; // Dayjs importieren
import { AuthRequest } from '../middlewares/authMiddleware';
import { Booking } from '../models/Booking';
import { Availability } from '../models/Availability';
import { Service } from '../models/Service';
import { Salon } from '../models/Salon'; // Salon importieren
import { SalonRequest } from '../middlewares/activeSalon';
import { ServiceSalon } from '../models/ServiceSalon'; // ServiceSalon importieren

// Hilfsfunktionen (unverändert)
function addMinutes(d: Date, mins: number): Date {
  return new Date(d.getTime() + mins * 60000);
}
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// Hilfsfunktion zum Abrufen der Service-Dauer (Berücksichtigt Overrides)
async function getServiceDurationMinutes(serviceId: string, salonId: string): Promise<number> {
    const svcAssign = await ServiceSalon.findOne({ service: serviceId, salon: salonId }).select('durationOverride');
    if (svcAssign && svcAssign.durationOverride != null) {
        return svcAssign.durationOverride;
    }
    const svc = await Service.findById(serviceId).select('duration');
    return svc?.duration ?? 30;
}


export const getTimeslots = async (req: AuthRequest & SalonRequest, res: Response) => {
  try {
    const { staffId, serviceId, date, step } = req.query as { staffId: string; serviceId: string; date: string; step?: string };
    const salonId = req.salonId; // Salon-ID aus der Middleware holen

    if (!staffId || !serviceId || !date) {
      return res.status(400).json({ success: false, message: 'staffId, serviceId, date erforderlich' });
    }
    if (!mongoose.Types.ObjectId.isValid(staffId) || !mongoose.Types.ObjectId.isValid(serviceId)) {
      return res.status(400).json({ success: false, message: 'Ungültige ID' });
    }
    // WICHTIG: Prüfen, ob eine Salon-ID vorhanden ist
    if (!salonId) {
      return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt. Bitte wählen Sie einen Salon.' });
    }

    // Salon-Einstellungen laden für Regeln
    const salon = await Salon.findById(salonId);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon nicht gefunden.' });
    }
    const { bookingLeadTimeMinutes = 60, bookingHorizonDays = 90 } = salon.bookingRules ?? {};

    const duration = await getServiceDurationMinutes(serviceId, salonId); // Dauer über Hilfsfunktion
    const stepMinutes = Math.max(5, Math.min(60, Number(step) || 15));

    const requestedDate = dayjs(date).startOf('day'); // Dayjs für einfachere Vergleiche
    const now = dayjs();

    // Prüfung: Buchungshorizont (Datum darf nicht zu weit in der Zukunft liegen)
    if (requestedDate.diff(now, 'day') > bookingHorizonDays) {
        return res.json({ success: true, slots: [], duration, message: `Datum liegt außerhalb des Buchungshorizonts von ${bookingHorizonDays} Tagen.` });
    }

    // Datumsobjekte für Mongoose-Queries
    const requestedDateStart = requestedDate.toDate();
    const requestedDateEnd = requestedDate.endOf('day').toDate();

    // 1. Salon-Öffnungszeiten als primäre Grenze
    const dayOfWeek = requestedDate.day(); // dayjs().day() gibt 0 für Sonntag, 6 für Samstag
    const openingHourRule = salon.openingHours.find(h => h.weekday === dayOfWeek);

    if (!openingHourRule || !openingHourRule.isOpen) {
      return res.json({ success: true, slots: [], duration }); // Geschlossen
    }

    const [openH, openM] = openingHourRule.open.split(':').map(Number);
    const [closeH, closeM] = openingHourRule.close.split(':').map(Number);

    const salonOpenTime = requestedDate.hour(openH).minute(openM).second(0).millisecond(0).toDate();
    const salonCloseTime = requestedDate.hour(closeH).minute(closeM).second(0).millisecond(0).toDate();

    // 2. Arbeitsfenster des Mitarbeiters
    let workWindows = await Availability.find({
      staff: staffId,
      type: 'work',
      start: { $lt: salonCloseTime }, // Muss vor Salon-Schluss enden
      end: { $gt: salonOpenTime },   // Muss nach Salon-Öffnung beginnen
    }).lean();

    if (workWindows.length === 0) {
      // Wenn keine spezifischen Arbeitszeiten, gelten Salon-Öffnungszeiten
      workWindows = [{ start: salonOpenTime, end: salonCloseTime }] as any;
    }

    // 3. Alle Blocker (Abwesenheit, Pause, Buchungen)
    const blocks = await Availability.find({
      staff: staffId,
      type: { $in: ['absence', 'break'] },
      start: { $lt: requestedDateEnd }, // Ganzen Tag betrachten
      end: { $gt: requestedDateStart },
    }).lean();

    const bookings = await Booking.find({
      staff: staffId,
      dateTime: { $gte: requestedDateStart, $lt: requestedDateEnd }, // Ganzen Tag betrachten
    }).populate('service', 'duration').lean();

    // 4. Slots generieren und filtern
    const slots: string[] = [];
    const minBookingTime = now.add(bookingLeadTimeMinutes, 'minute'); // Mindestzeitpunkt für Buchung

    for (const window of workWindows) {
      // Startzeit innerhalb der Salon-Öffnungszeit sicherstellen
      let t = dayjs(window.start).isAfter(salonOpenTime) ? dayjs(window.start) : dayjs(salonOpenTime);
      // Endzeit innerhalb der Salon-Öffnungszeit sicherstellen
      const windowEnd = dayjs(window.end).isBefore(salonCloseTime) ? dayjs(window.end) : dayjs(salonCloseTime);

      while (t.add(duration, 'minute').isBefore(windowEnd) || t.add(duration, 'minute').isSame(windowEnd)) {
        const slotStart = t.toDate();
        const slotEnd = t.add(duration, 'minute').toDate();

        // Prüfung: Slot muss nach der Mindestvorlaufzeit liegen
        if (t.isBefore(minBookingTime)) {
          t = t.add(stepMinutes, 'minute');
          continue;
        }

        // Prüfung: Blocker (Abwesenheit, Pause)
        const isBlocked = blocks.some(b => overlaps(slotStart, slotEnd, new Date(b.start), new Date(b.end)));
        if (isBlocked) {
          t = t.add(stepMinutes, 'minute');
          continue;
        }

        // Prüfung: Bestehende Buchungen
        const hasClash = bookings.some(b => {
          const bookingStart = new Date(b.dateTime as any);
          // WICHTIG: Dauer für Kollisionsprüfung muss Salon-spezifisch sein!
          const bookingDuration = (b as any).service?.duration ?? 30; // Fallback, aber idealerweise immer über ServiceSalon holen
          const bookingEnd = addMinutes(bookingStart, bookingDuration);
          return overlaps(slotStart, slotEnd, bookingStart, bookingEnd);
        });

        if (!hasClash) {
          slots.push(slotStart.toISOString());
        }

        t = t.add(stepMinutes, 'minute');
      }
    }

    return res.json({ success: true, slots, duration });

  } catch (e) {
    console.error('Fehler bei getTimeslots:', e);
    return res.status(500).json({ success: false, message: 'Serverfehler beim Laden der Timeslots' });
  }
};
