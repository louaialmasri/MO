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
    // --- NEU: updateStaffPermissions importieren ---
    updateStaffPermissions
} from '../controllers/userController';
// --- ALT: verifyToken hier nicht mehr importieren ---
// import { AuthRequest, verifyToken } from '../middlewares/authMiddleware';
// --- NEU: Nur noch AuthRequest importieren ---
import { AuthRequest } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware'; 

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

// NEUE ROUTEN FÜR PIN-VERWALTUNG (NUR ADMINS) (verifyToken global)
router.post('/set-pin', verifyAdmin, setDashboardPin);
router.post('/verify-pin', verifyAdmin, verifyDashboardPin);

// --- NEU: Route für Berechtigungen (verifyToken global) ---
// (Diese Route war fälschlicherweise in staff.ts, user.ts ist aber der korrekte Ort)
router.put('/:id/permissions', verifyAdmin, updateStaffPermissions);


export default router;
