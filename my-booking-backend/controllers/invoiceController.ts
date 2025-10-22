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
  // KEINE SESSION ODER TRANSAKTION MEHR NÖTIG FÜR DIE LOKALE ENTWICKLUNG
  try {
    const {
      customerId,
      items,
      paymentMethod,
      discount,
      voucherCode: providedVoucherCode,
      amountGiven,
      totalAmount // Wir nennen es um, um Verwechslung zu vermeiden
    } = req.body;

    const salonId = req.salonId;
    const itemWithStaff = items && Array.isArray(items) ? items.find(item => item.staffId) : undefined;
    
    // Nutze die ID dieses Mitarbeiters. Wenn keiner gefunden wird (z.B. Produktverkauf),
    // nutze die ID des eingeloggten Benutzers als Fallback.
    const staffId = itemWithStaff ? itemWithStaff.staffId : req.user?.userId;

    if (!salonId || !staffId) {
      throw new Error('Authentifizierung fehlgeschlagen.');
    }
    if (!customerId) {
      throw new Error('Kunde ist erforderlich.');
    }

    const invoiceItems: { description: string; price: number }[] = [];
    let subTotal = 0;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        switch (item.type) {
          case 'product': {
            const product = await Product.findById(item.id);
            if (!product) throw new Error(`Produkt mit ID ${item.id} nicht gefunden.`);
            if (product.stock < 1) throw new Error(`Produkt "${product.name}" ist nicht mehr auf Lager.`);

            invoiceItems.push({ description: `Produkt: ${product.name}`, price: product.price });
            subTotal += product.price;

            product.stock -= 1;
            await product.save();
            break;
          }
          case 'voucher': {
            if (!item.value || item.value <= 0) throw new Error('Ungültiger Gutscheinwert.');
            const generatedVoucherCode = generateVoucherCode();
            const newVoucher = new Voucher({
              code: generatedVoucherCode,
              initialValue: item.value,
              currentValue: item.value,
              salon: salonId,
              isActive: true,
              createdBy: staffId,
            });
            await newVoucher.save();
            invoiceItems.push({ description: `Gutschein: ${generatedVoucherCode}`, price: item.value });
            subTotal += item.value;
            break;
          }
          case 'service': {
            const service = await Service.findById(item.id);
            if (!service) throw new Error(`Dienstleistung mit ID ${item.id} nicht gefunden.`);
            invoiceItems.push({ description: `${service.title}`, price: service.price });
            subTotal += service.price;
            break;
          }
          default:
            throw new Error(`Unbekannter Artikels-Typ: ${item.type}`);
        }
      }
    }

    let finalAmount = subTotal;
    if (discount && typeof discount.value === 'number' && discount.value > 0) {
      if (discount.type === 'percentage') {
        finalAmount *= (1 - discount.value / 100);
      } else if (discount.type === 'fixed') {
        finalAmount -= discount.value;
      }
    }
    finalAmount = Math.max(0, Number(finalAmount.toFixed(2)));

    let redeemedAmount = 0;
    let redeemedVoucherCode: string | undefined = undefined;
    let voucherInitial: number | undefined = undefined;
    let voucherRemaining: number | undefined = undefined;

    if (paymentMethod === 'voucher' && providedVoucherCode) {
        const voucher = await Voucher.findOne({ code: providedVoucherCode, salon: salonId });
        if (!voucher || voucher.currentValue <= 0) {
            throw new Error('Gutschein ist ungültig oder hat kein Guthaben.');
        }
        // WERT VOR DER TRANSAKTION ERFASSEN
        voucherInitial = voucher.currentValue;

        redeemedAmount = Math.min(finalAmount, voucher.currentValue);
        
        if (redeemedAmount < finalAmount) {
            throw new Error('Guthaben des Gutscheins reicht nicht aus, um die Rechnung komplett zu bezahlen.');
        }

        finalAmount -= redeemedAmount;
        voucher.currentValue -= redeemedAmount;

        // WERT NACH DER TRANSAKTION ERFASSEN
        voucherRemaining = voucher.currentValue;

        if (voucher.currentValue <= 0) {
            voucher.currentValue = 0;
            voucher.isActive = false;
        }
        await voucher.save();
        redeemedVoucherCode = voucher.code;
    }


    if (invoiceItems.length === 0) {
      throw new Error('Keine Artikel für die Rechnung vorhanden.');
    }

    let change = 0;
    if (paymentMethod === 'cash' && typeof amountGiven === 'number' && amountGiven >= finalAmount) {
        change = Number((amountGiven - finalAmount).toFixed(2));
    }


    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await Invoice.countDocuments({
      date: { $gte: dayjs(today).startOf('day').toDate() },
      salon: salonId,
    });
    const invoiceNumber = `${dateStr}-${countToday + 1}`;

    const newInvoice = new Invoice({
      invoiceNumber,
      customer: customerId,
      salon: salonId,
      staff: staffId,
      items: invoiceItems,
      discount: discount || null,
      redeemedVoucher: redeemedVoucherCode || null,
      redeemedAmount: redeemedAmount || 0,
      voucherInitialValue: voucherInitial,
      voucherRemainingValue: voucherRemaining,
      amount: finalAmount,
      paymentMethod,
      date: today,
      status: 'paid',
      amountGiven: amountGiven,
      change: change,
    });

    await newInvoice.save();

    res.status(201).json(newInvoice);

  } catch (error: any) {
    console.error('Fehler beim Erstellen der Rechnung:', error);
    const status = error.message.includes('nicht gefunden') || error.message.includes('erforderlich') ? 404 : 500;
    res.status(status).json({ message: error.message || 'Fehler beim Erstellen der Rechnung' });
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