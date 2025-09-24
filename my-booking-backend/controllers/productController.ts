import { Response } from 'express';
import { SalonRequest } from '../middlewares/activeSalon';
import { Product } from '../models/Product';

export const createProduct = async (req: SalonRequest, res: Response) => {
  try {
    // KORREKTUR: 'stock' aus dem Request-Body auslesen
    const { name, price, description, category, stock } = req.body;
    if (!name || price === undefined || !category) {
      return res.status(400).json({ message: 'Name, Preis und Kategorie sind erforderlich.' });
    }
    const newProduct = new Product({
      name,
      price,
      description,
      category,
      stock, // KORREKTUR: 'stock' hier übergeben
      salon: req.salonId,
    });
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error: any) {
    res.status(500).json({ message: 'Fehler beim Erstellen des Produkts', error: error.message });
  }
};

// Produkt aktualisieren
export const updateProduct = async (req: SalonRequest, res: Response) => {
  try {
    // KORREKTUR: 'stock' aus dem Request-Body auslesen
    const { name, price, description, category, stock } = req.body;
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: req.params.id, salon: req.salonId },
      // KORREKTUR: 'stock' zum Update-Objekt hinzufügen
      { name, price, description, category, stock },
      { new: true }
    );
    if (!updatedProduct) return res.status(404).json({ message: 'Produkt nicht gefunden.' });
    res.json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Produkts', error: error.message });
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

// Produkt löschen
export const deleteProduct = async (req: SalonRequest, res: Response) => {
  try {
    const deletedProduct = await Product.findOneAndDelete({
      _id: req.params.id,
      salon: req.salonId, // Stellt sicher, dass man nur Produkte des eigenen Salons löschen kann
    });
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Produkt nicht gefunden.' });
    }
    res.status(200).json({ message: 'Produkt erfolgreich gelöscht.' });
  } catch (error: any) {
    res.status(500).json({ message: 'Fehler beim Löschen des Produkts', error: error.message });
  }
};