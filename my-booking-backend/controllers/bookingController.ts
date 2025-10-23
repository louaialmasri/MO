import { query, Request, Response } from 'express'
import mongoose from 'mongoose'
import { Booking } from '../models/Booking'
import { Service } from '../models/Service'
import { AuthRequest } from '../middlewares/authMiddleware'
import { User } from '../models/User'
import { Availability } from '../models/Availability'
import { StaffSalon } from '../models/StaffSalon'
import { ServiceSalon } from '../models/ServiceSalon'
import { SalonRequest } from '../middlewares/activeSalon'
import { Invoice } from '../models/Invoice';
import dayjs from 'dayjs'
import { sendEmail } from '../utils/email'
import { Salon } from '../models/Salon' // Salon-Modell importieren

// Booking erstellen (ANGEPASST für Buchungsregeln)
export const createBooking = async (req: AuthRequest & SalonRequest, res: Response) => {
  const { serviceId, dateTime, staffId, userId } = req.body

  if (!serviceId || !dateTime || !staffId) {
    return res.status(400).json({ success: false, message: 'ServiceId, Datum/Uhrzeit und Mitarbeiter erforderlich' })
  }
  if (!mongoose.Types.ObjectId.isValid(serviceId) || !mongoose.Types.ObjectId.isValid(staffId)) {
    return res.status(400).json({ success: false, message: 'Ungültige ID' })
  }

  try {
    const sid = req.salonId
    if (!sid) return res.status(400).json({ success: false, message: 'Kein Salon aktiv.' });

    // Salon-Einstellungen laden
    const salon = await Salon.findById(sid);
    if (!salon) return res.status(404).json({ success: false, message: 'Salon nicht gefunden.' });
    const { bookingLeadTimeMinutes = 60, bookingHorizonDays = 90 } = salon.bookingRules ?? {};

    const bookingStart = dayjs(dateTime);
    const now = dayjs();

    // 1. Prüfung: Buchungsvorlaufzeit
    if (bookingStart.diff(now, 'minute') < bookingLeadTimeMinutes) {
        return res.status(400).json({ success: false, message: `Buchungen müssen mindestens ${bookingLeadTimeMinutes} Minuten im Voraus erfolgen.` });
    }

    // 2. Prüfung: Buchungshorizont
    if (bookingStart.diff(now, 'day') > bookingHorizonDays) {
        return res.status(400).json({ success: false, message: `Buchungen sind maximal ${bookingHorizonDays} Tage im Voraus möglich.` });
    }

    // --- Restliche Validierungen (unverändert) ---
    const staffMember = await StaffSalon.findOne({ staff: staffId, salon: sid, active: true })
    if (!staffMember) return res.status(403).json({ success:false, message:'Mitarbeiter nicht diesem Salon zugeordnet' })
    const svcAssign = await ServiceSalon.findOne({ service: serviceId, salon: sid, active: true })
    if (!svcAssign) return res.status(403).json({ success:false, message:'Service nicht diesem Salon zugeordnet' })
    const service = await Service.findById(serviceId)
    const staff = await User.findById(staffId).select('role skills')
    if (!service) return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    if (!staff || staff.role !== 'staff') return res.status(404).json({ success: false, message: 'Mitarbeiter nicht gefunden oder ungültig' })
    const canDo = (staff.skills || []).some((id: any) => String(id) === String(serviceId))
    if (!canDo) return res.status(400).json({ success: false, message: 'Mitarbeiter hat nicht die erforderlichen Skills für diesen Service' })

    let targetUserId = req.user?.userId
    if ((req.user?.role === 'admin' || req.user?.role === 'staff') && userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Ungültige Kunden-ID' })
      }
      const targetUser = await User.findById(userId).select('role')
      if (!targetUser) return res.status(404).json({ success: false, message: 'Kunde nicht gefunden' })
      targetUserId = String(targetUser._id)
    }

    const booking = new Booking({
      user: targetUserId,
      service: serviceId,
      staff: staffId,
      dateTime,
    })
    booking.history.push({
      action: 'created',
      executedBy: new mongoose.Types.ObjectId(req.user!.userId),
      details: `Termin erstellt von ${req.user!.role}`
    });

    const clash = await ensureNoConflicts(staffId, dateTime, serviceId, sid) // Salon-ID für Regelabruf übergeben
    if (!clash.ok) return res.status(400).json({ success:false, message: clash.message })
    await booking.save()

    const savedBooking = await Booking.findById(booking._id)
        .populate<{ user: { firstName: string, email: string } }>('user', 'firstName email')
        .populate<{ service: { title: string } }>('service', 'title')
        .populate<{ staff: { firstName: string, lastName: string } }>('staff', 'firstName lastName')
        .populate('history.executedBy', 'firstName lastName');

    // E-Mail-Versand (unverändert)
    if (savedBooking) {
      const customer = savedBooking.user;
      const service = savedBooking.service;
      const staff = savedBooking.staff;

      const subject = `Ihre Terminbestätigung bei ${salon.name || "Ihrem Salon"}`;
      const html = `
        <h1>Hallo ${customer.firstName},</h1>
        <p>vielen Dank für Ihre Buchung. Ihr Termin wurde erfolgreich bestätigt.</p>
        <p><strong>Service:</strong> ${service.title}</p>
        <p><strong>Mitarbeiter:</strong> ${staff.firstName} ${staff.lastName}</p>
        <p><strong>Wann:</strong> ${dayjs(savedBooking.dateTime).locale('de').format('dddd, DD. MMMM YYYY [um] HH:mm [Uhr]')}</p>
        ${salon.address ? `<p><strong>Wo:</strong> ${salon.name}, ${salon.address}</p>` : ''}
        <p>Wir freuen uns auf Ihren Besuch!</p>
        <p>Ihr Team von ${salon.name || "Ihrem Salon"}</p>
      `;

      // E-Mail nur senden, wenn im Salon aktiviert
      if (salon.bookingRules?.sendReminderEmails !== false) { // Explizite Prüfung auf false
            try {
                 await sendEmail({ to: customer.email, subject, html });
            } catch (emailError) {
                console.error("Fehler beim Senden der Bestätigungs-E-Mail:", emailError);
                // Nicht abbrechen, nur loggen
            }
      } else {
           console.log(`E-Mail-Versand für Salon ${salon.name} deaktiviert.`);
      }
    }

    return res.status(201).json({ success: true, message: 'Buchung erstellt', booking: savedBooking })
  } catch (err) {
    console.error('Fehler beim Erstellen der Buchung:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Buchen' })
  }
}

