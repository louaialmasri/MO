import express from 'express';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { getInvoiceById, getUserInvoices, getAllInvoices, processPaymentForBooking, createInvoice } from '../controllers/invoiceController';
import { activeSalon } from '../middlewares/activeSalon';


const router = express.Router();
router.use(verifyToken);

router.post('/checkout', verifyAdmin, processPaymentForBooking);
router.post('/', verifyToken, activeSalon, createInvoice);


router.get('/user', getUserInvoices);
router.get('/all', verifyAdmin, getAllInvoices);
router.get('/:id', getInvoiceById);

export default router;