import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { getAllServices, createService, deleteService, updateService } from '../controllers/serviceController'

const router = express.Router()

// ➡ Öffentlich abrufbar (z.B. für Buchungs-Formulare)
router.get('/', getAllServices)

// ➡ Nur Admin
router.post('/', verifyToken, verifyAdmin, createService)
router.delete('/:id', verifyToken, verifyAdmin, deleteService)
router.patch('/:id', verifyToken, verifyAdmin, updateService)

export default router
