import { Response } from 'express';
import { SalonRequest } from '../middlewares/activeSalon';
import { Product } from '../models/Product';

export const createProduct = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const { name, description, price, category } = req.body;
        const product = new Product({ name, description, price, category, salon: req.salonId });
        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Produkts.' });
    }
};

export const getProducts = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const products = await Product.find({ salon: req.salonId }).populate('category');
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Fehler beim Abrufen der Produkte.' });
    }
};