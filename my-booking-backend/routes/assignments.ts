import express from 'express'
import { verifyToken } from '../middlewares/authMiddleware'
import { verifyAdmin } from '../middlewares/adminMiddleware'
import {
  assignStaffToSalon, unassignStaffFromSalon, listStaffForSalon,
  assignServiceToSalon, unassignServiceFromSalon, listServicesForSalon
} from '../controllers/assignmentController'

const router = express.Router()
router.use(verifyToken, verifyAdmin)

router.get('/staff', listStaffForSalon)
router.post('/staff', assignStaffToSalon)
router.delete('/staff', unassignStaffFromSalon)

router.get('/services', listServicesForSalon)
router.post('/services', assignServiceToSalon)
router.delete('/services', unassignServiceFromSalon)

export default router
