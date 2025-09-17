import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { activeSalon } from '../middlewares/activeSalon';
import { getPreCalculationData, createCashClosing, listCashClosings, getCashClosingById } from '../controllers/cashClosingController';

const router = express.Router();

// Alle Routen sind nur für Admins im aktiven Salon zugänglich
router.use(verifyToken, verifyAdmin, activeSalon);

router.get('/pre-calculation', getPreCalculationData);
router.post('/', createCashClosing);
router.get('/', listCashClosings);
router.get('/:id', getCashClosingById);

export default router;