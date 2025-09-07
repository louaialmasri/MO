import express from 'express';
import { User } from '../models/User';
import { Service } from '../models/Service';

const router = express.Router();

// Alle Mitarbeiter für einen bestimmten Service abrufen
router.get('/service/:serviceId', async (req, res) => {
    try {
        const { serviceId } = req.params;
        const staff = await User.find({ skills: serviceId, role: 'staff' });
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

export default router;