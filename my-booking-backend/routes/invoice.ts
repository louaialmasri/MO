import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { getInvoiceById, getUserInvoices, getAllInvoices, processPaymentForBooking } from '../controllers/invoiceController';


const router = express.Router();
router.use(verifyToken);

router.post('/checkout', verifyAdmin, processPaymentForBooking);

router.get('/user', getUserInvoices);
router.get('/all', verifyAdmin, getAllInvoices);
router.get('/:id', getInvoiceById);

export default router;