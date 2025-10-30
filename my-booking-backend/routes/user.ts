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
    changePassword,
    updateStaffPermissions
} from '../controllers/userController';
import { AuthRequest } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware'; 
import { verifyToken } from '../utils/jwt';

const router = express.Router();

// Alle Admin-spezifischen Routen (verifyToken wird global in server.ts angewendet)
router.get('/', (req: AuthRequest, res: Response, next: NextFunction) => {
    // Diese inline-Middleware prüft auf admin ODER staff
    if (req.user?.role === 'admin' || req.user?.role === 'staff') {
        return next();
    }
    return res.status(403).json({ success: false, message: 'Zugriff verweigert' });
}, getAllUsers);
router.post('/create-manual', verifyAdmin, createUserManually);
router.patch('/:id/role', verifyAdmin, updateUserRole);
router.patch('/skills/:id', verifyAdmin, updateUserSkills);
router.delete('/staff/:id', verifyAdmin, deleteStaff);

// ROUTEN FÜR BENUTZERPROFIL (verifyToken global)
router.get('/me', getMe);
router.patch('/me', updateMe);
router.post('/change-password', changePassword);

// Diese Route benötigt keine Admin-Rechte, nur einen Login (für Mitarbeiter an der Kasse)
// (verifyToken global)
router.get('/walk-in', getOrCreateWalkInCustomer);

// Route, um den letzten Termin abzurufen (verifyToken global)
router.get('/:userId/last-booking', getLastBookingForUser);

// Diese Routen benötigen KEINE verifyAdmin-Middleware,
// da der Controller (setDashboardPin) die Logik selbst enthält.
// Die globale verifyToken aus server.ts ist ausreichend.
router.post('/set-pin', setDashboardPin);
router.post('/verify-pin', verifyDashboardPin);

// --- NEU: Route für Berechtigungen (verifyToken global) ---
// (Diese Route war fälschlicherweise in staff.ts, user.ts ist aber der korrekte Ort)
router.put('/:id/permissions', verifyAdmin, updateStaffPermissions);


export default router;
