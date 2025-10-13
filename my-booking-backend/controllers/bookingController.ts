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

// Booking erstellen
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

    const clash = await ensureNoConflicts(staffId, dateTime, serviceId)
    if (!clash.ok) return res.status(400).json({ success:false, message: clash.message }) 
    await booking.save()
    
    // Nach dem Speichern neu laden und populieren
    const savedBooking = await Booking.findById(booking._id)
        .populate<{ user: { firstName: string, email: string } }>('user', 'firstName email')
        .populate<{ service: { title: string } }>('service', 'title')
        .populate<{ staff: { firstName: string, lastName: string } }>('staff', 'firstName lastName')
        .populate('history.executedBy', 'firstName lastName');

    // --- HIER WIRD DIE E-MAIL GESENDET ---
    if (savedBooking) {
      const customer = savedBooking.user;
      const service = savedBooking.service;
      const staff = savedBooking.staff;
      
      const subject = `Ihre Terminbestätigung bei ${process.env.SALON_NAME || "Mo's Barbershop"}`;
      const html = `
        <h1>Hallo ${customer.firstName},</h1>
        <p>vielen Dank für Ihre Buchung. Ihr Termin wurde erfolgreich bestätigt.</p>
        <p><strong>Service:</strong> ${service.title}</p>
        <p><strong>Mitarbeiter:</strong> ${staff.firstName} ${staff.lastName}</p>
        <p><strong>Wann:</strong> ${dayjs(savedBooking.dateTime).locale('de').format('dddd, DD. MMMM YYYY [um] HH:mm [Uhr]')}</p>
        <p>Wir freuen uns auf Ihren Besuch!</p>
        <p>Ihr Team von ${process.env.SALON_NAME || "Mo's Barbershop"}</p>
      `;

      await sendEmail({
        to: customer.email,
        subject,
        html
      });
    }
    
    return res.status(201).json({ success: true, message: 'Buchung erstellt', booking: savedBooking })
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
      // HIER DIE ANPASSUNG: Wir holen jetzt mehr Details
      .populate('service', 'title duration price category')
      .populate('staff', 'firstName lastName email')
      .sort({ dateTime: -1 }); // Nach Datum absteigend sortieren

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

    if (userRole === 'user' && booking.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Nicht autorisiert' })
    }

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
export const updateBooking = async (req: AuthRequest & SalonRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { serviceId, dateTime, staffId } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Buchung nicht gefunden' });
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

    // Die `skills` eines Mitarbeiters sind ein Array von ObjectIDs. Wir müssen sie für den Vergleich in Strings umwandeln.
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

    const clash = await ensureNoConflicts(effectiveStaffId, effectiveDateTime, effectiveServiceId, id);
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

// GET /api/bookings (alle – Admin-Übersicht)
export const getAllBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { salonId } = req.query as { salonId?: string }
    let staffIds: string[] = []
    if (salonId) {
      staffIds = (await User.find({ salon: salonId, role: 'staff' }).select('_id')).map(u => String(u._id))
    }
    const filter: any = {}
    if (salonId) {
      filter.staff = { $in: staffIds };
    }
    
    const bookings = await Booking.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('service', 'title price duration')
      .populate('staff', 'firstName lastName email')
      .populate('history.executedBy', 'firstName lastName')
      .lean();

    return res.json({ success: true, bookings });
  } catch (err) {
    console.error('Fehler beim Abrufen aller Buchungen:', err)
    return res.status(500).json({ success: false, message: 'Serverfehler beim Laden der Buchungen' })
  }
}

