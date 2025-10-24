import express from 'express';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../controllers/productController'; // updateProduct importieren
// --- ALT: verifyToken & verifyAdmin hier nicht mehr importieren ---
// import { verifyToken } from '../middlewares/authMiddleware';
// import { verifyAdmin } from '../middlewares/adminMiddleware';
// --- NEU: verifyAdmin importieren ---
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { activeSalon } from '../middlewares/activeSalon';

const router = express.Router();

// --- KORREKTUR: verifyAdmin für Schreibzugriffe, verifyToken ist global ---
router.post('/', verifyAdmin, createProduct);
// GET ist öffentlich (wird von Kasse UND Booking-Seite genutzt)
router.get('/', getProducts); 
// --- NEU: Update-Route hinzugefügt und gesichert ---
router.put('/:id', verifyAdmin, activeSalon, updateProduct);
router.delete('/:id', verifyAdmin, activeSalon, deleteProduct);

export default router;
