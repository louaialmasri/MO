import { User } from '../models/user'
import { StaffSalon } from '../models/StaffSalon'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Booking } from '../models/Booking'

export const getAllUsers = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { role } = req.query as { role?: string };
    let usersQuery = User.find();

    if (role) {
      usersQuery = User.find({ role: role });
      if (role === 'staff') {
        usersQuery = usersQuery.populate('salons'); // Lädt die Salon-Daten für jeden Mitarbeiter
      }
    }

    // Admins und Staff dürfen die Kundenliste abrufen (bleibt unverändert)
    if (role === 'user' && (req.user?.role === 'admin' || req.user?.role === 'staff')) {
      const users = await User.find({ role }).sort({ lastName: 1, firstName: 1 }).lean();
      return res.json({ success: true, users });
    }

    // Jetzt dürfen auch Mitarbeiter die Mitarbeiterliste abrufen
    if (role === 'staff' && (req.user?.role === 'admin' || req.user?.role === 'staff')) {
      const users = await User.find({ role }).populate('skills').lean();
      return res.json({ success: true, users });
    }

    // Alle anderen Anfragen werden abgelehnt
    return res.status(403).json({ success: false, message: 'Nicht autorisiert für diese Anfrage' });

  } catch (e) {
    console.error('getAllUsers error', e);
    return res.status(500).json({ success: false, message: 'Fehler beim Laden der Nutzer' });
  }
};

export const updateUserRole = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  const { id } = req.params
  const { role } = req.body

  if (!['user', 'staff', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Ungültige Rolle' })
  }

  try {
    const updateData: any = { role }
    if (role === 'staff') {
      if (req.salonId) updateData.salon = req.salonId
    } else {
      updateData.salon = null
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password')
    res.json({ user })
  } catch (err) {
    console.error('Rollen-Update fehlgeschlagen:', err)
    res.status(500).json({ message: 'Rollen-Update fehlgeschlagen' })
  }
}

export const createUserManually = async (req: Request & { salonId?: string }, res: Response) => {
  try {
    const { email, password, role, firstName, lastName, address, phone } = req.body

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: 'E-Mail bereits registriert' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({
      email,
      password: hashedPassword,
      role: role || 'user',
      firstName, // Korrigiert von 'name'
      lastName,  // Korrigiert
      address,
      phone,
      salon: req.salonId ?? null,
    })

    await newUser.save()
    res.status(201).json({ success: true, user: newUser })
  } catch (err) {
    console.error('Fehler beim manuellen Anlegen:', err)
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
}

export const deleteStaff = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success:false, message:'Ungültige ID' })

    const staff = await User.findById(id).select('role salon')
    if (!staff) return res.status(404).json({ success:false, message:'User nicht gefunden' })
    if (staff.role !== 'staff') return res.status(400).json({ success:false, message:'Nur Mitarbeiter können gelöscht werden' })

    if (req.salonId && String(staff.salon) !== String(req.salonId)) {
      return res.status(403).json({ success:false, message:'Falscher Salon' })
    }

    const now = new Date()
    const future = await Booking.countDocuments({ staff: staff._id, dateTime: { $gte: now } })
    if (future > 0) {
      return res.status(409).json({
        success:false,
        message:'Mitarbeiter hat noch zukünftige Termine. Bitte umbuchen/stornieren.',
        details:{ futureBookings: future }
      })
    }

    await User.findByIdAndDelete(staff._id)

    return res.json({ success:true, message:'Mitarbeiter gelöscht' })
  } catch (e) {
    console.error('Fehler beim Löschen des Mitarbeiters:', e)
    res.status(500).json({ success:false, message:'Serverfehler beim Löschen' })
  }
}

export const deleteUserById = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success:false, message:'Ungültige ID' })

    const user = await User.findById(id).select('role salon')
    if (!user) return res.status(404).json({ success:false, message:'User nicht gefunden' })

    if (req.salonId && user.salon && String(user.salon) !== String(req.salonId)) {
      return res.status(403).json({ success:false, message:'Nicht autorisiert (Salon)' })
    }

    const now = new Date()
    const futureCount = await Booking.countDocuments({
      $or: [{ user: user._id }, { staff: user._id }],
      dateTime: { $gte: now }
    })
    if (futureCount > 0) {
      return res.status(409).json({ success:false, message:'User hat noch zukünftige Termine', details:{ future: futureCount } })
    }

    await User.findByIdAndDelete(id)
    return res.json({ success:true, message:'User gelöscht' })
  } catch (e:any) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Fehler beim Löschen' })
  }
}

