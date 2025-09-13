import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { getInvoiceById, getUserInvoices, getAllInvoices } from '../controllers/invoiceController';

const router = express.Router();
router.use(verifyToken);

router.get('/user', getUserInvoices);
router.get('/all', verifyAdmin, getAllInvoices); // NEUE ZEILE
router.get('/:id', getInvoiceById);

export default router;