import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { listServices, createService, deleteService, updateService } from '../controllers/serviceController'

const router = express.Router()

// Nur diese Liste verwenden – sie respektiert req.salonId (aus activeSalon)
router.get('/', listServices)

// Admin-CRUD
router.post('/', verifyToken, verifyAdmin, createService)
router.patch('/:id', verifyToken, verifyAdmin, updateService)
router.delete('/:id', verifyToken, verifyAdmin, deleteService)

export default router
