import { Response } from 'express';
import { SalonRequest } from '../middlewares/activeSalon';
import { Invoice } from '../models/Invoice';
import { Salon } from '../models/Salon';
import dayjs from 'dayjs';
import Papa from 'papaparse';

export const exportDatev = async (req: SalonRequest, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string, to?: string };
    const salonId = req.salonId;

    if (!salonId || !from || !to) {
      return res.status(400).json({ message: 'Salon-ID und Zeitraum sind erforderlich.' });
    }

    const startDate = dayjs(from).startOf('day').toDate();
    const endDate = dayjs(to).endOf('day').toDate();

    const [salon, invoices] = await Promise.all([
        Salon.findById(salonId),
        Invoice.find({ salon: salonId, date: { $gte: startDate, $lte: endDate }, status: 'paid' }).sort({ invoiceNumber: 1 })
    ]);

    if (!salon) {
        return res.status(404).json({ message: 'Salon nicht gefunden.' });
    }
    
    // KORREKTUR: Optional Chaining für typsicheren Zugriff mit Fallback-Werten
    const revenueAccount = salon.datevSettings?.revenueAccountServices ?? '8400';
    const cashAccount = salon.datevSettings?.cashAccount ?? '1000';
    const cardAccount = salon.datevSettings?.cardAccount ?? '1360';

    const datevData = [];
    for (const invoice of invoices) {
        const paymentMethodAccount = invoice.paymentMethod === 'card' ? cardAccount : cashAccount;

        datevData.push({
            'Umsatz (ohne S/H-Kz)': invoice.amount.toFixed(2).replace('.', ','),
            'S/H-Kz': 'H',
            'Konto': revenueAccount,
            'Gegenkonto': paymentMethodAccount,
            'Belegdatum': dayjs(invoice.date).format('DDMM'),
            'Belegfeld 1': invoice.invoiceNumber,
            'Buchungstext': `Umsatz ${dayjs(invoice.date).format('DD.MM.')} ${invoice.invoiceNumber}`,
        });
    }
    
    const csv = Papa.unparse(datevData, {
        delimiter: ';',
        header: true,
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="DATEV_Export_${dayjs(from).format('YYYY-MM-DD')}_-_${dayjs(to).format('YYYY-MM-DD')}.csv"`);
    res.status(200).send(csv);

  } catch (error) {
    console.error('DATEV Export Error:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des DATEV-Exports.' });
  }
};