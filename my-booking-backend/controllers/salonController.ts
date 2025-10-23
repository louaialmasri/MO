import { Response } from 'express'
import mongoose, { Types } from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Salon, ISalon } from '../models/Salon' // ISalon importiert
import { User } from '../models/User'
import { Service } from '../models/Service'
import { Booking } from '../models/Booking'
import { Availability } from '../models/Availability'
import { ServiceSalon } from '../models/ServiceSalon'
import { StaffSalon } from '../models/StaffSalon'
import { SalonRequest } from '../middlewares/activeSalon'

export const getMySalons = async (req: AuthRequest, res: Response) => {
  // Bleibt unverändert, holt alle Salons für den Admin
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
  const salons = await Salon.find({ /* optional: owner: req.user.userId */ }).sort({ name: 1 })
  res.json({ success:true, salons })
}

// NEU: Holt die Daten des aktuell *aktiven* Salons
export const getCurrentSalon = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            // Versuche, den ersten Salon des Admins zu finden, falls keiner aktiv ist
             if (req.user?.role === 'admin') {
                const userWithSalon = await User.findById(req.user.userId).select('salon');
                if (userWithSalon?.salon) {
                    req.salonId = userWithSalon.salon.toString();
                } else {
                    const firstSalon = await Salon.findOne().sort({ createdAt: 1 });
                    if (firstSalon) {
                         req.salonId = (firstSalon._id as mongoose.Types.ObjectId).toString();
                    }
                }
            }
        }

        if (!req.salonId) {
             return res.status(404).json({ message: 'Kein aktiver Salon gefunden oder auswählbar.' });
        }

        const salon = await Salon.findById(req.salonId);
        if (!salon) {
            return res.status(404).json({ message: 'Aktiver Salon nicht gefunden.' });
        }
        res.json({ success: true, salon });
    } catch (error) {
        console.error("Fehler in getCurrentSalon:", error);
        res.status(500).json({ message: 'Serverfehler' });
    }
}


export const createSalon = async (req: AuthRequest, res: Response) => {
  // Bleibt unverändert
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
  const { name, logoUrl } = req.body
  const salon = await Salon.create({ name, logoUrl /* , owner: req.user.userId */ })
  res.status(201).json({ success:true, salon })
}

export const deleteSalon = async (req: AuthRequest, res: Response) => {
  // Bleibt unverändert
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

    // Zusätzliche Prüfungen für Zuordnungsmodelle
    const staffSalonCount = await StaffSalon.countDocuments({ salon: salonId });
    const serviceSalonCount = await ServiceSalon.countDocuments({ salon: salonId });

     if (staffSalonCount > 0 || serviceSalonCount > 0) {
        return res.status(409).json({
            success: false,
            message: 'Salon kann nicht gelöscht werden. Entferne zuerst alle Mitarbeiter- und Service-Zuordnungen.',
            details: { staffAssignments: staffSalonCount, serviceAssignments: serviceSalonCount }
        });
    }

    await Salon.findByIdAndDelete(id)
    return res.json({ success:true, message:'Salon gelöscht' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Serverfehler beim Löschen' })
  }
}


export const migrateDefaultSalon = async (req: AuthRequest, res: Response) => {
  // Bleibt unverändert
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
 // Bleibt unverändert
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

// ANGEPASST: Aktualisiert einen Salon (inkl. der neuen Felder)
export const updateSalon = async (req: SalonRequest, res: Response) => {
  // Nur Admins dürfen Salons bearbeiten
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Nur Admin' });
  }
  try {
    // ID kann entweder aus Params (/:id) oder dem aktiven Salon (req.salonId für /current) kommen
    const salonIdToUpdate = req.params.id || req.salonId;

    if (!salonIdToUpdate || !mongoose.Types.ObjectId.isValid(salonIdToUpdate)) {
         return res.status(400).json({ success: false, message: 'Gültige Salon-ID erforderlich' });
    }

    // Nur Admins dürfen Daten *dieses* Salons bearbeiten (oder generell alle, je nach Logik)
    // Die activeSalon Middleware stellt sicher, dass Admins den Salon wechseln können,
    // daher reicht die Admin-Rollenprüfung.

    const salon = await Salon.findById(salonIdToUpdate);
    if (!salon) {
      return res.status(404).json({ success: false, message: 'Salon nicht gefunden' });
    }

    // Erlaubte Felder für das Update definieren
    const allowedUpdates = [
      'name', 'address', 'phone', 'email', 'websiteUrl', 'logoUrl',
      'openingHours', 'datevSettings', 'socialMedia', 'bookingRules', 'invoiceSettings'
    ];
    const updates: Partial<ISalon> = {};

    // Nur erlaubte Felder aus dem Request Body übernehmen
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        // Spezielle Behandlung für verschachtelte Objekte, um nur vorhandene Unterfelder zu überschreiben
        if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key]) && salon[key as keyof ISalon]) {
           updates[key as keyof ISalon] = { ...salon[key as keyof ISalon], ...req.body[key] } as any;
        } else {
           (updates as any)[key] = req.body[key];
        }
      }
    }


    // Aktualisiere das Salon-Dokument mit den neuen Daten
    const updatedSalon = await Salon.findByIdAndUpdate(salonIdToUpdate, { $set: updates }, { new: true, runValidators: true });

    res.json({ success: true, salon: updatedSalon });
  } catch (e) {
    console.error('Update Salon Error:', e);
    // Detailliertere Fehlermeldung bei Validierungsfehlern
    if (e instanceof mongoose.Error.ValidationError) {
        return res.status(400).json({ success: false, message: 'Validierungsfehler', errors: e.errors });
    }
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Salons' });
  }
};
