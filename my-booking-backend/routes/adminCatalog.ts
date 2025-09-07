// routes/adminCatalog.ts
import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { User } from '../models/User'
import { Service } from '../models/Service'
import bcrypt from 'bcrypt';

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
    // Hol dir alle benötigten Daten aus dem Request Body
    const { email, password, firstName, lastName } = req.body;

    // Validierung
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Alle Felder sind erforderlich' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStaff = await User.create({
      email,
      password: hashedPassword,
      firstName, // Feld übergeben
      lastName,  // Feld übergeben
      role: 'staff',
    });

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Fehler beim Erstellen des globalen Staff-Mitglieds:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Staff-Mitglieds' });
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
