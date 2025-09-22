import express from 'express';
import { createProduct, getProducts } from '../controllers/productController';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';

const router = express.Router();

router.post('/', verifyToken, verifyAdmin, createProduct);
router.get('/', getProducts);

export default router;