import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { SalonRequest } from '../middlewares/activeSalon';
import { Invoice } from '../models/Invoice';
import { Booking } from '../models/Booking';
import { Voucher } from '../models/Voucher';
import { Product, IProduct } from '../models/Product';
import { User } from '../models/User';
import dayjs from 'dayjs';


// Hilfsfunktion zum Generieren eines Gutschein-Codes
function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const createInvoice = async (req: SalonRequest, res: Response) => {
  // KORREKTUR: Transaktionslogik entfernt, um Kompatibilität mit lokalen Standalone-MongoDB-Instanzen zu gewährleisten.
  try {
    const { bookingId, customerId, items, paymentMethod } = req.body;

    if (!req.user || !req.salonId) {
      return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen.' });
    }
    const salonId = req.salonId;
    const staffId = req.user.userId;

    if (!customerId) {
      return res.status(400).json({ message: 'Kunde ist erforderlich.' });
    }

    const invoiceItems: { description: string, price: number }[] = [];
    let totalAmount = 0;

    if (bookingId) {
      const booking = await Booking.findById(bookingId).populate('service');
      if (booking && booking.service) {
        const serviceItem = {
          description: (booking.service as any).title,
          price: (booking.service as any).price,
        };
        invoiceItems.push(serviceItem);
        totalAmount += serviceItem.price;
      }
    }

    if (items && Array.isArray(items)) {
      for (const item of items) {
        if (item.type === 'product') {
          const product = await Product.findById(item.id);
          if (!product) throw new Error(`Produkt mit ID ${item.id} nicht gefunden.`);
          if (product.stock < 1) throw new Error(`Produkt "${product.name}" ist nicht auf Lager.`);
          
          invoiceItems.push({ description: `Produkt: ${product.name}`, price: product.price });
          totalAmount += product.price;

          const updateResult = await Product.findByIdAndUpdate(item.id, { $inc: { stock: -1 } }, { new: true });
          if (!updateResult || updateResult.stock < 0) {
            // Sollte selten passieren, aber fängt den Fall ab, dass der Bestand zwischenzeitlich auf 0 fällt.
            throw new Error(`Konnte Produkt "${product.name}" nicht verkaufen, da es nicht mehr auf Lager ist.`);
          }

        } else if (item.type === 'voucher') {
          const voucherValue = Number(item.value);
          if (isNaN(voucherValue) || voucherValue <= 0) throw new Error('Ungültiger Gutscheinwert.');
          
          const newVoucher = new Voucher({
            code: generateVoucherCode(),
            initialValue: voucherValue,
            currentValue: voucherValue,
            salon: salonId,
          });
          await newVoucher.save();
          
          invoiceItems.push({ description: `Gutschein (${newVoucher.code})`, price: voucherValue });
          totalAmount += voucherValue;
        }
      }
    }

    if (invoiceItems.length === 0) {
        return res.status(400).json({ message: 'Keine Artikel für die Rechnung vorhanden.' });
    }
    
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await Invoice.countDocuments({ date: { $gte: dayjs(today).startOf('day').toDate() } });
    const invoiceNumber = `${dateStr}-${countToday + 1}`;

    const newInvoice = new Invoice({
      invoiceNumber,
      booking: bookingId || null,
      customer: customerId,
      salon: salonId,
      staff: staffId,
      items: invoiceItems,
      amount: totalAmount,
      paymentMethod,
      date: today,
      status: 'paid',
    });
    await newInvoice.save();

    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { status: 'completed', invoiceNumber: newInvoice.invoiceNumber });
    }

    res.status(201).json(newInvoice);

  } catch (error: any) {
    console.error('Fehler beim Erstellen der Rechnung:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen der Rechnung', error: error.message });
  }
};

export const listInvoices = async (req: SalonRequest, res: Response) => {
    try {
        const invoices = await Invoice.find({ salon: req.salonId }).populate('customer', 'firstName lastName').populate('booking').sort({ createdAt: -1 });
        res.status(200).json(invoices);
    } catch (error: any) {
        res.status(500).json({ message: "Fehler beim Abrufen der Rechnungen", error: error.message });
    }
};

export const getInvoiceById = async (req: SalonRequest, res: Response) => {
    try {
        const invoice = await Invoice.findOne({ invoiceNumber: req.params.id, salon: req.salonId })
            .populate('customer', 'firstName lastName email address phone')
            .populate('booking')
            .populate('staff', 'firstName lastName')
            .populate('salon');

        if (!invoice) {
            return res.status(404).send('Rechnung nicht gefunden');
        }
        res.status(200).json(invoice);
    } catch (error: any) {
        res.status(500).json({ message: "Fehler beim Abrufen der Rechnung", error: error.message });
    }
};

export const getUserInvoices = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const invoices = await Invoice.find({ customer: userId })
             .populate({
                path: 'booking',
                populate: { path: 'service', select: 'title' }
            })
            .sort({ date: -1 });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler beim Abrufen der Rechnungen' });
    }
};

export const getAllInvoices = async (req: AuthRequest & SalonRequest, res: Response) => {
    try {
        const invoices = await Invoice.find({ salon: req.salonId })
            .populate('customer', 'firstName lastName email')
            .populate({
                path: 'booking',
                populate: { path: 'service', select: 'title' }
            })
            .populate('salon', 'name')
            .populate('staff', 'firstName lastName')
            .sort({ date: -1 });

        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: 'Serverfehler beim Abrufen aller Rechnungen' });
    }
};

export const processPaymentForBooking = async (req: AuthRequest & SalonRequest, res: Response) => {
    try {
        const { bookingId, paymentMethod, amountGiven } = req.body;
        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'BookingID ist erforderlich.' });
        }
        
        const booking = await Booking.findById(bookingId).populate('service');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Buchung nicht gefunden' });
        }
        if (booking.status === 'paid' || booking.status === 'completed') {
            return res.status(400).json({ success: false, message: 'Diese Buchung wurde bereits bezahlt.' });
        }

        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        const countToday = await Invoice.countDocuments({ date: { $gte: dayjs(today).startOf('day').toDate() } });
        const invoiceNumber = `${dateStr}-${countToday + 1}`;
        const servicePrice = (booking.service as any).price;
        const given = amountGiven ? Number(amountGiven) : servicePrice;
        if (given < servicePrice) {
            return res.status(400).json({ message: 'Der gegebene Betrag ist geringer als der Rechnungsbetrag.' });
        }
        const change = given - servicePrice;

        const serviceItem = {
            description: (booking.service as any).title,
            price: (booking.service as any).price,
        };

        const newInvoice = new Invoice({
            invoiceNumber,
            booking: booking._id,
            customer: booking.user,
            staff: booking.staff,
            salon: req.salonId,
            date: today,
            items: [serviceItem],
            amount: servicePrice,
            paymentMethod,
            amountGiven: given,
            change: change,
            status: 'paid',
        });

        await newInvoice.save();

        booking.status = 'completed';
        (booking as any).paymentMethod = paymentMethod;
        booking.invoiceNumber = invoiceNumber;
        await booking.save();

        res.json({ success: true, message: 'Buchung bezahlt und Rechnung erstellt.', invoice: newInvoice });

    } catch (e) {
        console.error('payBooking Error:', e);
        res.status(500).json({ success: false, message: 'Serverfehler' });
    }
};

