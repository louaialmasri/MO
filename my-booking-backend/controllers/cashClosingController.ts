import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { SalonRequest } from '../middlewares/activeSalon';
import { CashClosing } from '../models/CashClosing';
import { Invoice } from '../models/Invoice';
import mongoose from 'mongoose';
import dayjs from 'dayjs';

// Eine Funktion, die nur die Daten für den Abschluss vorbereitet
export const getCashClosingPreview = async (req: SalonRequest, res: Response) => {
    try {
        const salonId = req.salonId;
        if (!salonId) {
            return res.status(400).json({ message: 'Kein Salon ausgewählt.' });
        }
        const today = dayjs().toDate();
        const startOfDay = dayjs(today).startOf('day').toDate();
        const endOfDay = dayjs(today).endOf('day').toDate();

        // KORREKTUR: salonId in eine ObjectId umwandeln
        const cashInvoices = await Invoice.find({
            salon: new mongoose.Types.ObjectId(salonId),
            date: { $gte: startOfDay, $lte: endOfDay },
            paymentMethod: 'cash',
            status: 'paid'
        });

        const expectedAmount = cashInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

        res.json({
            success: true,
            preview: {
                date: today,
                expectedAmount: expectedAmount,
                invoiceCount: cashInvoices.length,
            }
        });

    } catch (error) {
        console.error("Fehler bei Kassenabschluss-Vorschau:", error);
        res.status(500).json({ message: "Fehler bei der Vorschau." });
    }
};

// Speichert den neuen Kassenabschluss
export const createCashClosing = async (req: SalonRequest, res: Response) => {
    try {
        const salonId = req.salonId;
        const userId = req.user?.userId;
        const { expectedAmount, withdrawals, notes } = req.body;

        const totalWithdrawals = withdrawals.reduce((sum: number, w: { amount: number }) => sum + w.amount, 0);
        const finalExpectedAmount = expectedAmount - totalWithdrawals;

        const newCashClosing = new CashClosing({
            date: new Date(),
            executedBy: userId,
            salon: salonId,
            expectedAmount, // Die ursprünglichen Einnahmen
            withdrawals, // Die neuen Entnahmen
            finalExpectedAmount, // Der Soll-Betrag nach Entnahmen
            countedAmount: finalExpectedAmount, // Du bestätigst ja diesen Betrag
            difference: 0, // Ist also immer 0
            notes,
        });

        await newCashClosing.save();
        res.status(201).json({ success: true, cashClosing: newCashClosing });

    } catch (error) {
        console.error("Fehler beim Erstellen des Kassenabschlusses:", error);
        res.status(500).json({ message: "Fehler beim Speichern des Abschlusses." });
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