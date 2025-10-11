// my-booking-backend/routes/export.ts
import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { activeSalon } from '../middlewares/activeSalon';
import { exportDatev } from '../controllers/exportController';

const router = express.Router();

router.get('/datev', verifyToken, verifyAdmin, activeSalon, exportDatev);

export default router;