// GET /api/bookings/staff (Bestellungen eines einzelnen Mitarbeiters)
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

    // History-Einträge für Änderungen erstellen
    if (dateTime && new Date(dateTime).getTime() !== existing.dateTime.getTime()) {
      existing.history.push({
        action: 'rescheduled',
        executedBy: new mongoose.Types.ObjectId(req.user!.userId),
        details: `Uhrzeit geändert von ${dayjs(existing.dateTime).format('HH:mm')} auf ${dayjs(dateTime).format('HH:mm')}`
      });
      existing.dateTime = new Date(dateTime);
    }

    if (staffId && staffId !== String(existing.staff)) {
       const oldStaff = await User.findById(existing.staff).select('firstName lastName');
       const newStaff = await User.findById(staffId).select('firstName lastName');
       existing.history.push({
        action: 'assigned',
        executedBy: new mongoose.Types.ObjectId(req.user!.userId),
        details: `Mitarbeiter geändert von ${oldStaff?.firstName} auf ${newStaff?.firstName}`
      });
      existing.staff = new mongoose.Types.ObjectId(staffId);
    }

    await existing.save(); // Speichert die Änderungen und die neue History

    const patch: any = {}
    if (dateTime) patch.dateTime = new Date(dateTime)
    if (serviceId) patch.service = serviceId
    if (staffId) patch.staff = staffId

    const updated = await Booking.findByIdAndUpdate(id, patch, { new: true })
      .populate('service', 'name duration')
      .populate('user', 'email name')
      .populate('staff', 'email name')
      .populate('history.executedBy', 'firstName lastName');

      // effektive IDs/Zeit bestimmen
      const effectiveDateTime  = dateTime || existing.dateTime.toISOString()
      // Konfliktcheck
      const clash = await ensureNoConflicts(
        effectiveStaffId,
        effectiveDateTime,
        effectiveServiceId,
        id // ID der aktuellen Buchung übergeben, um sie auszuschließen
      )
      if (!clash.ok) return res.status(400).json({ success:false, message: clash.message })

    if (!updated) return res.status(404).json({ success: false, message: 'Booking not found' })
    return res.json({ success: true, booking: updated })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success: false, message: 'Update failed' })
  }
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd
}

async function getServiceDurationMinutes(serviceId: string) {
  const svc = await Service.findById(serviceId).select('duration')
  return svc?.duration ?? 30
}

async function getBookingEnd(serviceId: string, startISO: string) {
  const mins = await getServiceDurationMinutes(serviceId)
  const start = new Date(startISO)
  return new Date(start.getTime() + mins * 60000)
}

async function ensureNoConflicts(staffId: string, startISO: string, serviceId: string, excludeBookingId?: string) {
  const start = new Date(startISO)
  const end   = await getBookingEnd(serviceId, startISO)

  // 1) gegen andere Buchungen
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
    const bDur   = (b as any).service?.duration ?? 30
    const bEnd   = new Date(bStart.getTime() + bDur * 60000)
    if (overlaps(start, end, bStart, bEnd)) {
      return { ok: false, message: 'Konflikt mit bestehender Buchung' }
    }
  }

  // 2) gegen Abwesenheit/Pause
  const blocks = await Availability.find({
    staff: staffId,
    type: { $in: ['absence', 'break'] },
    start: { $lt: end },
    end:   { $gt: start }
  }).lean()

  if (blocks.length > 0) {
    return { ok: false, message: 'Konflikt mit Abwesenheit/Pause' }
  }

  // 3) optional: innerhalb Arbeitszeit (falls Work-Fenster existieren)
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

  return { ok: true }
};

// Buchung als bezahlt markieren und Rechnung erstellen
export const markAsPaid = async (req: AuthRequest & SalonRequest, res: Response) => {
    const { id } = req.params;
    const { paymentMethod, amountGiven } = req.body;

    if (paymentMethod !== 'cash') {
        return res.status(400).json({ message: 'Nur Barzahlung ist derzeit implementiert.' });
    }

    try {
        const booking = await Booking.findById(id).populate('service');
        if (!booking) {
            return res.status(404).json({ message: 'Buchung nicht gefunden' });
        }

        if (booking.status === 'paid') {
            return res.status(400).json({ message: 'Diese Buchung wurde bereits bezahlt.' });
        }

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const countToday = await Invoice.countDocuments({ date: { $gte: dayjs(today).startOf('day').toDate() } });
        const invoiceNumber = `${dateStr}-${countToday + 1}`;

        const servicePrice = (booking.service as any).price;

        const given = amountGiven ? Number(amountGiven) : servicePrice;
        if (given < servicePrice) {
            return res.status(400).json({ message: 'Der gegebene Betrag ist geringer als der Rechnungsbetrag.' });
        }
        const change = given - servicePrice;

        // Service-Informationen für das "items"-Array vorbereiten
        const serviceItem = {
            description: (booking.service as any).title,
            price: servicePrice,
        };

        const newInvoice = new Invoice({
            invoiceNumber,
            booking: booking._id,
            customer: booking.user,
            service: booking.service,
            staff: booking.staff,
            salon: req.salonId,
            items: [serviceItem],
            amount: servicePrice,
            paymentMethod,
            amountGiven: given,
            change: change,
            status: 'paid',
        });

        await newInvoice.save();

        booking.status = 'paid';
        booking.paymentMethod = paymentMethod;
        booking.invoiceNumber = invoiceNumber;
        await booking.save();

        res.json({ message: 'Buchung als bezahlt markiert und Rechnung erstellt.', booking, invoice: newInvoice });

    } catch (error) {
        console.error("Fehler beim Markieren als bezahlt:", error);
        res.status(500).json({ message: 'Serverfehler' });
    }
};