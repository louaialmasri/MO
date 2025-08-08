import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import {
  createBooking,
  cancelBooking,
  getAllBookings,
  getUserBookings,
  updateBooking
} from '../controllers/bookingController'
import { getStaffBookings } from '../controllers/bookingController'
import { verifyStaff } from '../middlewares/staffMiddleware'

const router = express.Router()

router.post('/', verifyToken, createBooking)
router.delete('/:id', verifyToken, cancelBooking)

router.get('/all', verifyToken, getAllBookings)
router.get('/user', verifyToken, getUserBookings)

router.get('/staff', verifyToken, verifyStaff, getStaffBookings)

router.patch('/bookings/:id', verifyToken, updateBooking)

export default router
