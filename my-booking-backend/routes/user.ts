import express from 'express'
import { User } from '../models/User'

const router = express.Router()

router.get('/staff', async (req, res) => {
  try {
    const staffUsers = await User.find({ role: 'staff' })
    res.status(200).json({ users: staffUsers })
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Mitarbeiter' })
  }
})

export default router
