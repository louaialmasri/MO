import { User } from '../models/User'
import { StaffSalon } from '../models/StaffSalon'
import { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Booking } from '../models/Booking'
import { Service } from '../models/Service' // Service importieren

export const getAllUsers = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { role } = req.query as { role?: string };
    let usersQuery = User.find();

    if (role) {
      usersQuery = User.find({ role: role });
      // ANPASSUNG: Hier wird jetzt "salon" für Admins und Staff populated, nicht "salons"
      if (role === 'staff' || role === 'admin') {
         usersQuery = usersQuery.populate('salon', 'name'); // Lädt den Namen des zugewiesenen Salons
      }
    }

    // Admins und Staff dürfen die Kundenliste abrufen (bleibt unverändert)
    if (role === 'user' && (req.user?.role === 'admin' || req.user?.role === 'staff')) {
      const users = await User.find({ role }).sort({ lastName: 1, firstName: 1 }).lean();
      return res.json({ success: true, users });
    }

    // Jetzt dürfen auch Mitarbeiter die Mitarbeiterliste abrufen
    // KORREKTUR: Populiert jetzt 'skills' korrekt und 'salon'
    if (role === 'staff' && (req.user?.role === 'admin' || req.user?.role === 'staff')) {
        const users = await User.find({ role })
            .populate({
                path: 'skills', // Den Pfad zum Feld angeben
                model: Service, // Das Modell, das referenziert wird
                select: 'title' // Nur den Titel des Services auswählen
            })
            .populate('salon', 'name') // Den Namen des Salons laden
            .lean();
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
    // Wenn die Rolle auf 'user' gesetzt wird, entfernen wir die Salon-Zuweisung und Berechtigungen
    const updateData: any = { role }
    if (role === 'user') {
        updateData.salon = null;
        updateData.permissions = []; // Berechtigungen zurücksetzen
    }
    // Hinweis: Die explizite Salon-Zuweisung für 'staff'/'admin' erfolgt besser über die Zuordnungslogik (/assignments).
    // Hier ändern wir nur die Rolle. Wenn jemand zu 'staff' wird, muss er danach einem Salon zugeordnet werden.

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password -dashboardPin'); // dashboardPin auch hier ausschließen
    if (!user) {
        return res.status(404).json({ message: 'Benutzer nicht gefunden' });
    }
    res.json({ user })
  } catch (err) {
    console.error('Rollen-Update fehlgeschlagen:', err)
    res.status(500).json({ message: 'Rollen-Update fehlgeschlagen' })
  }
}

export const createUserManually = async (req: Request & { salonId?: string }, res: Response) => {
  try {
    // KORREKTUR: Benötigte Felder explizit prüfen
    const { email, password, role = 'user', firstName, lastName, address = '', phone } = req.body;

    if (!email || !password || !firstName || !lastName || !phone) {
      return res.status(400).json({ message: 'E-Mail, Passwort, Vorname, Nachname und Telefon sind erforderlich' });
    }
    if (!['user', 'staff', 'admin'].includes(role)) {
       return res.status(400).json({ message: 'Ungültige Rolle angegeben' });
    }


    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({ message: 'E-Mail bereits registriert' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({
      email,
      password: hashedPassword,
      role: role,
      firstName,
      lastName,
      address,
      phone,
      // HINWEIS: Salon wird hier NICHT gesetzt. Die Zuweisung erfolgt über /assignments
      salon: null,
    })

    await newUser.save()
    // Sicherstellen, dass sensible Daten nicht zurückgegeben werden
    const safeUser = newUser.toObject();
    delete (safeUser as any).password;
    delete (safeUser as any).dashboardPin;
    delete (safeUser as any).__v;

    res.status(201).json({ success: true, user: safeUser })
  } catch (err: any) { // Expliziter Typ any für Fehlerobjekt
    console.error('Fehler beim manuellen Anlegen:', err)
     if (err.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validierungsfehler', details: err.errors });
    }
    res.status(500).json({ message: 'Interner Serverfehler' })
  }
}

export const deleteStaff = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  // ... (bestehender Code bleibt unverändert) ...
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success:false, message:'Ungültige ID' })

    const staff = await User.findById(id).select('role salon')
    if (!staff) return res.status(404).json({ success:false, message:'User nicht gefunden' })
    if (staff.role !== 'staff') return res.status(400).json({ success:false, message:'Nur Mitarbeiter können gelöscht werden' })

    // KORREKTUR: Prüft jetzt die Zuweisung über StaffSalon, nicht direkt am User
    const assignment = await StaffSalon.findOne({ staff: staff._id, salon: req.salonId });
    if (req.salonId && !assignment) {
        return res.status(403).json({ success: false, message: 'Mitarbeiter ist diesem Salon nicht (mehr) zugeordnet.' });
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
    
    // Zuerst Zuweisungen löschen
    await StaffSalon.deleteMany({ staff: staff._id });

    // Dann den User löschen
    await User.findByIdAndDelete(staff._id)

    return res.json({ success:true, message:'Mitarbeiter und Zuweisungen gelöscht' })
  } catch (e) {
    console.error('Fehler beim Löschen des Mitarbeiters:', e)
    res.status(500).json({ success:false, message:'Serverfehler beim Löschen' })
  }
};

