import express from 'express';
import { User } from '../models/User';
import { StaffSalon } from '../models/StaffSalon';
import { SalonRequest } from '../middlewares/activeSalon';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { updateStaffPermissions } from '../controllers/userController';

const router = express.Router();

// Alle Mitarbeiter für einen bestimmten Service abrufen
router.get('/service/:serviceId', async (req, res) => {
    const salonReq = req as SalonRequest;
    try {
        const { serviceId } = req.params;
        const salonId = salonReq.salonId;

        if (!salonId) {
            return res.status(400).json({ message: 'Kein Salon ausgewählt.' });
        }

        // Finde Mitarbeiter, die dem aktiven Salon zugewiesen sind
        const staffAssignments = await StaffSalon.find({ salon: salonId, active: true }).select('staff').lean();
        const staffIdsInSalon = staffAssignments.map(s => s.staff);

        // Finde von diesen Mitarbeitern diejenigen, die die erforderliche Fähigkeit haben
        const staff = await User.find({
            _id: { $in: staffIdsInSalon },
            skills: serviceId,
            role: 'staff'
        });

        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Abrufen der Mitarbeiter', error });
    }
});

// Die Skills eines Mitarbeiters aktualisieren
router.put('/:staffId/skills', async (req, res) => {
    try {
        const { staffId } = req.params;
        const { skills } = req.body; // Erwartet ein Array von Service-IDs

        const staff = await User.findByIdAndUpdate(
            staffId,
            { $set: { skills: skills } },
            { new: true }
        );

        if (!staff) {
            return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
        }

        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Aktualisieren der Skills', error });
    }
});

// Die Berechtigungen eines Mitarbeiters aktualisieren (nur Admins)
router.put('/:id/permissions', verifyAdmin, updateStaffPermissions);

export default router;