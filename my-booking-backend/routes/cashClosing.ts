import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { activeSalon } from '../middlewares/activeSalon';
import { getCashClosingPreview, createCashClosing, listCashClosings, getCashClosingById, cancelCashClosing } from '../controllers/cashClosingController';

const router = express.Router();

// Alle Routen sind nur für Admins im aktiven Salon zugänglich
router.use(verifyToken, verifyAdmin, activeSalon);

// KORRIGIERTE REIHENFOLGE: Spezifische Routen zuerst
router.get('/preview', getCashClosingPreview);
router.get('/', listCashClosings);
router.post('/', createCashClosing);

// Dynamische Routen (mit Parametern) zuletzt
router.get('/:id', getCashClosingById);

// Route zum Stornieren
router.patch('/:id/cancel', cancelCashClosing);



export default router;