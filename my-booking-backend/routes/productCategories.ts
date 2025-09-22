import express from 'express';
import { createProductCategory, getProductCategories } from '../controllers/productCategoryController';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';

const router = express.Router();

router.post('/', verifyToken, verifyAdmin, createProductCategory);
router.get('/', getProductCategories);

export default router;