import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { createAvailability, getAvailability, deleteAvailability, updateAvailability } from '../controllers/availabilityController'

const router = express.Router()
router.use(verifyToken)

router.post('/', createAvailability)
router.get('/', getAvailability)
router.patch('/:id', updateAvailability)
router.delete('/:id', deleteAvailability)

export default router
