import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { SalonRequest } from '../middlewares/activeSalon';
import { Invoice } from '../models/Invoice';
import { Booking } from '../models/Booking';
import { Voucher } from '../models/Voucher';
import { Product } from '../models/Product';
import dayjs from 'dayjs';
import { Service } from '../models/Service';

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
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { bookingId, customerId, items, paymentMethod, staffId: providedStaffId } = req.body;

    if (!req.user || !req.salonId) {
      throw new Error('Authentifizierung fehlgeschlagen.');
    }
    const salonId = req.salonId;
    const staffId = providedStaffId || req.user.userId;

    if (!customerId) {
      throw new Error('Kunde ist erforderlich.');
    }

    const invoiceItems: { description: string, price: number }[] = [];
    let totalAmount = 0;

    // --- Verarbeitung der Artikel ---
    if (items && Array.isArray(items)) {
      for (const item of items) {
        switch (item.type) {
          
          // KORREKTUR & ERWEITERUNG: Logik für Produkte und Bestandsreduzierung
          case 'product':
            if (!item.id) throw new Error('Produkt-ID fehlt.');
            const product = await Product.findById(item.id).session(session);
            if (!product) throw new Error(`Produkt mit ID ${item.id} nicht gefunden.`);
            
            // Prüfen, ob genügend Lagerbestand vorhanden ist
            if (product.stock < 1) {
              throw new Error(`Produkt "${product.name}" ist nicht mehr auf Lager.`);
            }
            
            invoiceItems.push({ description: `Produkt: ${product.name}`, price: product.price });
            totalAmount += product.price;

            // Lagerbestand reduzieren
            product.stock -= 1;
            await product.save({ session });
            break;

          // KORREKTUR & ERWEITERUNG: Logik für Gutscheinverkauf
          case 'voucher':
            if (!item.value || item.value <= 0) throw new Error('Ungültiger Gutscheinwert.');
            const voucherCode = generateVoucherCode();
            const newVoucher = new Voucher({
              code: voucherCode,
              initialAmount: item.value,
              currentBalance: item.value,
              salon: salonId,
            });
            await newVoucher.save({ session });

            invoiceItems.push({ description: `Gutschein: ${voucherCode}`, price: item.value });
            totalAmount += item.value;
            break;

          case 'service':
            if (!item.id) throw new Error('Dienstleistungs-ID fehlt.');
            const service = await Service.findById(item.id).session(session);
            if (!service) throw new Error(`Dienstleistung mit ID ${item.id} nicht gefunden.`);
            
            invoiceItems.push({ description: `${service.title}`, price: service.price });
            totalAmount += service.price;
            break;
        }
      }
    }

    if (invoiceItems.length === 0) {
      throw new Error('Keine Artikel für die Rechnung vorhanden.');
    }
    
    // --- Rechnungsnummer generieren ---
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await Invoice.countDocuments({ date: { $gte: dayjs(today).startOf('day').toDate() } });
    const invoiceNumber = `${dateStr}-${countToday + 1}`;

    // --- Rechnung erstellen ---
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
    await newInvoice.save({ session });

    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { status: 'completed', invoiceNumber: newInvoice.invoiceNumber }).session(session);
    }

    // Wenn alles gut gelaufen ist, die Transaktion bestätigen
    await session.commitTransaction();
    res.status(201).json(newInvoice);

  } catch (error: any) {
    // Wenn ein Fehler auftritt, die Transaktion abbrechen
    await session.abortTransaction();
    console.error('Fehler beim Erstellen der Rechnung:', error);
    res.status(400).json({ message: error.message || 'Fehler beim Erstellen der Rechnung' });
  } finally {
    // Die Session immer beenden
    session.endSession();
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
            .sort({ date: -1 })
            .lean(); 

        const transformedInvoices = invoices.map(invoice => {
            let itemsSummary = 'Unbekannter Posten';
            if (invoice.booking && (invoice.booking as any).service) {
                itemsSummary = (invoice.booking as any).service.title;
            } else if (invoice.items && invoice.items.length > 0) {
                itemsSummary = invoice.items[0].description;
                if (invoice.items.length > 1) {
                    itemsSummary += ` (+${invoice.items.length - 1} weitere)`;
                }
            }
            
            const { service, ...rest } = invoice as any;

            return {
                ...rest,
                itemsSummary, 
            };
        });

        res.json(transformedInvoices); 

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