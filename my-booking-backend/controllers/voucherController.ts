import { Response } from 'express';
import { SalonRequest } from '../middlewares/activeSalon';
import { Voucher } from '../models/Voucher';

export const validateVoucher = async (req: SalonRequest, res: Response) => {
  try {
    const { code } = req.params;
    const salonId = req.salonId;

    if (!code) {
      return res.status(400).json({ message: 'Gutschein-Code erforderlich.' });
    }

    const voucher = await Voucher.findOne({ code: code.toUpperCase(), salon: salonId });

    if (!voucher) {
      return res.status(404).json({ message: 'Gutschein nicht gefunden.' });
    }
    if (voucher.currentValue <= 0) {
      return res.status(400).json({ message: 'Gutschein hat kein Guthaben mehr.' });
    }

    res.json({ success: true, voucher });

  } catch (error) {
    res.status(500).json({ message: 'Serverfehler bei der Gutscheinprüfung.' });
  }
};