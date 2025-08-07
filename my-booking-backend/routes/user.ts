import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { getAllUsers, updateUserRole } from '../controllers/userController'
import { User } from '../models/User'

const router = express.Router()

router.get('/', verifyToken, verifyAdmin, getAllUsers)
router.patch('/:id/role', verifyToken, verifyAdmin, updateUserRole)

router.get('/staff', async (req, res) => {
  try {
    const staffUsers = await User.find({ role: 'staff' })
    res.status(200).json({ users: staffUsers })
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Mitarbeiter' })
  }
})

export default router
