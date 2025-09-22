import { Response } from 'express';
import { SalonRequest } from '../middlewares/activeSalon';
import { ProductCategory } from '../models/ProductCategory';

export const createProductCategory = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const { name } = req.body;
        const category = new ProductCategory({ name, salon: req.salonId });
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Erstellen der Produktkategorie.' });
    }
};

export const getProductCategories = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const categories = await ProductCategory.find({ salon: req.salonId });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Produktkategorien.' });
    }
};