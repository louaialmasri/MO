import express from 'express';
import { createServiceCategory, getServiceCategories, updateServiceCategory, deleteServiceCategory } from '../controllers/serviceCategoryController'; // Geändert
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';

const router = express.Router();

router.post('/', verifyToken, verifyAdmin, createServiceCategory);
router.get('/', getServiceCategories);
router.patch('/:id', verifyToken, verifyAdmin, updateServiceCategory); // NEU
router.delete('/:id', verifyToken, verifyAdmin, deleteServiceCategory); // NEU

export default router;