export const deleteUserById = async (req: AuthRequest & { salonId?: string }, res: Response) => {
   // ... (bestehender Code bleibt unverändert) ...
   try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Ungültige ID' });

    // Nur Admins dürfen löschen
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Nur Admins dürfen Benutzer löschen.' });
    }

    const user = await User.findById(id).select('role');
    if (!user) return res.status(404).json({ success: false, message: 'User nicht gefunden' });

    // Zusätzliche Sicherheitsprüfung: Verhindern, dass der letzte Admin gelöscht wird? (Optional)
    // if (user.role === 'admin') {
    //   const adminCount = await User.countDocuments({ role: 'admin' });
    //   if (adminCount <= 1) {
    //     return res.status(400).json({ success: false, message: 'Der letzte Admin kann nicht gelöscht werden.' });
    //   }
    // }

    const now = new Date();
    const futureCount = await Booking.countDocuments({
      $or: [{ user: user._id }, { staff: user._id }],
      dateTime: { $gte: now }
    });
    if (futureCount > 0) {
      return res.status(409).json({ success: false, message: 'User hat noch zukünftige Termine', details: { future: futureCount } });
    }

    // Wenn es ein Staff-User ist, auch die Salon-Zuweisungen löschen
    if (user.role === 'staff') {
        await StaffSalon.deleteMany({ staff: user._id });
    }

    await User.findByIdAndDelete(id);
    return res.json({ success: true, message: 'User gelöscht' });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ success: false, message: 'Fehler beim Löschen' });
  }
};

export const updateUserSkills = async (req: Request, res: Response) => {
  // ... (bestehender Code bleibt unverändert) ...
  try {
    const { staffId } = req.params // Parameter umbenannt für Klarheit
    const { skills } = req.body

    if (!Array.isArray(skills)) {
      return res.status(400).json({ message: 'skills muss ein Array sein' })
    }
    // Prüft, ob staffId gültig ist UND alle skill IDs im Array gültig sind
     if (!mongoose.Types.ObjectId.isValid(staffId) || !skills.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'Ungültige ID im Request' })
    }


    const user = await User.findByIdAndUpdate(
      staffId, // Korrigierte Variable verwenden
      { skills }, // skills direkt setzen (Mongoose überschreibt das Array)
      { new: true, runValidators: true } // runValidators hinzugefügt
    ).populate({
        path: 'skills',
        model: Service,
        select: 'title'
    });


    if (!user) return res.status(404).json({ message: 'User nicht gefunden' })
    // Sicherstellen, dass sensible Daten nicht zurückgegeben werden
    const safeUser = user.toObject();
    delete (safeUser as any).password;
    delete (safeUser as any).dashboardPin;
    delete (safeUser as any).__v;

    res.json(safeUser) // Gibt den aktualisierten User zurück
  } catch (e: any) {
     if (e.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validierungsfehler', details: e.errors });
    }
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Skills' })
  }
};


