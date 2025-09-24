import express from 'express';
import { createProduct, deleteProduct, getProducts } from '../controllers/productController';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { activeSalon } from '../middlewares/activeSalon';

const router = express.Router();

router.post('/', verifyToken, verifyAdmin, createProduct);
router.get('/', getProducts);
router.delete('/:id', verifyToken, activeSalon, deleteProduct);

export default router;