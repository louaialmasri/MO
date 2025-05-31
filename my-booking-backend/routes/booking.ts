import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import { createBooking, getBookings, cancelBooking, getAllBookings } from '../controllers/bookingController'

const router = express.Router()

router.post('/', verifyToken, createBooking)
router.get('/', verifyToken, getBookings)
router.delete('/:id', verifyToken, cancelBooking)

// ➡ Admin-Only-Route:
router.get('/all', verifyToken, verifyAdmin, getAllBookings)

export default router