export const updateStaffPermissions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // Die ID des zu bearbeitenden Staff-Users
        const { permissions } = req.body; // Das Array der neuen Berechtigungen

        // 1. Validierung der Eingabe
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Ungültige Benutzer-ID.' });
        }
        if (!Array.isArray(permissions) || !permissions.every(p => typeof p === 'string')) {
            return res.status(400).json({ success: false, message: 'Berechtigungen müssen als Array von Strings übergeben werden.' });
        }

        // 2. Benutzer finden und sicherstellen, dass es ein Staff-Benutzer ist
        const staffUser = await User.findById(id).select('role permissions').lean(); // Wähle Rolle und Permissions aus
        if (!staffUser) {
            return res.status(404).json({ success: false, message: 'Mitarbeiter nicht gefunden.' });
        }
        if (staffUser.role !== 'staff') {
            return res.status(400).json({ success: false, message: 'Berechtigungen können nur für Mitarbeiter gesetzt werden.' });
        }

        const updateData: { permissions: string[]; dashboardPin?: null } = {
            permissions: permissions
        };

        // Prüfen, ob die Dashboard-Berechtigung entfernt wird.
        // Dafür holen wir den aktuellen Zustand des Users, bevor wir updaten.
        
        const hadPermission = staffUser?.permissions?.includes('dashboard-access');
        const hasPermissionNow = permissions.includes('dashboard-access');

        if (hadPermission && !hasPermissionNow) {
            // Die Berechtigung wurde gerade entfernt, also löschen wir die PIN.
            updateData.dashboardPin = null; 
        }

        // 3. Berechtigungen aktualisieren
        //    Wir verwenden $set, um das vorhandene Array komplett zu überschreiben.
        //    Man könnte auch $addToSet/$pull verwenden, aber $set ist einfacher für eine komplette Aktualisierung.
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { $set: { permissions: permissions } },
            { new: true, runValidators: true } // runValidators prüft Schema-Typen
        ).select('-password -dashboardPin'); // Sensible Daten ausschließen

        if (!updatedUser) {
             // Sollte theoretisch nicht passieren, da wir den User vorher gefunden haben
             return res.status(404).json({ success: false, message: 'Mitarbeiter nach Update nicht gefunden.' });
        }


        res.json({ success: true, user: updatedUser });

    } catch (error: any) {
        console.error("Fehler beim Aktualisieren der Berechtigungen:", error);
         if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validierungsfehler', details: error.errors });
        }
        res.status(500).json({ success: false, message: 'Serverfehler beim Aktualisieren der Berechtigungen.' });
    }
};
// --- ENDE NEUE FUNKTION ---


export const getOrCreateWalkInCustomer = async (req: AuthRequest, res: Response) => {
  // ... (bestehender Code bleibt unverändert) ...
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
    ).select('-password -dashboardPin'); // Sensible Daten direkt ausschließen

    res.json(walkInCustomer);

  } catch (error) {
    console.error('FATAL ERROR in getOrCreateWalkInCustomer:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen oder Erstellen des Laufkunden-Kontos' });
  }
};

