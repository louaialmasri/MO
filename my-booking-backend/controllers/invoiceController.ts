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
  // Session / Transaction starten
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Request-Body Felder (inkl. optionaler Felder)
    const {
      bookingId,
      customerId,
      items,
      paymentMethod,
      staffId: providedStaffId,
      discount,
      voucherCode: providedVoucherCode,
      amountGiven,
      voucherPayment, // falls du einen separaten Betrag für Gutschein-Zahlung speicherst
      totalAmount: providedTotalAmount, // optional (wir berechnen meist selbst)
    } = req.body;

    if (!req.user || !req.salonId) {
      throw new Error('Authentifizierung fehlgeschlagen.');
    }
    const salonId = req.salonId;
    const staffId = providedStaffId || req.user.userId;

    if (!customerId) {
      throw new Error('Kunde ist erforderlich.');
    }

    // Items verarbeiten (Produkte, Services, neue Gutscheine)
    const invoiceItems: { description: string; price: number }[] = [];
    let subTotal = 0;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        switch (item.type) {
          case 'product': {
            if (!item.id) throw new Error('Produkt-ID fehlt.');
            const product = await Product.findById(item.id).session(session);
            if (!product) throw new Error(`Produkt mit ID ${item.id} nicht gefunden.`);
            if (product.stock < 1) throw new Error(`Produkt "${product.name}" ist nicht mehr auf Lager.`);

            invoiceItems.push({ description: `Produkt: ${product.name}`, price: product.price });
            subTotal += product.price;

            product.stock -= 1;
            await product.save({ session });
            break;
          }

          case 'voucher': {
            // Verkauf eines Gutscheins — neuer Voucher wird erstellt
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

            await newVoucher.save({ session });

            invoiceItems.push({ description: `Gutschein: ${generatedVoucherCode}`, price: item.value });
            subTotal += item.value;
            break;
          }

          case 'service': {
            if (!item.id) throw new Error('Dienstleistungs-ID fehlt.');
            const service = await Service.findById(item.id).session(session);
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

    // Zwischensumme berechnet — jetzt Rabatt anwenden (falls vorhanden)
    let finalAmount = subTotal;
    if (discount && typeof discount.value === 'number' && discount.value > 0) {
      if (discount.type === 'percentage') {
        finalAmount = subTotal * (1 - discount.value / 100);
      } else if (discount.type === 'fixed') {
        finalAmount = subTotal - discount.value;
      }
    }
    finalAmount = Math.max(0, Number(finalAmount.toFixed(2))); // auf 2 Dezimalstellen runden

    // --- FALLS client totalAmount mitliefert, optional prüfen ---
    if (typeof providedTotalAmount === 'number') {
      // optional: wenn providedTotalAmount deutlich abweicht, könnte man warnen oder Fehler werfen.
      // Hier nur prüfen (keine Exception), du kannst das Verhalten anpassen:
      const diff = Math.abs(providedTotalAmount - finalAmount);
      if (diff > 0.01) {
        console.warn(
          `Warnung: providedTotalAmount (${providedTotalAmount}) stimmt nicht exakt mit berechnetem finalAmount (${finalAmount}) überein.`
        );
      }
    }

    // Gutschein-Einlösung (wenn voucherCode angegeben) — reduziert finalAmount
    let redeemedAmount = 0;
    let redeemedVoucherCode: string | undefined = undefined;
    if (providedVoucherCode) {
      // Suche Gutschein in Session
      const voucher = await Voucher.findOne({ code: providedVoucherCode, salon: salonId }).session(session);
      if (!voucher || voucher.currentValue <= 0) {
        throw new Error('Gutschein ist ungültig oder hat kein Guthaben.');
      }

      // Betrag, der durch Gutschein gedeckt werden kann
      redeemedAmount = Math.min(finalAmount, voucher.currentValue);
      finalAmount = Number((finalAmount - redeemedAmount).toFixed(2));

      voucher.currentValue = Number((voucher.currentValue - redeemedAmount).toFixed(2));
      if (voucher.currentValue <= 0) {
        voucher.currentValue = 0;
        voucher.isActive = false;
      }
      await voucher.save({ session });

      redeemedVoucherCode = voucher.code;
    }

    // Spezielle Logik: paymentMethod === 'voucher' — gesamte Zahlung aus Gutschein
    // Wenn paymentMethod === 'voucher' erwarten wir, dass voucherCode angegeben wurde und genügend Guthaben vorhanden ist.
    if (paymentMethod === 'voucher') {
      if (!providedVoucherCode) {
        throw new Error('Bei Zahlung per Gutschein muss ein Gutschein-Code angegeben werden.');
      }

      // Wir müssen erneut den Gutschein laden (oder wir behalten voucher oben).
      // Falls oben bereits voucher geladen war und Gutschein vollständig genutzt wurde, finalAmount wäre 0.
      // Um die gewünschte Semantik des "Extension"-Beispiels nachzubilden: voucher.currentValue muss >= finalAmount_before_redemption
      // In unserem Ablauf haben wir den Gutschein bereits für 'redeemedAmount' reduziert. Wenn der intent ist,
      // dass bei paymentMethod === 'voucher' die komplette Rechnung vom Gutschein bezahlt wird, sollten wir prüfen:
      // -> if redeemedAmount < originalFinalAmount => Fehler (nicht genug Guthaben)
      // In unserem Ablauf ist redeemedAmount = min(originalFinalAmount, voucher.currentValue)
      // So prüfen wir:
      if (finalAmount > 0) {
        // Das heißt: Gutschein reichte nicht aus
        throw new Error('Guthaben des Gutscheins reicht nicht aus, um die Rechnung komplett mit Gutschein zu bezahlen.');
      }
    }

    // Falls keine Artikel -> Fehler
    if (invoiceItems.length === 0) {
      throw new Error('Keine Artikel für die Rechnung vorhanden.');
    }

    // Wechselgeld-Berechnung (wenn Betrag gegeben wurde)
    let change = 0;
    if (typeof amountGiven === 'number' && amountGiven >= finalAmount) {
      change = Number((amountGiven - finalAmount).toFixed(2));
    }

    // Rechnungsnummer generieren (Datum + Zähler für den Tag)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await Invoice.countDocuments({
      date: { $gte: dayjs(today).startOf('day').toDate() },
      salon: salonId,
    }).session(session);
    const invoiceNumber = `${dateStr}-${countToday + 1}`;

    // Neues Invoice-Objekt zusammenbauen
    const newInvoice = new Invoice({
      invoiceNumber,
      booking: bookingId || null,
      customer: customerId,
      salon: salonId,
      staff: staffId,
      items: invoiceItems,
      discount: discount || null,
      redeemedVoucher: redeemedVoucherCode || null,
      redeemedAmount: redeemedAmount || 0,
      amount: Number(finalAmount.toFixed(2)),
      paymentMethod,
      voucherPayment: paymentMethod === 'voucher' ? voucherPayment ?? redeemedAmount : voucherPayment ?? redeemedAmount, // optional
      voucherCode: paymentMethod === 'voucher' ? providedVoucherCode : providedVoucherCode ?? undefined, // Speichere wenn vorhanden
      date: today,
      status: 'paid',
      amountGiven: typeof amountGiven === 'number' ? amountGiven : Number(finalAmount.toFixed(2)),
      change,
    });

    // Invoice speichern (in Transaction)
    await newInvoice.save({ session });

    // Booking updaten, falls vorhanden
    if (bookingId) {
      await Booking.findByIdAndUpdate(
        bookingId,
        { status: 'completed', invoiceNumber: newInvoice.invoiceNumber },
        { session }
      );
    }

    // Alles committen
    await session.commitTransaction();

    // Session beenden
    session.endSession();

    // Antwort
    return res.status(201).json(newInvoice);
  } catch (error: any) {
    // Bei Fehler: Transaction aborten
    try {
      await session.abortTransaction();
    } catch (abortErr) {
      console.error('Fehler beim Abbrechen der Transaktion:', abortErr);
    }
    session.endSession();

    console.error('Fehler beim Erstellen der Rechnung:', error);
    // 400 für validierungsfehler, 500 für serverfehler — hier vereinfacht 400 wenn message vorhanden
    const status = error && error.message && /nicht|fehl|ungültig/i.test(error.message) ? 400 : 500;
    return res.status(status).json({ message: error.message || 'Fehler beim Erstellen der Rechnung' });
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