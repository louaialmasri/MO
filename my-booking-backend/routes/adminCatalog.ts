// my-booking-backend/routes/adminCatalog.ts

// routes/adminCatalog.ts
import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { User } from '../models/User'
import { Service } from '../models/Service'
import bcrypt from 'bcrypt';

const router = express.Router()
// KORREKTUR: Middleware wird jetzt pro Route angewendet
router.use(verifyToken);

// Globale Staff-Liste (nur Admins)
router.get('/staff-all', verifyAdmin, async (_, res) => {
  const users = await User.find({}).lean() 
  res.json({ success:true, users })
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

// Admin-spezifische Service-Endpunkte
router.post('/services', verifyAdmin, async (req, res) => {
  const { title, description, price, duration } = req.body
  const service = await Service.create({ title, description, price, duration, salon: null }) // GLOBAL
  res.status(201).json({ success:true, service })
})

router.delete('/services/:id', verifyAdmin, async (req, res) => {
  await Service.findByIdAndDelete(req.params.id)
  res.json({ success:true })
})

router.patch('/services/:id', verifyAdmin, async (req, res) => {
  try {
    const { title, description, price, duration } = req.body;
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      { title, description, price, duration },
      { new: true, runValidators: true }
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