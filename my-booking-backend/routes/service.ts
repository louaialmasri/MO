import express from 'express'
// --- ALT: verifyToken & verifyAdmin hier nicht mehr importieren ---
// import { verifyToken } from '../middlewares/authMiddleware'
// import { verifyAdmin } from '../middlewares/adminMiddleware'
// --- NEU: verifyAdmin importieren ---
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { listServices, createService, deleteService, updateService } from '../controllers/serviceController'

const router = express.Router()

// Nur diese Liste verwenden – sie respektiert req.salonId (aus activeSalon)
// GET ist öffentlich (wird von Kasse UND Booking-Seite genutzt)
router.get('/', listServices)

// Admin-CRUD (verifyToken ist global)
router.post('/', verifyAdmin, createService)
router.patch('/:id', verifyAdmin, updateService)
router.delete('/:id', verifyAdmin, deleteService)

export default router
