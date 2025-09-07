import express from 'express';
import { User } from '../models/User';
import { Service } from '../models/Service';
import { StaffService } from '../models/StaffService';

const router = express.Router();

// Service einem Mitarbeiter zuweisen
router.post('/:staffId/services', async (req, res) => {
    try {
        const staffId = parseInt(req.params.staffId);
        const { serviceId } = req.body;

        const staff = await User.findById(staffId);
        if (!staff || staff.role !== 'staff') {
            return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
        }

        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service nicht gefunden' });
        }

        await StaffService.create({ staffId, serviceId });
        res.status(201).json({ message: 'Service erfolgreich zugewiesen' });
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Zuweisen des Services', error });
    }
});

// Zuweisung eines Services von einem Mitarbeiter entfernen
router.delete('/:staffId/services/:serviceId', async (req, res) => {
    try {
        const staffId = parseInt(req.params.staffId);
        const serviceId = parseInt(req.params.serviceId);

        const result = await StaffService.destroy({
            where: {
                staffId,
                serviceId,
            },
        });

        if (result === 0) {
            return res.status(404).json({ message: 'Zuweisung nicht gefunden' });
        }

        res.status(200).json({ message: 'Service-Zuweisung erfolgreich entfernt' });
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Entfernen der Zuweisung', error });
    }
});

// Alle Services eines Mitarbeiters abrufen
router.get('/:staffId/services', async (req, res) => {
    try {
        const staffId = parseInt(req.params.staffId);
        const staff = await User.findById(staffId).populate({
            path: 'services',
            model: Service,
            select: '-__v'
        });

        if (!staff || staff.role !== 'staff') {
            return res.status(404).json({ message: 'Mitarbeiter nicht gefunden' });
        }

        res.json(staff.get('services'));
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Abrufen der Mitarbeiter-Services', error });
    }
});

// Alle Mitarbeiter für einen Service abrufen
router.get('/services/:serviceId/staff', async (req, res) => {
    try {
        const serviceId = parseInt(req.params.serviceId);
        const service = await Service.findById(serviceId).populate({
            path: 'staff',
            select: 'id firstName lastName'
        });

        if (!service) {
            return res.status(404).json({ message: 'Service nicht gefunden' });
        }

        res.json(service.get('staff'));
    } catch (error) {
        res.status(500).json({ message: 'Fehler beim Abrufen der Mitarbeiter für den Service', error });
    }
});

export default router;