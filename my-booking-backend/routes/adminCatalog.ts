import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { User } from '../models/User'
import { Service } from '../models/Service'
import bcrypt from 'bcrypt';
import { Salon } from '../models/Salon'
import mongoose from 'mongoose'

const router = express.Router()
// KORREKTUR: Middleware wird jetzt pro Route angewendet
router.use(verifyToken);

// Globale Staff-Liste (nur Admins)
router.get('/staff-all', verifyAdmin, async (_, res) => {
  const users = await User.find({}).lean() 
  const services = await Service.find({}).populate('category').lean()
  res.json({ success:true, users, services })
})

router.post('/staff', verifyAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Alle Felder sind erforderlich' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newStaff = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'staff',
    });

    res.status(201).json(newStaff);
  } catch (error) {
    console.error('Fehler beim Erstellen des globalen Staff-Mitglieds:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Staff-Mitglieds' });
  }
});

router.delete('/users/:id', verifyAdmin, async (req, res) => {
  await User.findByIdAndDelete(req.params.id)
  res.json({ success:true })
})

// Globale Services (alle eingeloggten Benutzer)
router.get('/services-all', async (_, res) => {
  const services = await Service.find({}).lean()
  res.json({ success:true, services })
})

router.get('/g-services/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).send('Ungültige Service ID');
        }
        // Auch hier wird .populate('category') hinzugefügt
        const service = await Service.findById(req.params.id).populate('category');
        if (!service) {
            return res.status(404).send('Service nicht gefunden');
        }
        res.json(service);
    } catch (error: any) {
        res.status(500).json({ message: 'Fehler beim Abrufen des Services', error: error.message });
    }
});

// Admin-spezifische Service-Endpunkte
router.post('/g-services', async (req, res) => {
  try {
    const { title, description, price, duration, category } = req.body
    if (!title || !price || !duration || !category) {
      return res.status(400).send('Titel, Preis, Dauer und Kategorie sind erforderlich')
    }
    const newService = new Service({ title, description, price, duration, category })
    await newService.save()
    
    // KORREKTUR 2: Den gerade erstellten Service vor dem Senden mit den Kategorie-Daten anreichern.
    await newService.populate('category');

    res.status(201).json(newService)
  } catch (error: any) {
    res.status(500).json({ message: 'Fehler beim Erstellen des Services', error: error.message })
  }
})

// PUT /api/admin/g-services/:id - Aktualisiert einen globalen Service
router.put('/g-services/:id', async (req, res) => {
  try {
    const { title, description, price, duration, category } = req.body
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { title, description, price, duration, category },
      { new: true }
    )
    if (!updatedService) return res.status(404).send('Service nicht gefunden')
    res.json(updatedService)
  } catch (error: any) {
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Services', error: error.message })
  }
})

router.delete('/g-services/:id', verifyAdmin, async (req, res) => {
  await Service.findByIdAndDelete(req.params.id)
  res.json({ success:true })
})

export default router