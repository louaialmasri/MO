import express, { NextFunction, Response } from 'express'; // HIER die Korrektur
import { 
    getAllUsers, 
    updateUserRole, 
    updateUserSkills, 
    deleteStaff, 
    createUserManually, 
    getOrCreateWalkInCustomer, 
    getLastBookingForUser,
    setDashboardPin,
    verifyDashboardPin,
    getMe,
    updateMe,
    changePassword
} from '../controllers/userController';
import { AuthRequest, verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware'; 

const router = express.Router();

// Alle Admin-spezifischen Routen verwenden jetzt die korrekte Middleware
router.get('/', verifyToken, (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role === 'admin' || req.user?.role === 'staff') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Zugriff verweigert' });
}, getAllUsers);
router.post('/create-manual', verifyToken, verifyAdmin, createUserManually);
router.patch('/role/:id', verifyToken, verifyAdmin, updateUserRole);
router.patch('/skills/:id', verifyToken, verifyAdmin, updateUserSkills);
router.delete('/staff/:id', verifyToken, verifyAdmin, deleteStaff);

// ROUTEN FÜR BENUTZERPROFIL
router.get('/me', verifyToken, getMe);
router.patch('/me', verifyToken, updateMe);
router.post('/change-password', verifyToken, changePassword);

// Diese Route benötigt keine Admin-Rechte, nur einen Login (für Mitarbeiter an der Kasse)
router.get('/walk-in', verifyToken, getOrCreateWalkInCustomer);

// Route, um den letzten Termin abzurufen
router.get('/:userId/last-booking', verifyToken, getLastBookingForUser);

// NEUE ROUTEN FÜR PIN-VERWALTUNG (NUR ADMINS)
router.post('/set-pin', verifyToken, verifyAdmin, setDashboardPin);
router.post('/verify-pin', verifyToken, verifyAdmin, verifyDashboardPin);

export default router;