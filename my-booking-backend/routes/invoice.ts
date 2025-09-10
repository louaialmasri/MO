import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { getInvoiceById, getUserInvoices } from '../controllers/invoiceController';

const router = express.Router();
router.use(verifyToken);

router.get('/user', getUserInvoices);
router.get('/:id', getInvoiceById);

export default router;