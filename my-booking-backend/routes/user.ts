import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { User } from '../models/User'
import { getAllUsers, updateUserRole, updateUserSkills, deleteStaff, createUserManually, getOrCreateWalkInCustomer } from '../controllers/userController'
import { activeSalon } from '../middlewares/activeSalon'

const router = express.Router()
router.use(activeSalon)

router.get('/', verifyToken, getAllUsers)
router.post('/create', verifyToken, verifyAdmin, createUserManually)
router.patch('/:id/role', verifyToken, verifyAdmin, updateUserRole)
router.patch('/:id/skills', verifyToken, verifyAdmin, updateUserSkills)
router.delete('/:id', verifyToken, verifyAdmin, deleteStaff)
router.get('/walk-in', verifyToken, verifyAdmin, getOrCreateWalkInCustomer);


// Staff-Liste im aktiven Salon
router.get('/staff', verifyToken, async (req: any, res) => {
  try {
    const filter: any = { role: 'staff' }
    if (req.salonId) filter.salon = req.salonId
    else return res.json({ users: [] }) // sicherer Default
    const staffUsers = await User.find(filter)
    res.status(200).json({ users: staffUsers })
  } catch (err) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Mitarbeiter' })
  }
})

export default router
