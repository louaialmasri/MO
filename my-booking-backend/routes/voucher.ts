import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { activeSalon } from '../middlewares/activeSalon';
import { validateVoucher } from '../controllers/voucherController';

const router = express.Router();

// Route zum Validieren eines Gutscheins
router.get('/validate/:code', verifyToken, activeSalon, validateVoucher);

export default router;