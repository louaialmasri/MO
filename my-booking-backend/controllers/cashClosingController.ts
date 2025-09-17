import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { SalonRequest } from '../middlewares/activeSalon';
import { CashClosing } from '../models/CashClosing';
import { Invoice } from '../models/Invoice';
import mongoose from 'mongoose'; // Import Mongoose

// Holt die Daten für die Vorschau im Dialog
export const getPreCalculationData = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }

        const lastClosing = await CashClosing.findOne({ salon: new mongoose.Types.ObjectId(req.salonId) }).sort({ closingDate: -1 });
        const startPeriod = lastClosing ? lastClosing.endPeriod : new Date(0); // Start from the last closing or from the beginning of time
        const endPeriod = new Date();

        const result = await Invoice.aggregate([
            {
                $match: {
                    salon: new mongoose.Types.ObjectId(req.salonId),
                    paymentMethod: 'cash',
                    date: { $gte: startPeriod, $lt: endPeriod }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" }
                }
            }
        ]);

        const cashSales = result.length > 0 ? result[0].total : 0;
        res.json({ success: true, cashSales, startPeriod: startPeriod.toISOString() });

    } catch (e) {
        console.error("Pre-calculation error:", e);
        res.status(500).json({ success: false, message: 'Fehler bei der Berechnung der Einnahmen.' });
    }
};

// Speichert den neuen Kassenabschluss
export const createCashClosing = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const {
            employee,
            cashDeposit,
            // Neue Entnahme-Felder
            bankWithdrawal,
            tipsWithdrawal,
            otherWithdrawal,
            actualCashOnHand,
            notes
        } = req.body;
        
        const lastClosing = await CashClosing.findOne({ salon: new mongoose.Types.ObjectId(req.salonId) }).sort({ closingDate: -1 });
        const startPeriod = lastClosing ? lastClosing.endPeriod : new Date(0);
        const endPeriod = new Date();

        const result = await Invoice.aggregate([
            { $match: { salon: new mongoose.Types.ObjectId(req.salonId), paymentMethod: 'cash', date: { $gte: startPeriod, $lt: endPeriod } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        const cashSales = result.length > 0 ? result[0].total : 0;

        // Gesamte Entnahme berechnen
        const totalWithdrawal = (bankWithdrawal || 0) + (tipsWithdrawal || 0) + (otherWithdrawal || 0);
        const calculatedCashOnHand = (cashDeposit + cashSales) - totalWithdrawal;
        const difference = actualCashOnHand - calculatedCashOnHand;

        const newClosing = await CashClosing.create({
            salon: req.salonId,
            employee,
            startPeriod,
            endPeriod,
            cashSales,
            cashDeposit,
            bankWithdrawal,
            tipsWithdrawal,
            otherWithdrawal,
            actualCashOnHand,
            calculatedCashOnHand,
            difference,
            notes,
        });

        res.status(201).json({ success: true, closing: newClosing });

    } catch (e) {
        console.error("Create cash closing error:", e);
        res.status(500).json({ success: false, message: 'Fehler beim Speichern des Kassenabschlusses.' });
    }
};

// Listet alle bisherigen Abschlüsse auf
export const listCashClosings = async (req: SalonRequest, res: Response) => {
    try {
        if (!req.salonId) {
            return res.status(400).json({ success: false, message: 'Kein Salon ausgewählt.' });
        }
        const closings = await CashClosing.find({ salon: new mongoose.Types.ObjectId(req.salonId) })
            .populate('employee', 'firstName lastName')
            .sort({ closingDate: -1 });
        res.json({ success: true, closings });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Fehler beim Laden der Abschlüsse.' });
    }
};


// Einzelnen Kassenabschluss abrufen
export const getCashClosingById = async (req: SalonRequest, res: Response) => {
    try {
        const { id } = req.params;
        const closing = await CashClosing.findOne({ _id: id, salon: req.salonId })
            .populate('employee', 'firstName lastName');

        if (!closing) {
            return res.status(404).json({ success: false, message: 'Kassenabschluss nicht gefunden.' });
        }
        res.json({ success: true, closing });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Fehler beim Laden des Abschlusses.' });
    }
}