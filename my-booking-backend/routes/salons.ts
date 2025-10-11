import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { getMySalons, createSalon, deleteSalon, migrateDefaultSalon, listSalonGuards, updateSalon, getCurrentSalon } from '../controllers/salonController'
import { activeSalon } from '../middlewares/activeSalon'
import { verifyAdmin } from '../middlewares/adminMiddleware';

const router = express.Router()
router.use(verifyToken, activeSalon)

router.get('/', getMySalons)
router.get('/guards', listSalonGuards)
router.post('/', createSalon)
router.delete('/:id', deleteSalon)
router.patch('/:id', updateSalon)
router.get('/current', verifyToken, activeSalon, getCurrentSalon);
router.patch('/current', verifyToken, verifyAdmin, activeSalon, updateSalon);

router.post('/migrate-default', migrateDefaultSalon)

export default router