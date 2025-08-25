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
  const users = await User.find({ role: 'staff' }).lean()
  res.json({ success:true, users })
})
router.post('/staff', async (req, res) => {
  const { email, password, name } = req.body
  const user = await User.create({ email, password, name, role: 'staff', salon: null }) // GLOBAL → keine Salonbindung
  res.status(201).json({ success:true, user })
})
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

export default router
