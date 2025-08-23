import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { getTimeslots } from '../controllers/timeslotController'

const router = express.Router()
router.use(verifyToken)
router.get('/', getTimeslots)

export default router
