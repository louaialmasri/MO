import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { activeSalon } from '../middlewares/activeSalon';
import { getCashClosingPreview, createCashClosing, listCashClosings, getCashClosingById } from '../controllers/cashClosingController';

const router = express.Router();

// Alle Routen sind nur für Admins im aktiven Salon zugänglich
router.use(verifyToken, verifyAdmin, activeSalon);

router.post('/', createCashClosing);
router.get('/', listCashClosings);
router.get('/:id', getCashClosingById);
router.get('/preview', getCashClosingPreview);

export default router;