export const getLastBookingForUser = async (req: AuthRequest, res: Response) => {
   try {
    const { userId } = req.params;

    // Nur Admins oder der betroffene User selbst dürfen dies abrufen
     if (req.user?.role !== 'admin' && req.user?.userId !== userId) {
         return res.status(403).json({ success: false, message: 'Nicht autorisiert.' });
     }


    const lastBooking = await Booking.findOne({
      user: userId,
      status: { $in: ['confirmed', 'paid', 'completed'] }
    })
    .sort({ dateTime: -1 })
    .select('service staff') // Nur die IDs holen
    .lean();

    if (!lastBooking) {
      return res.status(404).json({ message: 'Keine vorherigen Termine gefunden.' });
    }

     // KORREKTUR: Gebe nur die IDs zurück, wie vom Frontend erwartet
     res.json({
        service: lastBooking.service,
        staff: lastBooking.staff
     });
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

    // Wer darf eine PIN setzen?
    // 1. Ein Admin (für sich selbst)
    // 2. Ein Mitarbeiter (staff), der die 'dashboard-access' Berechtigung hat (für sich selbst)
    const isStaffWithPermission = user.role === 'staff' && user.permissions?.includes('dashboard-access');

    if (user.role !== 'admin' && !isStaffWithPermission) {
        return res.status(403).json({ message: 'Nicht autorisiert, eine PIN zu setzen.' });
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
    
    await User.findByIdAndUpdate(userId, { dashboardPin: pinHash });

    res.json({ success: true, message: 'Dashboard-PIN erfolgreich gesetzt.' });

  } catch (error) {
    console.error('Fehler in setDashboardPin:', error);
    res.status(500).json({ message: 'Serverfehler beim Setzen der PIN.' });
  }
};

export const verifyDashboardPin = async (req: AuthRequest, res: Response) => {
  // ... (bestehender Code bleibt unverändert) ...
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
      // KORREKTUR: Auch Staff darf PIN verifizieren, wenn er das Recht hat
      // Wir prüfen das später in der neuen Middleware. Hier nur Admin ODER Staff erlauben.
       if (user?.role !== 'staff') {
           return res.status(403).json({ message: 'Nicht autorisiert.' });
       }
    }
    
    // KORREKTUR: Wenn User Staff ist, aber KEINE PIN gesetzt ist, Fehler werfen.
    // Admins dürfen immer eine PIN setzen.
    if(!user.dashboardPin && user.role === 'staff') {
        return res.status(403).json({ message: 'Für diesen Benutzer ist keine PIN gesetzt.' });
    }
    // Wenn Admin und keine PIN, darf er trotzdem rein (kann sie ja setzen)
    if (!user.dashboardPin && user.role === 'admin') {
         return res.json({ success: true, message: 'Admin ohne PIN, Zugriff gewährt.' });
    }


    const isPinCorrect = await bcrypt.compare(pin, user.dashboardPin!); // Non-null assertion, da wir vorher geprüft haben
    if (!isPinCorrect) {
      return res.status(401).json({ message: 'Ungültige PIN.' });
    }

    res.json({ success: true, message: 'PIN verifiziert.' });

  } catch (error) {
    console.error('Fehler in verifyDashboardPin:', error);
    res.status(500).json({ message: 'Serverfehler beim Überprüfen der PIN.' });
  }
};

// my-booking-backend/controllers/userController.ts

export const getMe = async (req: AuthRequest, res: Response) => {
   try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }
    
    const user = await User.findById(req.user.userId).select('-password +permissions +dashboardPin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
    }

    // Erstelle ein sicheres User-Objekt für die Antwort
    const safeUser: any = user.toObject();
    // Füge die neue Eigenschaft hinzu
    safeUser.hasDashboardPin = !!safeUser.dashboardPin;
    // Entferne den Hash, bevor er gesendet wird
    delete safeUser.dashboardPin;
    delete (safeUser as any).password;

    res.json({ success: true, user: safeUser });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Serverfehler' });
  }
};

export const updateMe = async (req: AuthRequest, res: Response) => {
  // ... (bestehender Code bleibt unverändert) ...
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
    }
    // KORREKTUR: Nur erlaubte Felder updaten lassen
    const { firstName, lastName, address, phone } = req.body;
    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;


    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData, // Nur erlaubte Felder übergeben
      { new: true, runValidators: true }
    ).select('-password -dashboardPin +permissions'); // Permissions mit zurückgeben


    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'Benutzer nicht gefunden' });
    }
    res.json({ success: true, user: updatedUser });
  } catch (error: any) { // Expliziter Typ any für Fehlerobjekt
     if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validierungsfehler', details: error.errors });
    }
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Profils' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  // ... (bestehender Code bleibt unverändert) ...
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Nicht authentifiziert' });
        }
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Aktuelles und neues Passwort sind erforderlich.' });
        }
         // Optional: Mindestlänge für neues Passwort prüfen
        if (newPassword.length < 6) {
             return res.status(400).json({ message: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' });
        }


        const user = await User.findById(req.user.userId).select('+password');
        if (!user || !user.password) {
             // Diese Prüfung ist wichtig, falls das Passwort-Feld aus irgendeinem Grund fehlt
            console.error(`User ${req.user.userId} hat kein Passwort-Feld in der DB.`);
            return res.status(500).json({ message: 'Benutzerdaten unvollständig.' });
        }


        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Das aktuelle Passwort ist nicht korrekt.' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true, message: 'Passwort erfolgreich geändert.' });

    } catch (error) {
        console.error("Fehler bei changePassword:", error); // Besseres Logging
        res.status(500).json({ success: false, message: 'Fehler beim Ändern des Passworts.' });
    }
};
