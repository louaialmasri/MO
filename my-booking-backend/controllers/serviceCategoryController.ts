import { Response } from 'express';
import mongoose from 'mongoose';
import { SalonRequest } from '../middlewares/activeSalon';
import { ServiceCategory } from '../models/ServiceCategory';
import { Service } from '../models/Service';

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

export const updateServiceCategory = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const { id } = req.params;
        const { name } = req.body;
        const category = await ServiceCategory.findOneAndUpdate(
            { _id: id, salon: req.salonId },
            { name },
            { new: true }
        );
        if (!category) {
            return res.status(404).json({ success: false, message: 'Kategorie nicht gefunden.' });
        }
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren der Kategorie.' });
    }
};

export const deleteServiceCategory = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const { id } = req.params;

        // Prüfen, ob die Kategorie noch verwendet wird
        const servicesUsingCategory = await Service.countDocuments({ category: id });
        if (servicesUsingCategory > 0) {
            return res.status(400).json({ success: false, message: 'Kategorie wird noch von Services verwendet und kann nicht gelöscht werden.' });
        }

        const category = await ServiceCategory.findOneAndDelete({ _id: id, salon: req.salonId });
        if (!category) {
            return res.status(404).json({ success: false, message: 'Kategorie nicht gefunden.' });
        }
        res.status(200).json({ success: true, message: 'Kategorie gelöscht.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Löschen der Kategorie.' });
    }
};