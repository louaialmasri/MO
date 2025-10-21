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
  try {
    const { bookingId, customerId, items, paymentMethod, staffId: providedStaffId, discount, voucherCode, amountGiven, voucherPayment } = req.body;

    if (!req.user || !req.salonId) {
      throw new Error('Authentifizierung fehlgeschlagen.');
    }
    const salonId = req.salonId;
    const staffId = providedStaffId || req.user.userId;

    if (!customerId) {
      throw new Error('Kunde ist erforderlich.');
    }

    const invoiceItems: { description: string, price: number }[] = [];
    let subTotal = 0;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        switch (item.type) {
          case 'product':
            if (!item.id) throw new Error('Produkt-ID fehlt.');
            const product = await Product.findById(item.id);
            if (!product) throw new Error(`Produkt mit ID ${item.id} nicht gefunden.`);
            if (product.stock < 1) throw new Error(`Produkt "${product.name}" ist nicht mehr auf Lager.`);
            
            invoiceItems.push({ description: `Produkt: ${product.name}`, price: product.price });
            subTotal += product.price;

            product.stock -= 1;
            await product.save();
            break;

          case 'voucher':
            if (!item.value || item.value <= 0) throw new Error('Ungültiger Gutscheinwert.');
            const generatedVoucherCode = generateVoucherCode();
            
            const newVoucher = new Voucher({
              code: generatedVoucherCode,
              initialValue: item.value,
              currentValue: item.value,
              salon: salonId,
            });
            await newVoucher.save();

            invoiceItems.push({ description: `Gutschein: ${generatedVoucherCode}`, price: item.value });
            subTotal += item.value;
            break;

          case 'service':
            if (!item.id) throw new Error('Dienstleistungs-ID fehlt.');
            const service = await Service.findById(item.id);
            if (!service) throw new Error(`Dienstleistung mit ID ${item.id} nicht gefunden.`);
            
            invoiceItems.push({ description: `${service.title}`, price: service.price });
            subTotal += service.price;
            break;
        }
      }
    }

    let finalAmount = subTotal;
    if (discount && discount.value > 0) {
      if (discount.type === 'percentage') {
        finalAmount = subTotal * (1 - discount.value / 100);
      } else if (discount.type === 'fixed') {
        finalAmount = subTotal - discount.value;
      }
    }
    finalAmount = Math.max(0, finalAmount);

    let change = 0;
    if (typeof amountGiven === 'number' && amountGiven >= finalAmount) {
      change = amountGiven - finalAmount;
    }

    // --- NEUE GUTSCHEIN-EINLÖSUNG ---
    let redeemedAmount = 0;
    let redeemedVoucherCode: string | undefined = undefined;

    if (voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode, salon: req.salonId });

      if (!voucher || voucher.currentValue <= 0) {
        throw new Error('Gutschein ist ungültig oder hat kein Guthaben.');
      }

      redeemedAmount = Math.min(finalAmount, voucher.currentValue);
      finalAmount -= redeemedAmount;

      voucher.currentValue -= redeemedAmount;
      await voucher.save();
      redeemedVoucherCode = voucher.code;
    }

    if (invoiceItems.length === 0) {
      throw new Error('Keine Artikel für die Rechnung vorhanden.');
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
      discount: discount,
      redeemedVoucher: redeemedVoucherCode,
      redeemedAmount: redeemedAmount,
      amount: finalAmount, 
      paymentMethod,
      voucherPayment: paymentMethod === 'voucher' ? voucherPayment : undefined, // Hier speichern
      date: today,
      status: 'paid',
      amountGiven: amountGiven || finalAmount,
      change: change,
    });
    await newInvoice.save();

    if (bookingId) {
      await Booking.findByIdAndUpdate(bookingId, { status: 'completed', invoiceNumber: newInvoice.invoiceNumber });
    }

    res.status(201).json(newInvoice);

  } catch (error: any) {
    console.error('Fehler beim Erstellen der Rechnung:', error);
    res.status(400).json({ message: error.message || 'Fehler beim Erstellen der Rechnung' });
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
        const { bookingId, paymentMethod, amountGiven, voucherCode } = req.body;

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
        
        let finalAmount = (booking.service as any).price;
        const serviceItem = {
            description: (booking.service as any).title,
            price: finalAmount,
        };

        let redeemedAmount = 0;
        let redeemedVoucherCode: string | undefined = undefined;

        if (voucherCode) {
            const voucher = await Voucher.findOne({ code: voucherCode, salon: req.salonId });
            if (voucher && voucher.isActive) {
                redeemedAmount = Math.min(finalAmount, voucher.currentValue);
                finalAmount -= redeemedAmount;

                voucher.currentValue -= redeemedAmount;
                if (voucher.currentValue <= 0) {
                    voucher.isActive = false;
                }
                await voucher.save();
                redeemedVoucherCode = voucher.code;
            } else {
                 return res.status(400).json({ message: 'Ungültiger oder inaktiver Gutscheincode.' });
            }
        }

        const given = amountGiven ? Number(amountGiven) : finalAmount;
        if (given < finalAmount) {
            return res.status(400).json({ message: 'Der gegebene Betrag ist geringer als der Rechnungsbetrag.' });
        }
        const change = given - finalAmount;

        const newInvoice = new Invoice({
            invoiceNumber,
            booking: booking._id,
            customer: booking.user,
            staff: booking.staff,
            salon: req.salonId,
            date: today,
            items: [serviceItem],
            amount: finalAmount,
            paymentMethod,
            amountGiven: given,
            change: change,
            status: 'paid',
            redeemedVoucher: redeemedVoucherCode,
            redeemedAmount: redeemedAmount,
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