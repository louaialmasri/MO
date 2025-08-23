import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { getMySalons, createSalon } from '../controllers/salonController'
import { activeSalon } from '../middlewares/activeSalon'

const router = express.Router()
router.use(verifyToken, activeSalon)

router.get('/', getMySalons)   // Admin: eigene Salons
router.post('/', createSalon)  // Admin: neuen Salon anlegen

export default router