// GET /api/bookings/user (unverändert)
export const getUserBookings = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Nicht autorisiert' })
    }

    const bookings = await Booking.find({ user: userId })
      .populate('service', 'title duration price category')
      .populate('staff', 'firstName lastName email')
      .sort({ dateTime: -1 });

    res.status(200).json({ success: true, bookings })
  } catch (error) {
    console.error('Fehler beim Laden der User-Buchungen:', error)
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Buchungen' })
  }
}

// Buchung stornieren (ANGEPASST für Stornierungsfrist)
export const cancelBooking = async (req: AuthRequest & SalonRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('staff'); // Staff laden für Salon-ID

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Buchung nicht gefunden' });
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Nicht autorisiert' });
    }

    // Salon-ID aus dem Staff-Dokument oder der Anfrage holen
    const salonId = (booking.staff as any)?.salon?.toString() || req.salonId;
    if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon konnte nicht ermittelt werden.' });
    }

    // Salon-Einstellungen laden
    const salon = await Salon.findById(salonId);
    if (!salon) return res.status(404).json({ success: false, message: 'Salon nicht gefunden.' });
    const { cancellationDeadlineHours = 24 } = salon.bookingRules ?? {};

    const userRole = req.user.role;
    const userId = req.user.userId;

    if (userRole === 'user' && booking.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Nicht autorisiert' });
    }

    const now = dayjs();
    const bookingTime = dayjs(booking.dateTime);
    const diffInHours = bookingTime.diff(now, 'hour');

    // Nur User müssen die Frist einhalten
    if (userRole === 'user' && diffInHours < cancellationDeadlineHours) {
      return res.status(403).json({
        success: false,
        message: `Stornierung nur bis ${cancellationDeadlineHours} Stunden vor Termin möglich`,
      });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Buchung erfolgreich storniert' });
  } catch (error) {
    console.error('Fehler beim Stornieren der Buchung:', error);
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
};


