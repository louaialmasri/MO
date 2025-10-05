import express from 'express';
import { 
    getAllUsers, 
    updateUserRole, 
    updateUserSkills, 
    deleteStaff, 
    createUserManually, 
    getOrCreateWalkInCustomer 
} from '../controllers/userController';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware'; 

const router = express.Router();

// Alle Admin-spezifischen Routen verwenden jetzt die korrekte Middleware
router.get('/', verifyToken, verifyAdmin, getAllUsers);
router.post('/create-manual', verifyToken, verifyAdmin, createUserManually);
router.patch('/role/:id', verifyToken, verifyAdmin, updateUserRole);
router.patch('/skills/:id', verifyToken, verifyAdmin, updateUserSkills);
router.delete('/staff/:id', verifyToken, verifyAdmin, deleteStaff);

// Diese Route benötigt keine Admin-Rechte, nur einen Login (für Mitarbeiter an der Kasse)
router.get('/walk-in', verifyToken, getOrCreateWalkInCustomer);

export default router;