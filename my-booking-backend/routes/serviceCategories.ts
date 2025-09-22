import express from 'express';
import { createServiceCategory, getServiceCategories } from '../controllers/serviceCategoryController';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';

const router = express.Router();

router.post('/', verifyToken, verifyAdmin, createServiceCategory);
router.get('/', getServiceCategories);

export default router;