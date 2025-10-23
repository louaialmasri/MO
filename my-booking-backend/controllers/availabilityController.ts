import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { Availability } from '../models/Availability'

import { User } from '../models/User'

const canManage = (req: AuthRequest, targetStaffId: string) => {
  if (!req.user) return false
  if (req.user.role === 'admin') return true
  if (req.user.role === 'staff' && String(req.user.userId) === String(targetStaffId)) return true
  return false
}

export const createAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, type, start, end, note } = req.body
    if (!staffId || !type || !start || !end)
      return res.status(400).json({ success:false, message:'staffId, type, start, end erforderlich' })

    if (!mongoose.Types.ObjectId.isValid(staffId))
      return res.status(400).json({ success:false, message:'Ungültige staffId' })

    if (!['absence','work','break'].includes(type))
      return res.status(400).json({ success:false, message:'Ungültiger type' })


    let s = new Date(start), e = new Date(end)
    if (type === 'absence') {
      // Setze auf Tagesgrenzen
      s.setHours(0,0,0,0)
      e.setHours(23,59,59,999)
    }
    if (!(s < e)) return res.status(400).json({ success:false, message:'start < end erforderlich' })

    const staff = await User.findById(staffId).select('role')
    if (!staff || staff.role !== 'staff')
      return res.status(404).json({ success:false, message:'Mitarbeiter nicht gefunden oder ungültig' })

    if (!canManage(req, staffId))
      return res.status(403).json({ success:false, message:'Nicht autorisiert' })

    const salonId = (req as any).salonId || null
    const item = await Availability.create({ staff: staffId, type, start: s, end: e, note, salon: salonId })
    return res.status(201).json({ success:true, availability: item })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Serverfehler beim Anlegen' })
  }
}

export const getAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { staffId, from, to } = req.query as { staffId?: string; from?: string; to?: string }

    const q: any = {}
    if (staffId) q.staff = staffId
    if (from || to) {
      q.$and = [
        { start: { $lt: to ? new Date(to) : new Date('9999-12-31') } },
        { end:   { $gt: from ? new Date(from) : new Date('1970-01-01') } },
      ]
    }

    // Staff darf standardmäßig nur seine Daten sehen (falls kein staffId gesetzt)
    if (!q.staff && req.user?.role === 'staff') q.staff = req.user.userId

    const items = await Availability.find(q).populate('staff', 'name email').sort({ start: 1 })
    return res.json({ success:true, availability: items })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Serverfehler beim Laden' })
  }
}

export const deleteAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const item = await Availability.findById(id)
    if (!item) return res.status(404).json({ success:false, message:'Eintrag nicht gefunden' })

    if (!canManage(req, String(item.staff)))
      return res.status(403).json({ success:false, message:'Nicht autorisiert' })

    await Availability.findByIdAndDelete(id)
    return res.json({ success:true, message:'Eintrag gelöscht' })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Serverfehler beim Löschen' })
  }
}

export const updateAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { staffId, type, start, end, note } = req.body

    const item = await Availability.findById(id)
    if (!item) return res.status(404).json({ success:false, message:'Eintrag nicht gefunden' })

    // nur Admin oder Besitzer
    const requester = req.user
    const isOwner = requester?.role === 'staff' && String(requester.userId) === String(item.staff)
    const isAdmin  = requester?.role === 'admin'
    if (!isAdmin && !isOwner) return res.status(403).json({ success:false, message:'Nicht autorisiert' })

    const patch: any = {}
    if (staffId) {
      if (!mongoose.Types.ObjectId.isValid(staffId)) return res.status(400).json({ success:false, message:'Ungültige staffId' })
      const staff = await User.findById(staffId).select('role')
      if (!staff || staff.role !== 'staff') return res.status(404).json({ success:false, message:'Mitarbeiter ungültig' })
      patch.staff = staffId
    }
    if (type) {
      if (!['absence','work','break'].includes(type)) return res.status(400).json({ success:false, message:'Ungültiger type' })
      patch.type = type
    }
    if (start) patch.start = new Date(start)
    if (end)   patch.end   = new Date(end)
    if (note !== undefined) patch.note = note

    const updated = await Availability.findByIdAndUpdate(id, patch, { new: true })
    return res.json({ success:true, availability: updated })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ success:false, message:'Serverfehler beim Aktualisieren' })
  }
}