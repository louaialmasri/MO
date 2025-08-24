import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { getMySalons, createSalon, deleteSalon, migrateDefaultSalon  } from '../controllers/salonController'
import { activeSalon } from '../middlewares/activeSalon'

const router = express.Router()
router.use(verifyToken, activeSalon)

router.get('/', getMySalons)   // Admin: eigene Salons
router.post('/', createSalon)  // Admin: neuen Salon anlegen
router.delete('/:id', deleteSalon)

router.post('/migrate-default', migrateDefaultSalon)

export default router
