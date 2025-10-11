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
        if (!salonId || !mongoose.Types.ObjectId.isValid(salonId)) {
            return res.status(400).json({ message: 'Kein gültiger Salon ausgewählt.' });
        }

        const today = dayjs().toDate();
        const startOfDay = dayjs(today).startOf('day').toDate();
        const endOfDay = dayjs(today).endOf('day').toDate();

        // Prüfen, ob für heute bereits ein Abschluss existiert
        const existingClosing = await CashClosing.findOne({
            salon: salonId,
            closingDate: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existingClosing) {
            return res.status(409).json({ 
                message: 'Für heute wurde bereits ein Kassenabschluss erstellt.',
                hasExistingClosing: true // Ein Flag für das Frontend
            });
        }

        const cashInvoices = await Invoice.find({
            salon: new mongoose.Types.ObjectId(salonId),
            date: { $gte: startOfDay, $lte: endOfDay },
            paymentMethod: 'cash',
            status: 'paid'
        });

        // Summe der eingelösten Gutscheine *nur* aus Bar-Transaktionen
        const redeemedVouchersInCash = cashInvoices.reduce((sum, invoice) => sum + (invoice.redeemedAmount || 0), 0);

        let revenueServices = 0;
        let revenueProducts = 0;
        let soldVouchers = 0;

        cashInvoices.forEach(invoice => {
            invoice.items.forEach(item => {
                if (item.description.startsWith('Produkt:')) {
                    revenueProducts += item.price;
                } else if (item.description.startsWith('Gutschein:')) {
                    soldVouchers += item.price;
                } else {
                    revenueServices += item.price;
                }
            });
        });

        res.json({
            success: true,
            preview: {
                date: today,
                revenueServices,
                revenueProducts,
                soldVouchers,
                redeemedVouchers: redeemedVouchersInCash, // Nur eingelöste Gutscheine aus Barverkäufen
                invoiceCount: cashInvoices.length,
            }
        });

    } catch (error) {
        console.error("Fehler bei Kassenabschluss-Vorschau:", error);
        res.status(500).json({ message: "Fehler bei der Vorschau." });
    }
};

// SPEICHER-FUNKTION
export const createCashClosing = async (req: SalonRequest, res: Response) => {
    try {
        const salonId = req.salonId;
        const { employee, revenueServices, revenueProducts, soldVouchers, redeemedVouchers, cashDeposit, bankWithdrawal, tipsWithdrawal, otherWithdrawal, actualCashOnHand, notes } = req.body;

        if (!salonId || !employee) {
            return res.status(400).json({ message: 'Salon- oder Mitarbeiter-ID fehlt.' });
        }

        const today = dayjs().toDate();
        const startOfDay = dayjs(today).startOf('day').toDate();
        const endOfDay = dayjs(today).endOf('day').toDate();

        // Prüfen, ob bereits ein Abschluss für diesen Tag existiert
        const existingClosing = await CashClosing.findOne({
            salon: salonId,
            closingDate: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existingClosing) {
            return res.status(409).json({ message: 'Für diesen Salon wurde heute bereits ein Kassenabschluss erstellt.' });
        }

        const totalRevenue = revenueServices + revenueProducts + soldVouchers;
        const totalWithdrawals = bankWithdrawal + tipsWithdrawal + otherWithdrawal;
        const calculatedCashOnHand = cashDeposit + totalRevenue - redeemedVouchers - totalWithdrawals;
        const difference = actualCashOnHand - calculatedCashOnHand;

        const newCashClosing = new CashClosing({
            salon: salonId,
            employee,
            closingDate: today,
            startPeriod: startOfDay,
            endPeriod: endOfDay,
            revenueServices,
            revenueProducts,
            soldVouchers,
            redeemedVouchers,
            cashDeposit,
            bankWithdrawal,
            tipsWithdrawal,
            otherWithdrawal,
            calculatedCashOnHand,
            actualCashOnHand,
            difference,
            notes,
        });

        await newCashClosing.save();
        res.status(201).json({ success: true, cashClosing: newCashClosing });

    } catch (error: any) {
        console.error("Fehler beim Erstellen des Kassenabschlusses:", error);
        res.status(500).json({ message: "Fehler beim Speichern des Abschlusses.", error: error.message });
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