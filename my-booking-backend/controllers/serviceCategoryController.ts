import { Response } from 'express';
import { SalonRequest } from '../middlewares/activeSalon';
import { ServiceCategory } from '../models/ServiceCategory';

export const createServiceCategory = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const { name } = req.body;
        const category = new ServiceCategory({ name, salon: req.salonId });
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Erstellen der Servicekategorie.' });
    }
};

export const getServiceCategories = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const categories = await ServiceCategory.find({ salon: req.salonId });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Servicekategorien.' });
    }
};