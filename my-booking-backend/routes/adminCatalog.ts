// routes/adminCatalog.ts
import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { User } from '../models/User'
import { Service } from '../models/Service'

const router = express.Router()
router.use(verifyToken, verifyAdmin)

// Globale Staff-Liste (nur role=staff)
router.get('/staff-all', async (_, res) => {
  // KORREKTUR: Leerer Filter {} holt ALLE Benutzer aus der Datenbank.
  const users = await User.find({}).lean() 
  res.json({ success:true, users })
})
// in routes/adminCatalog.ts

router.post('/staff', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // 1. Validierung und Prüfung auf Duplikate
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'E-Mail und Passwort sind erforderlich.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Ein Benutzer mit dieser E-Mail-Adresse existiert bereits.' });
    }

    // Erst jetzt den Benutzer erstellen (Passwort wird idealerweise gehasht)
    // HINWEIS: Du solltest Passwörter immer hashen, bevor du sie speicherst!
    // const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password, // Ersetze dies durch hashedPassword, wenn du bcrypt verwendest
      name,
      role: 'staff',
      salon: null
    });

    return res.status(201).json({ success: true, user });

  } catch (err: any) {
    // 2. Alle anderen Fehler sicher abfangen
    console.error('Fehler beim Erstellen des globalen Staff-Mitglieds:', err);
    return res.status(500).json({ success: false, message: 'Ein interner Serverfehler ist aufgetreten.' });
  }
});
router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.json({ success:true })
})

// Globale Services
router.get('/services-all', async (_, res) => {
  const services = await Service.find({}).lean()
  res.json({ success:true, services })
})
router.post('/services', async (req, res) => {
  const { title, description, price, duration } = req.body
  const service = await Service.create({ title, description, price, duration, salon: null }) // GLOBAL
  res.status(201).json({ success:true, service })
})
router.delete('/services/:id', async (req, res) => {
  await Service.findByIdAndDelete(req.params.id)
  res.json({ success:true })
})

router.patch('/services/:id', async (req, res) => {
  try {
    const { title, description, price, duration } = req.body;
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { title, description, price, duration },
      { new: true, runValidators: true } // new:true gibt das aktualisierte Dokument zurück
    );
    if (!updatedService) {
      return res.status(404).json({ success: false, message: 'Service nicht gefunden' });
    }
    res.json({ success: true, service: updatedService });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren des Services' });
  }
});

export default router
