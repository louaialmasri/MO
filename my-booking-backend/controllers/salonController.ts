import { Response } from 'express'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Salon } from '../models/Salon'

export const getMySalons = async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
  const salons = await Salon.find({ /* optional: owner: req.user.userId */ }).sort({ name: 1 })
  res.json({ success:true, salons })
}

export const createSalon = async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
  const { name, logoUrl } = req.body
  const salon = await Salon.create({ name, logoUrl /* , owner: req.user.userId */ })
  res.status(201).json({ success:true, salon })
}