// PATCH /api/bookings/:id (einfaches Update - unverändert, nutzt ensureNoConflicts)
export const updateBooking = async (req: AuthRequest & SalonRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { serviceId, dateTime, staffId } = req.body;

    const booking = await Booking.findById(id).populate('staff'); // Staff für Salon-ID laden
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Buchung nicht gefunden' });
    }

     // Salon-ID aus dem Staff-Dokument oder der Anfrage holen
    const salonId = (booking.staff as any)?.salon?.toString() || req.salonId;
    if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon konnte nicht ermittelt werden.' });
    }

    if (req.user?.role !== 'staff' && req.user?.role !== 'admin' && booking.user.toString() !== req.user?.userId) {
      return res.status(403).json({ success: false, message: 'Nicht autorisiert' });
    }

    const effectiveServiceId = serviceId || String(booking.service);
    const effectiveStaffId = staffId || String(booking.staff);
    const effectiveDateTime = dateTime || booking.dateTime.toISOString();

    if (!mongoose.Types.ObjectId.isValid(effectiveServiceId) || !mongoose.Types.ObjectId.isValid(effectiveStaffId)) {
        return res.status(400).json({ success: false, message: 'Ungültige ID' })
    }

    const staff = await User.findById(effectiveStaffId).select('skills role');
    if (!staff || staff.role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Ungültiger Mitarbeiter' });
    }
    const staffSkillIds = (staff.skills || []).map((skill: any) => String(skill));
    if (!staffSkillIds.includes(effectiveServiceId)) {
      return res.status(400).json({ success: false, message: 'Mitarbeiter hat nicht die erforderlichen Skills für diesen Service' });
    }

    const changes = [];
    if (dateTime && new Date(dateTime).getTime() !== booking.dateTime.getTime()) {
      changes.push(`Uhrzeit von ${dayjs(booking.dateTime).format('HH:mm')} auf ${dayjs(dateTime).format('HH:mm')}`);
      booking.dateTime = new Date(dateTime);
    }
    if (staffId && staffId !== String(booking.staff)) {
       const oldStaff = await User.findById(booking.staff).select('firstName lastName');
       const newStaff = await User.findById(staffId).select('firstName lastName');
       changes.push(`Mitarbeiter von ${oldStaff?.firstName} zu ${newStaff?.firstName}`);
       booking.staff = new mongoose.Types.ObjectId(staffId);
    }
    if (serviceId && serviceId !== String(booking.service)) {
        const oldService = await Service.findById(booking.service).select('title');
        const newService = await Service.findById(serviceId).select('title');
        changes.push(`Service von "${oldService?.title}" zu "${newService?.title}"`);
        booking.service = new mongoose.Types.ObjectId(serviceId);
    }
    if (changes.length > 0) {
        booking.history.push({
            action: 'rescheduled',
            executedBy: new mongoose.Types.ObjectId(req.user!.userId),
            details: changes.join(', ')
        });
    }

    const clash = await ensureNoConflicts(effectiveStaffId, effectiveDateTime, effectiveServiceId, salonId, id); // Salon-ID übergeben
    if (!clash.ok) return res.status(400).json({ success: false, message: clash.message });

    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('service', 'title price duration')
      .populate('staff', 'firstName lastName email')
      .populate('history.executedBy', 'firstName lastName');

    if (!updatedBooking) {
        return res.status(404).json({ success: false, message: 'Fehler beim Laden des aktualisierten Termins' });
    }

    res.json({ success: true, booking: updatedBooking.toObject() });

  } catch (err) {
    console.error('Fehler beim Aktualisieren der Buchung:', err);
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren der Buchung' });
  }
};

