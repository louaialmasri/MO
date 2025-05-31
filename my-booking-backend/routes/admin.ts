import express from 'express'
import { authOnly, adminOnly } from '../middlewares/auth'

const router = express.Router()

router.get('/admin/data', authOnly, adminOnly, (_req, res) => {
  res.json({ message: 'Willkommen im Admin-Bereich 🎉' })
})

export default router
