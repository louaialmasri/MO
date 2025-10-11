import { Response } from 'express';
import { SalonRequest } from '../middlewares/activeSalon';
import { Invoice } from '../models/Invoice';
import mongoose from 'mongoose';
import dayjs from 'dayjs';

export const getDashboardStats = async (req: SalonRequest, res: Response) => {
  try {
    const { from, to } = req.query as { from?: string, to?: string };
    const salonId = req.salonId;

    if (!salonId) {
      return res.status(400).json({ message: 'Kein Salon ausgewählt.' });
    }
    if (!from || !to) {
        return res.status(400).json({ message: 'Start- und Enddatum sind erforderlich.' });
    }

    const startDate = dayjs(from).startOf('day').toDate();
    const endDate = dayjs(to).endOf('day').toDate();
    const salonObjectId = new mongoose.Types.ObjectId(salonId);

    // Aggregation für Umsatz pro Mitarbeiter
    const revenueByStaff = await Invoice.aggregate([
      {
        $match: {
          salon: salonObjectId,
          date: { $gte: startDate, $lte: endDate },
          status: 'paid'
        }
      },
      { $lookup: { from: 'users', localField: 'staff', foreignField: '_id', as: 'staffDetails' } },
      { $unwind: '$staffDetails' },
      {
        $group: {
          _id: '$staffDetails',
          totalRevenue: { $sum: '$amount' },
          totalBookings: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          staffId: '$_id._id',
          staffName: { $concat: ['$_id.firstName', ' ', '$_id.lastName'] },
          totalRevenue: 1,
          totalBookings: 1
        }
      }
    ]);

    // NEU: Aggregation für Umsatz nach Quelle (Dienstleistung vs. Produkt)
    const revenueBySource = await Invoice.aggregate([
        {
          $match: {
            salon: salonObjectId,
            date: { $gte: startDate, $lte: endDate },
            status: 'paid'
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              $cond: [
                { $regexMatch: { input: '$items.description', regex: /^Produkt:/ } },
                'Produkte',
                'Dienstleistungen'
              ]
            },
            totalRevenue: { $sum: '$items.price' }
          }
        },
        {
          $project: {
            _id: 0,
            source: '$_id',
            totalRevenue: 1,
          }
        }
    ]);

    const totalRevenue = revenueByStaff.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalBookings = revenueByStaff.reduce((sum, s) => sum + s.totalBookings, 0);

    res.json({
      success: true,
      stats: {
        totalRevenue,
        totalBookings,
        revenueByStaff,
        revenueBySource // NEU
      }
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Fehler beim Laden der Dashboard-Daten.' });
  }
};