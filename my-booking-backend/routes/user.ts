import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { getAllUsers, updateUserRole, updateUserSkills, deleteStaff } from '../controllers/userController'
import { User } from '../models/User'
import { createUserManually } from '../controllers/userController'
import { activeSalon } from '../middlewares/activeSalon'


const router = express.Router()

router.use(activeSalon)
router.get('/', verifyToken, getAllUsers)
router.patch('/:id/role', verifyToken, verifyAdmin, updateUserRole)
router.post('/create', verifyToken, verifyAdmin, createUserManually)
router.patch('/:id/skills', verifyToken, verifyAdmin, updateUserSkills)
router.delete('/:id', verifyToken, verifyAdmin, deleteStaff)
  


router.get('/staff', async (req, res) => {
  try {
    const staffUsers = await User.find({ role: 'staff' })
    res.status(200).json({ users: staffUsers })
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Mitarbeiter' })
  }
})

export default router