// GET /api/bookings (alle – Admin-Übersicht - unverändert)
export const getAllBookings = async (req: AuthRequest & SalonRequest, res: Response) => {
  try {
    const filter: any = {}
    if (req.salonId) {
        // Finde alle Staff-IDs für den aktiven Salon
        const staffAssignments = await StaffSalon.find({ salon: req.salonId, active: true }).select('staff').lean();
        const staffIdsInSalon = staffAssignments.map(s => s.staff);
        filter.staff = { $in: staffIdsInSalon };
    } else if (req.user?.role !== 'admin') {
         // Wenn kein Salon aktiv ist und der User kein Admin ist, keine Buchungen zurückgeben
         return res.json({ success: true, bookings: [] });
    }

    const bookings = await Booking.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('service', 'title price duration')
      .populate('staff', 'firstName lastName email')
      .populate('history.executedBy', 'firstName lastName')
      .sort({ dateTime: 1 }) // Sortieren nach Datum aufsteigend für Kalender
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error('Fehler beim Abrufen aller Buchungen:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Laden der Buchungen' })
  }
}

// GET /api/bookings/staff (Bestellungen eines einzelnen Mitarbeiters - unverändert)
export const getStaffBookings = async (req: AuthRequest, res: Response) => {
  const staffId = req.user?.userId;

  if (!staffId) {
    return res.status(401).json({ success: false, message: 'Nicht autorisiert' });
  }

  try {
    const bookings = await Booking.find({ staff: staffId })
      .populate('user', 'firstName lastName email')
      .populate('service', 'title duration')
      .sort({ dateTime: 1 });

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('Fehler beim Laden der Mitarbeiter-Buchungen:', error);
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Buchungen' });
  }
};

// PATCH /api/bookings/:id/admin (Admin-/Drag&Drop-Update - nutzt ensureNoConflicts)
export const updateBookingController = async (req: AuthRequest & SalonRequest, res: Response) => {
  try {
    const { id } = req.params
    const { dateTime, serviceId, staffId } = req.body

    const existing = await Booking.findById(id).populate('staff'); // Staff für Salon-ID laden
    if (!existing) return res.status(404).json({ success: false, message: 'Booking not found' })

    // Salon-ID aus dem Staff-Dokument oder der Anfrage holen
    const salonId = (existing.staff as any)?.salon?.toString() || req.salonId;
    if (!salonId) {
        return res.status(400).json({ success: false, message: 'Salon konnte nicht ermittelt werden.' });
    }

    // Effektive Werte bestimmen
    const effectiveServiceId = serviceId || String(existing.service)
    const effectiveStaffId = staffId || String(existing.staff)
    const effectiveDateTime  = dateTime || existing.dateTime.toISOString()

    if (!mongoose.Types.ObjectId.isValid(effectiveServiceId) || !mongoose.Types.ObjectId.isValid(effectiveStaffId)) {
      return res.status(400).json({ success: false, message: 'Ungültige ID' })
    }

    // Staff validieren + Skill-Check
    const staff = await User.findById(effectiveStaffId).select('skills role')
    if (!staff || staff.role !== 'staff') {
      return res.status(400).json({ success: false, message: 'Ungültiger Mitarbeiter' })
    }
    const staffSkillIds = (staff.skills || []).map((skill: any) => String(skill));
     if (!staffSkillIds.includes(effectiveServiceId)) {
      return res.status(400).json({ success: false, message: 'Mitarbeiter hat nicht die erforderlichen Skills für diesen Service' })
    }

     // Konfliktcheck
    const clash = await ensureNoConflicts(
      effectiveStaffId,
      effectiveDateTime,
      effectiveServiceId,
      salonId, // Salon-ID übergeben
      id // ID der aktuellen Buchung übergeben, um sie auszuschließen
    )
    if (!clash.ok) return res.status(400).json({ success:false, message: clash.message })


    // History-Einträge für Änderungen erstellen
    const changes = [];
    if (dateTime && new Date(dateTime).getTime() !== existing.dateTime.getTime()) {
      changes.push(`Uhrzeit von ${dayjs(existing.dateTime).format('HH:mm')} auf ${dayjs(dateTime).format('HH:mm')}`);
      existing.dateTime = new Date(dateTime);
    }
    if (staffId && staffId !== String((existing.staff as any)._id)) {
       const oldStaffName = `${(existing.staff as any).firstName || ''} ${(existing.staff as any).lastName || ''}`.trim();
       const newStaff = await User.findById(staffId).select('firstName lastName');
       changes.push(`Mitarbeiter von ${oldStaffName} zu ${newStaff?.firstName}`);
       existing.staff = new mongoose.Types.ObjectId(staffId);
    }
     if (serviceId && serviceId !== String(existing.service)) {
        const oldService = await Service.findById(existing.service).select('title');
        const newService = await Service.findById(serviceId).select('title');
        changes.push(`Service von "${oldService?.title}" zu "${newService?.title}"`);
        existing.service = new mongoose.Types.ObjectId(serviceId);
    }
    if (changes.length > 0 && req.user) {
        existing.history.push({
            action: serviceId || staffId ? 'assigned' : 'rescheduled', // Unterscheidung je nach Änderung
            executedBy: new mongoose.Types.ObjectId(req.user.userId),
            details: changes.join(', ')
        });
    }

    await existing.save(); // Speichert die Änderungen und die neue History

    const updated = await Booking.findById(id) // Neu laden nach dem Speichern
      .populate('user', 'firstName lastName email')
      .populate('service', 'title price duration')
      .populate('staff', 'firstName lastName email')
      .populate('history.executedBy', 'firstName lastName');

    if (!updated) return res.status(404).json({ success: false, message: 'Booking not found after update' })
    return res.json({ success: true, booking: updated })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success: false, message: 'Update failed' })
  }
}

