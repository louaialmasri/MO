import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/authMiddleware';
import { SalonRequest } from '../middlewares/activeSalon';
import { Invoice } from '../models/Invoice';
import { Booking } from '../models/Booking';
import { Voucher } from '../models/Voucher';
import { Product, IProduct } from '../models/Product';
import { User } from '../models/User';


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
    const { bookingId, customerId, items, paymentMethod } = req.body;
    
    // KORREKTUR: Sicherheitsprüfung für 'user' und 'salonId'.
    if (!req.user || !req.salonId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(401).json({ message: 'Authentifizierung fehlgeschlagen oder kein Salon ausgewählt.' });
    }
    const salonId = req.salonId;
    // KORREKTUR: Wir verwenden 'userId' aus dem Token, nicht '_id'.
    const staffId = req.user.userId;

    if (!customerId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Ein Kunde ist für die Rechnung erforderlich.' });
    }

    const invoiceItems: { description: string, price: number }[] = [];
    let totalAmount = 0;

    if (bookingId) {
      const booking = await Booking.findById(bookingId).populate('service').session(session);
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
          // KORREKTUR: Explizite Typisierung des Produkts als 'IProduct'.
          const product: IProduct | null = await Product.findById(item.id).session(session);
          if (!product) throw new Error(`Produkt mit ID ${item.id} nicht gefunden.`);
          if (product.stock < 1) throw new Error(`Produkt "${product.name}" ist nicht auf Lager.`);
          
          invoiceItems.push({ description: `Produkt: ${product.name}`, price: product.price });
          totalAmount += product.price;
          // KORREKTUR: Wir verwenden eine atomare Operation, um den Lagerbestand zu aktualisieren.
          await Product.findByIdAndUpdate(item.id, { $inc: { stock: -1 } }, { session });

        } else if (item.type === 'voucher') {
          const voucherValue = Number(item.value);
          if (isNaN(voucherValue) || voucherValue <= 0) throw new Error('Ungültiger Gutscheinwert.');
          
          const newVoucher = new Voucher({
            code: generateVoucherCode(),
            initialValue: voucherValue,
            currentValue: voucherValue,
            salon: salonId,
          });
          await newVoucher.save({ session });
          
          invoiceItems.push({ description: `Gutschein (${newVoucher.code})`, price: voucherValue });
          totalAmount += voucherValue;
        }
      }
    }

    if (invoiceItems.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: 'Keine Artikel für die Rechnung vorhanden.' });
    }

    const newInvoice = new Invoice({
      booking: bookingId || null,
      customer: customerId,
      salon: salonId,
      staff: staffId,
      items: invoiceItems,
      totalAmount,
      paymentMethod,
      status: 'paid',
    });
    await newInvoice.save({ session });

    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { status: 'completed' }, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(newInvoice);

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
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

// Eine Rechnung anhand ihrer ID oder Booking-ID abrufen
export const getInvoiceById = async (req: SalonRequest, res: Response) => {
    try {
        const invoice = await Invoice.findOne({ _id: req.params.id, salon: req.salonId }).populate('customer', 'firstName lastName email').populate('booking').populate('staff', 'firstName lastName');
        if (!invoice) {
            return res.status(404).send('Rechnung nicht gefunden');
        }
        res.status(200).json(invoice);
    } catch (error: any) {
        res.status(500).json({ message: "Fehler beim Abrufen der Rechnung", error: error.message });
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