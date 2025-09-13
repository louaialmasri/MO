import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
// updateSalon wird importiert
import { getMySalons, createSalon, deleteSalon, migrateDefaultSalon, listSalonGuards, updateSalon } from '../controllers/salonController'
import { activeSalon } from '../middlewares/activeSalon'

const router = express.Router()
router.use(verifyToken, activeSalon)

router.get('/', getMySalons)
router.get('/guards', listSalonGuards)
router.post('/', createSalon)
router.delete('/:id', deleteSalon)
router.patch('/:id', updateSalon) // NEUE ZEILE

router.post('/migrate-default', migrateDefaultSalon)

export default router