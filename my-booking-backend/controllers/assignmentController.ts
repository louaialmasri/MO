import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { StaffSalon } from '../models/StaffSalon'
import { ServiceSalon } from '../models/ServiceSalon'
import { User } from '../models/user'
import { Service } from '../models/Service'

export const assignStaffToSalon = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
    const { staffId, salonId } = req.body
    if (!mongoose.isValidObjectId(staffId) || !mongoose.isValidObjectId(salonId))
      return res.status(400).json({ success:false, message:'Ungültige ID' })
    const staff = await User.findById(staffId).select('role')
    if (!staff || staff.role !== 'staff') return res.status(400).json({ success:false, message:'Nur Mitarbeiter zuordnen' })
    const doc = await StaffSalon.findOneAndUpdate(
      { staff: staffId, salon: salonId },
      { $set: { active: true } },
      { upsert: true, new: true }
    )
    return res.json({ success:true, assignment: doc })
  } catch (e) {
    console.error(e); return res.status(500).json({ success:false, message:'Zuordnung fehlgeschlagen' })
  }
}

export const unassignStaffFromSalon = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
    const { staffId, salonId } = req.body
    await StaffSalon.findOneAndDelete({ staff: staffId, salon: salonId })
    return res.json({ success:true })
  } catch (e) { console.error(e); return res.status(500).json({ success:false, message:'Entfernen fehlgeschlagen' }) }
}

export const listStaffForSalon = async (req: AuthRequest, res: Response) => {
  try {
    const { salonId } = req.query as { salonId?: string }
    const sid = salonId || (req as any).salonId
    if (!sid) return res.json({ success:true, users: [] })
    const rows = await StaffSalon.find({ salon: sid, active: true }).select('staff').lean()
    const ids = rows.map(r => r.staff)
    const users = await User.find({ _id: { $in: ids } }).populate('skills')
    return res.json({ success:true, users })
  } catch (e) { console.error(e); return res.status(500).json({ success:false, message:'Fehler beim Laden' }) }
}

export const assignServiceToSalon = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
    const { serviceId, salonId, priceOverride, durationOverride } = req.body
    if (!mongoose.isValidObjectId(serviceId) || !mongoose.isValidObjectId(salonId))
      return res.status(400).json({ success:false, message:'Ungültige ID' })
    const svc = await Service.findById(serviceId)
    if (!svc) return res.status(404).json({ success:false, message:'Service nicht gefunden' })
    const doc = await ServiceSalon.findOneAndUpdate(
      { service: serviceId, salon: salonId },
      { $set: { active: true, priceOverride: priceOverride ?? null, durationOverride: durationOverride ?? null } },
      { upsert: true, new: true }
    )
    return res.json({ success:true, assignment: doc })
  } catch (e) { console.error(e); return res.status(500).json({ success:false, message:'Zuordnung fehlgeschlagen' }) }
}

export const unassignServiceFromSalon = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ success:false, message:'Nur Admin' })
    const { serviceId, salonId } = req.body
    await ServiceSalon.findOneAndDelete({ service: serviceId, salon: salonId })
    return res.json({ success:true })
  } catch (e) { console.error(e); return res.status(500).json({ success:false, message:'Entfernen fehlgeschlagen' }) }
}

export const listServicesForSalon = async (req: AuthRequest, res: Response) => {
  try {
    const { salonId } = req.query as { salonId?: string }
    const sid = salonId || (req as any).salonId
    if (!sid) return res.json({ success:true, services: [] })
    const rows = await ServiceSalon.find({ salon: sid, active: true }).lean()
    const ids = rows.map(r => r.service)
    const svcs = await Service.find({ _id: { $in: ids } }).lean()
    // Overrides anwenden
    const byId = new Map(svcs.map(s => [String(s._id), s]))
    const services = rows.map(r => {
      const base = byId.get(String(r.service))!
      return {
        ...base,
        price: r.priceOverride ?? base.price,
        duration: r.durationOverride ?? base.duration,
      }
    })
    return res.json({ success:true, services })
  } catch (e) { console.error(e); return res.status(500).json({ success:false, message:'Fehler beim Laden' }) }
}
