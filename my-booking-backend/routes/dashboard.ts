import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { activeSalon } from '../middlewares/activeSalon';
import { getDashboardStats } from '../controllers/dashboardController';

const router = express.Router();

// Route ist nur für Admins im aktiven Salon zugänglich
router.get('/stats', verifyToken, verifyAdmin, activeSalon, getDashboardStats);

export default router;