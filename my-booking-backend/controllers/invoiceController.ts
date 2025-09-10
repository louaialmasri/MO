// my-booking-backend/controllers/invoiceController.ts

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