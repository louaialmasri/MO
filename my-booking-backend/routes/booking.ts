import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import {
  createBooking,
  cancelBooking,
  getAllBookings,
  getUserBookings // 👈 hinzugefügt
} from '../controllers/bookingController'

const router = express.Router()

router.post('/', verifyToken, createBooking)
router.delete('/:id', verifyToken, cancelBooking)

router.get('/all', verifyToken, verifyAdmin, getAllBookings)
router.get('/user', verifyToken, getUserBookings)

export default router
