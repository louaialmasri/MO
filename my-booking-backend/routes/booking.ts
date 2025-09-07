import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import {
  createBooking,
  cancelBooking,
  getAllBookings,
  getUserBookings,
  updateBooking,
  updateBookingController
} from '../controllers/bookingController'
import { getStaffBookings } from '../controllers/bookingController'
import { verifyStaff } from '../middlewares/staffMiddleware'
import { activeSalon } from '../middlewares/activeSalon'


const router = express.Router()

router.use(activeSalon)

router.post('/', verifyToken, createBooking)
router.delete('/:id', verifyToken, cancelBooking)

router.get('/all', verifyToken, getAllBookings)
router.get('/user', verifyToken, getUserBookings)
router.get('/', getAllBookings)
router.get('/staff', verifyToken, verifyStaff, getStaffBookings)

router.patch('/bookings/:id', verifyToken, updateBooking)

router.patch('/:id', verifyToken, verifyAdmin, updateBookingController)

export default router