// Buchung als bezahlt markieren und Rechnung erstellen (unverändert)
export const markAsPaid = async (req: AuthRequest & SalonRequest, res: Response) => {
    // ... (Logik bleibt gleich)
    const { id } = req.params;
    const { paymentMethod, amountGiven } = req.body;

    if (paymentMethod !== 'cash') {
        return res.status(400).json({ message: 'Nur Barzahlung ist derzeit implementiert.' });
    }

    try {
        const booking = await Booking.findById(id).populate('service').populate('staff'); // Staff für Salon-ID laden
        if (!booking) {
            return res.status(404).json({ message: 'Buchung nicht gefunden' });
        }
         // Salon-ID aus dem Staff-Dokument oder der Anfrage holen
        const salonId = (booking.staff as any)?.salon?.toString() || req.salonId;
        if (!salonId) {
            return res.status(400).json({ success: false, message: 'Salon konnte nicht ermittelt werden.' });
        }


        if (booking.status === 'paid' || booking.status === 'completed') {
            return res.status(400).json({ message: 'Diese Buchung wurde bereits bezahlt.' });
        }

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const countToday = await Invoice.countDocuments({ date: { $gte: dayjs(today).startOf('day').toDate() }, salon: salonId });
        const invoiceNumber = `${dateStr}-${countToday + 1}`;

        const servicePrice = (booking.service as any).price;

        const given = amountGiven ? Number(amountGiven) : servicePrice;
        if (given < servicePrice) {
            return res.status(400).json({ message: 'Der gegebene Betrag ist geringer als der Rechnungsbetrag.' });
        }
        const change = given - servicePrice;

        const serviceItem = {
            description: (booking.service as any).title,
            price: servicePrice,
        };

        const newInvoice = new Invoice({
            invoiceNumber,
            booking: booking._id,
            customer: booking.user,
            staff: booking.staff,
            salon: salonId, // Korrigierte Salon-ID verwenden
            items: [serviceItem],
            amount: servicePrice,
            paymentMethod,
            amountGiven: given,
            change: change,
            status: 'paid',
        });

        await newInvoice.save();

        booking.status = 'completed'; // Status auf completed setzen
        booking.paymentMethod = paymentMethod;
        booking.invoiceNumber = invoiceNumber;
        await booking.save();

        res.json({ message: 'Buchung als bezahlt markiert und Rechnung erstellt.', booking, invoice: newInvoice });

    } catch (error) {
        console.error("Fehler beim Markieren als bezahlt:", error);
        res.status(500).json({ message: 'Serverfehler' });
    }
};

// --- Hilfsfunktionen ---

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

