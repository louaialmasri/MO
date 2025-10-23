import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { canAccessDashboard } from '../middlewares/checkPermission';
import { activeSalon } from '../middlewares/activeSalon';
import { getDashboardStats } from '../controllers/dashboardController';

const router = express.Router();

// Route ist jetzt NUR für Admins ODER Staff mit 'dashboard-access' im aktiven Salon zugänglich
// Reihenfolge der Middleware: Authentifizierung -> Berechtigung -> Salon-Kontext -> Controller
router.get('/stats', verifyToken, canAccessDashboard, activeSalon, getDashboardStats);

export default router;
