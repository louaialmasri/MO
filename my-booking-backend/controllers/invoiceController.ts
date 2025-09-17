import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Invoice } from '../models/Invoice';
import { Booking } from '../models/Booking';

// Eine Rechnung anhand ihrer ID oder Booking-ID abrufen
export const getInvoiceById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params; // 'id' ist hier die invoiceNumber
        
        const invoice = await Invoice.findOne({ invoiceNumber: id })
            .populate('customer', 'firstName lastName email')
            .populate('service', 'title price duration')
            .populate('staff', 'firstName lastName')
            .populate('salon', 'name address phone email');

        if (!invoice) {
            return res.status(404).json({ message: 'Rechnung nicht gefunden' });
        }

        if (req.user?.role !== 'admin' && String((invoice.customer as any)._id) !== req.user?.userId) {
            return res.status(403).json({ message: 'Nicht autorisiert' });
        }

        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler beim Abrufen der Rechnung' });
    }
};

// Alle Rechnungen eines bestimmten Benutzers abrufen
export const getUserInvoices = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const invoices = await Invoice.find({ customer: userId })
            .populate('service', 'title')
            .sort({ date: -1 });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler beim Abrufen der Rechnungen' });
    }
};

// Alle Rechnungen für den Admin abrufen
export const getAllInvoices = async (req: AuthRequest, res: Response) => {
    try {
        const invoices = await Invoice.find({})
            .populate('customer', 'firstName lastName email')
            .populate('service', 'title')
            .populate('salon', 'name')
            .populate('staff', 'firstName lastName') // WICHTIG: Mitarbeiterdaten hinzufügen
            .sort({ date: -1 });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler beim Abrufen aller Rechnungen' });
    }
};

// Logik zum Abkassieren (Bezahlung) eines Termins
export const processPaymentForBooking = async (req: AuthRequest, res: Response) => {
    try {
        const { bookingId, paymentMethod } = req.body;
        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'BookingID ist erforderlich.' });
        }

        type PopulatedBooking = mongoose.Document & {
            _id: mongoose.Types.ObjectId;
            user: mongoose.Types.ObjectId;
            service: any;
            staff: mongoose.Types.ObjectId;
            salon: mongoose.Types.ObjectId;
            status: string;
        };

        const booking = await Booking.findById(bookingId).populate('service') as PopulatedBooking | null;

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Buchung nicht gefunden' });
        }

        // 1. Buchungsstatus aktualisieren
        booking.status = 'completed';
        await booking.save();
        
        const service = booking.service as any;

        // 2. Rechnung erstellen oder aktualisieren
        const invoice = await Invoice.findOneAndUpdate(
            { booking: bookingId },
            {
                $set: {
                    customer: booking.user,
                    service: booking.service._id,
                    staff: booking.staff,
                    salon: booking.salon,
                    amount: service.price,
                    date: new Date(),
                    paymentMethod: paymentMethod || 'cash',
                    status: 'paid',
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.json({ success: true, message: 'Buchung bezahlt und Rechnung erstellt/aktualisiert', invoice });
    } catch (e) {
        console.error('payBooking Error:', e);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
};