async function getServiceDurationMinutes(serviceId: string, salonId: string) {
    // Prüfe auf Salon-spezifischen Override
    const svcAssign = await ServiceSalon.findOne({ service: serviceId, salon: salonId }).select('durationOverride');
    if (svcAssign && svcAssign.durationOverride != null) {
        return svcAssign.durationOverride;
    }
    // Fallback auf globalen Service
    const svc = await Service.findById(serviceId).select('duration');
    return svc?.duration ?? 30;
}


async function getBookingEnd(serviceId: string, startISO: string, salonId: string) {
  const mins = await getServiceDurationMinutes(serviceId, salonId)
  const start = new Date(startISO)
  return new Date(start.getTime() + mins * 60000)
}

// ANGEPASST: Benötigt jetzt die Salon-ID für Regeln
async function ensureNoConflicts(staffId: string, startISO: string, serviceId: string, salonId: string, excludeBookingId?: string) {
  const start = new Date(startISO)
  const end   = await getBookingEnd(serviceId, startISO, salonId)

  // 1) gegen andere Buchungen (unverändert)
  const windowBefore = new Date(start.getTime() - 4 * 60 * 60 * 1000)
  const windowAfter  = new Date(end.getTime()   + 4 * 60 * 60 * 1000)
  const bookingQuery: any = {
    staff: staffId,
    dateTime: { $gte: windowBefore, $lte: windowAfter }
  }
  if (excludeBookingId) {
    bookingQuery._id = { $ne: excludeBookingId }
  }
  const neighborBookings = await Booking.find(bookingQuery)
    .populate('service', 'duration').lean()
  for (const b of neighborBookings) {
    const bStart = new Date(b.dateTime as any)
    // WICHTIG: Dauer für die Nachbarbuchung MUSS auch Salon-spezifisch sein!
    const bDur   = await getServiceDurationMinutes((b.service as any)._id, salonId); // Korrigiert
    const bEnd   = new Date(bStart.getTime() + bDur * 60000)
    if (overlaps(start, end, bStart, bEnd)) {
      return { ok: false, message: 'Konflikt mit bestehender Buchung' }
    }
  }

  // 2) gegen Abwesenheit/Pause (unverändert)
  const blocks = await Availability.find({
    staff: staffId,
    type: { $in: ['absence', 'break'] },
    start: { $lt: end },
    end:   { $gt: start }
  }).lean()
  if (blocks.length > 0) {
    return { ok: false, message: 'Konflikt mit Abwesenheit/Pause' }
  }

  // 3) innerhalb Arbeitszeit (unverändert)
  const dayStart = new Date(start); dayStart.setHours(0,0,0,0)
  const dayEnd   = new Date(start); dayEnd.setHours(23,59,59,999)
  const works = await Availability.find({
    staff: staffId,
    type: 'work',
    start: { $lt: dayEnd },
    end:   { $gt: dayStart }
  }).lean()
  if (works.length > 0) {
    const insideSomeWork = works.some(w => new Date(w.start) <= start && end <= new Date(w.end))
    if (!insideSomeWork) {
      return { ok: false, message: 'Termin liegt außerhalb der Arbeitszeit' }
    }
  }

  // 4. NEU: Buchungsregeln prüfen (Vorlaufzeit & Horizont)
  const salon = await Salon.findById(salonId); // Salon-Daten holen
  if (salon) {
      const { bookingLeadTimeMinutes = 0, bookingHorizonDays = 90 } = salon.bookingRules ?? {};
      const now = dayjs();
      if (dayjs(start).diff(now, 'minute') < bookingLeadTimeMinutes) {
          return { ok: false, message: `Buchungen müssen mindestens ${bookingLeadTimeMinutes} Minuten im Voraus erfolgen.` };
      }
      if (dayjs(start).diff(now, 'day') > bookingHorizonDays) {
          return { ok: false, message: `Buchungen sind maximal ${bookingHorizonDays} Tage im Voraus möglich.` };
      }
  } else {
      console.warn(`Salon ${salonId} nicht gefunden für Regelprüfung in ensureNoConflicts`);
  }


  return { ok: true }
};