export const updateUserSkills = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { skills } = req.body

    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: 'skills muss ein Array sein' })
    }
    if (!mongoose.Types.ObjectId.isValid(id) || !skills.every(mongoose.Types.ObjectId.isValid)) {
      return res.status(400).json({ message: 'Ungültige ID' })
    }

    const user = await User.findByIdAndUpdate(
      id,
      { skills },
      { new: true }
    ).populate('skills')

    if (!user) return res.status(404).json({ message: 'User nicht gefunden' })
    res.json(user)
  } catch (e) {
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Skills' })
  }
}

export const getOrCreateWalkInCustomer = async (req: AuthRequest, res: Response) => {
  try {
    const walkInEmail = 'laufkunde@shop.local';
    
    // Wir verwenden findOneAndUpdate mit upsert: true. Das ist der sicherste Weg.
    // Es sucht den User und erstellt ihn atomar, wenn er nicht existiert.
    const walkInCustomer = await User.findOneAndUpdate(
      { email: walkInEmail },
      {
        $setOnInsert: {
          email: walkInEmail,
          firstName: 'Laufkunde',
          lastName: ' - ',
          phone: '0000000000', // Pflichtfeld
          role: 'user',    // Korrekte Rolle
          password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
        }
      },
      {
        new: true,    // Gibt das neue oder gefundene Dokument zurück
        upsert: true, // Erstellt das Dokument, wenn es nicht gefunden wird
        runValidators: true // Führt die Schema-Validierung beim Erstellen aus
      }
    );

    res.json(walkInCustomer);

  } catch (error) {
    console.error('FATAL ERROR in getOrCreateWalkInCustomer:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen oder Erstellen des Laufkunden-Kontos' });
  }
};

export const getLastBookingForUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const lastBooking = await Booking.findOne({
      user: userId,
      status: { $in: ['confirmed', 'paid', 'completed'] }
    })
    .sort({ dateTime: -1 })
    .select('service staff')
    .lean();

    if (!lastBooking) {
      return res.status(404).json({ message: 'Keine vorherigen Termine gefunden.' });
    }

    res.json(lastBooking);
  } catch (error) {
    res.status(500).json({ message: 'Serverfehler beim Abrufen des letzten Termins.' });
  }
};

export const setDashboardPin = async (req: AuthRequest, res: Response) => {
  try {
    const { password, pin } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Authentifizierungstoken fehlt oder ist ungültig.' });
    }

    if (!password || !pin || !/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ message: 'Passwort und eine 4- bis 6-stellige PIN sind erforderlich.' });
    }

    const user = await User.findById(userId).select('+password +role');
    if (!user) {
      return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Nicht autorisiert.' });
    }

    if (!user.password) {
      console.error(`Admin user ${userId} has no password in database.`);
      return res.status(500).json({ message: 'Server-Konfigurationsfehler: Admin-Konto hat kein Passwort.' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Ungültiges Passwort.' });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    
    // KORREKTUR: Verwende findByIdAndUpdate statt .save()
    await User.findByIdAndUpdate(userId, { dashboardPin: pinHash });

    res.json({ success: true, message: 'Dashboard-PIN erfolgreich gesetzt.' });

  } catch (error) {
    console.error('Fehler in setDashboardPin:', error);
    res.status(500).json({ message: 'Serverfehler beim Setzen der PIN.' });
  }
};

export const verifyDashboardPin = async (req: AuthRequest, res: Response) => {
  try {
    const { pin } = req.body;
    const userId = req.user?.userId;

    if (!pin) {
      return res.status(400).json({ message: 'PIN ist erforderlich.' });
    }
     if (!userId) {
      return res.status(401).json({ message: 'Authentifizierungstoken fehlt oder ist ungültig.' });
    }

    const user = await User.findById(userId).select('+dashboardPin +role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Nicht autorisiert.' });
    }
    
    if(!user.dashboardPin) {
        return res.status(403).json({ message: 'Für diesen Benutzer ist keine PIN gesetzt.' });
    }

    const isPinCorrect = await bcrypt.compare(pin, user.dashboardPin);
    if (!isPinCorrect) {
      return res.status(401).json({ message: 'Ungültige PIN.' });
    }

    res.json({ success: true, message: 'PIN verifiziert.' });

  } catch (error) {
    console.error('Fehler in verifyDashboardPin:', error);
    res.status(500).json({ message: 'Serverfehler beim Überprüfen der PIN.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }
    const user = await User.findById(req.user.userId).select('-password -dashboardPin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }
    const { firstName, lastName, address, phone } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { firstName, lastName, address, phone },
      { new: true, runValidators: true }
    ).select('-password -dashboardPin');

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    res.json({ success: true, user: updatedUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Profils' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
        }
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Aktuelles und neues Passwort sind erforderlich.' });
        }

        const user = await User.findById(req.user.userId).select('+password');
        if (!user || !user.password) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden.' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Das aktuelle Passwort ist nicht korrekt.' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true, message: 'Passwort erfolgreich geändert.' });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Ändern des Passworts.' });
    }
};