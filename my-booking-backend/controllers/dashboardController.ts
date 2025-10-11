import { Response } from 'express';
import { SalonRequest } from '../middlewares/activeSalon';
import { Invoice } from '../models/Invoice';
import mongoose from 'mongoose';
import dayjs from 'dayjs';

export const getDashboardStats = async (req: SalonRequest, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string, to?: string };
    const salonId = req.salonId;

    if (!salonId || !from || !to) {
      return res.status(400).json({ message: 'Salon-ID, Start- und Enddatum sind erforderlich.' });
    }

    // Aktueller Zeitraum
    const startDate = dayjs(from).startOf('day').toDate();
    const endDate = dayjs(to).endOf('day').toDate();
    const salonObjectId = new mongoose.Types.ObjectId(salonId);

    // NEU: Vorherigen Zeitraum berechnen
    const duration = dayjs(endDate).diff(dayjs(startDate), 'day');
    const previousStartDate = dayjs(startDate).subtract(duration + 1, 'day').toDate();
    const previousEndDate = dayjs(startDate).subtract(1, 'day').endOf('day').toDate();
    
    // Alle Abfragen parallel ausführen
    const [
        currentPeriodStats,
        previousPeriodStats,
        revenueByStaff,
        revenueBySource,
        dailyRevenue,
        topServices
    ] = await Promise.all([
        // KPI für aktuellen Zeitraum
        Invoice.aggregate([
            { $match: { salon: salonObjectId, date: { $gte: startDate, $lte: endDate }, status: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalBookings: { $sum: 1 } } }
        ]),
        // NEU: KPI für vorherigen Zeitraum
        Invoice.aggregate([
            { $match: { salon: salonObjectId, date: { $gte: previousStartDate, $lte: previousEndDate }, status: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalBookings: { $sum: 1 } } }
        ]),
        // Umsatz pro Mitarbeiter
        Invoice.aggregate([
            { $match: { salon: salonObjectId, date: { $gte: startDate, $lte: endDate }, status: 'paid' } },
            { $lookup: { from: 'users', localField: 'staff', foreignField: '_id', as: 'staffDetails' } },
            { $unwind: { path: '$staffDetails', preserveNullAndEmptyArrays: true } },
            { $group: { _id: '$staffDetails', totalRevenue: { $sum: '$amount' } } },
            { $project: { _id: 0, staffName: { $concat: ['$_id.firstName', ' ', '$_id.lastName'] }, totalRevenue: 1 } }
        ]),
        // Umsatz nach Quelle
        Invoice.aggregate([
            { $match: { salon: salonObjectId, date: { $gte: startDate, $lte: endDate }, status: 'paid' } },
            { $unwind: '$items' },
            { $group: { _id: { $cond: [{ $regexMatch: { input: '$items.description', regex: /^Produkt:/ } }, 'Produkte', 'Dienstleistungen'] }, totalRevenue: { $sum: '$items.price' } } },
            { $project: { _id: 0, source: '$_id', totalRevenue: 1 } }
        ]),
        // Täglicher Umsatz
        Invoice.aggregate([
            { $match: { salon: salonObjectId, date: { $gte: startDate, $lte: endDate }, status: 'paid' } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, dailyRevenue: { $sum: '$amount' } } },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, date: '$_id', totalRevenue: '$dailyRevenue' } }
        ]),
        // NEU: Top 5 Dienstleistungen
        Invoice.aggregate([
            { $match: { salon: salonObjectId, date: { $gte: startDate, $lte: endDate }, status: 'paid' } },
            { $unwind: '$items' },
            { $match: { 'items.description': { $not: /^Produkt:/ } } }, // Nur Dienstleistungen
            { $group: { _id: '$items.description', totalRevenue: { $sum: '$items.price' }, count: { $sum: 1 } } },
            { $sort: { totalRevenue: -1 } },
            { $limit: 5 },
            { $project: { _id: 0, name: '$_id', totalRevenue: 1, count: 1 } }
        ])
    ]);

    res.json({
      success: true,
      stats: {
        totalRevenue: currentPeriodStats[0]?.totalRevenue || 0,
        totalBookings: currentPeriodStats[0]?.totalBookings || 0,
        previousPeriodRevenue: previousPeriodStats[0]?.totalRevenue || 0,
        previousPeriodBookings: previousPeriodStats[0]?.totalBookings || 0,
        revenueByStaff,
        revenueBySource,
        dailyRevenue,
        topServices
      }
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Dashboard-Daten.' });
  }
};