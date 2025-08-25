import { Response } from 'express'
import mongoose from 'mongoose'
import { AuthRequest } from '../middlewares/authMiddleware'
import { AvailabilityTemplate } from '../models/AvailabilityTemplate'
import { Availability } from '../models/Availability'

const isHHMM = (s: string) => /^\d{2}:\d{2}$/.test(s)

export const listTemplates = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { staffId } = req.query as { staffId?: string }
    if (!req.salonId) return res.json({ success: true, templates: [] })
    const q: any = { salon: req.salonId }
    if (staffId) q.staff = staffId
    const templates = await AvailabilityTemplate.find(q).sort({ name: 1 }).lean()
    res.json({ success: true, templates })
  } catch (e) {
    console.error(e); res.status(500).json({ success:false, message:'Fehler beim Laden' })
  }
}

export const createTemplate = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    if (!req.salonId) return res.status(400).json({ success:false, message:'Kein Salon gewählt' })
    const { name, staff, days } = req.body
    if (!name || !staff) return res.status(400).json({ success:false, message:'name & staff erforderlich' })
    if (!mongoose.isValidObjectId(staff)) return res.status(400).json({ success:false, message:'Ungültiger staff' })

    for (const d of days || []) {
      if (typeof d.weekday !== 'number') return res.status(400).json({ success:false, message:'weekday fehlt' })
      for (const seg of d.segments || []) {
        if (!isHHMM(seg.start) || !isHHMM(seg.end)) return res.status(400).json({ success:false, message:'Zeitformat HH:mm' })
      }
    }

    const doc = await AvailabilityTemplate.create({ name: String(name).trim(), staff, salon: req.salonId, days: days || [] })
    res.status(201).json({ success:true, template: doc })
  } catch (e) { console.error(e); res.status(500).json({ success:false, message:'Fehler beim Erstellen' }) }
}

export const updateTemplate = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { id } = req.params
    const tpl = await AvailabilityTemplate.findById(id)
    if (!tpl) return res.status(404).json({ success:false, message:'Template nicht gefunden' })
    if (req.salonId && String(tpl.salon) !== String(req.salonId)) return res.status(403).json({ success:false, message:'Falscher Salon' })

    const { name, days } = req.body
    if (name !== undefined) tpl.name = String(name).trim()
    if (days !== undefined) tpl.days = days
    await tpl.save()
    res.json({ success:true, template: tpl })
  } catch (e) { console.error(e); res.status(500).json({ success:false, message:'Fehler beim Update' }) }
}

export const deleteTemplate = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { id } = req.params
    const tpl = await AvailabilityTemplate.findById(id)
    if (!tpl) return res.status(404).json({ success:false, message:'Template nicht gefunden' })
    if (req.salonId && String(tpl.salon) !== String(req.salonId)) return res.status(403).json({ success:false, message:'Falscher Salon' })
    await AvailabilityTemplate.findByIdAndDelete(id)
    res.json({ success:true })
  } catch (e) { console.error(e); res.status(500).json({ success:false, message:'Fehler beim Löschen' }) }
}

export const applyTemplate = async (req: AuthRequest & { salonId?: string }, res: Response) => {
  try {
    const { templateId, weekStart, weeks = 1, replace = true } = req.body as {
      templateId: string; weekStart: string; weeks?: number; replace?: boolean
    }
    if (!req.salonId) return res.status(400).json({ success:false, message:'Kein Salon gewählt' })
    const tpl = await AvailabilityTemplate.findById(templateId)
    if (!tpl) return res.status(404).json({ success:false, message:'Template nicht gefunden' })
    if (String(tpl.salon) !== String(req.salonId)) return res.status(403).json({ success:false, message:'Falscher Salon' })

    const start = new Date(weekStart) // Montag 00:00
    if (isNaN(start.getTime())) return res.status(400).json({ success:false, message:'Ungültiges Datum' })

    // Hilfsfunktionen
    const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
    const at = (base: Date, hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number)
      return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0)
    }

    let created = 0, replaced = 0
    for (let w = 0; w < weeks; w++) {
      const weekBase = addDays(start, w * 7)
      for (const day of tpl.days) {
        const dayDate = addDays(weekBase, ((day.weekday + 7) % 7)) // 0=So … 6=Sa
        const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0)
        const dayEnd   = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999)

        if (replace) {
          // nur work/break löschen – Abwesenheiten ("away") bleiben bestehen
          const delRes = await Availability.deleteMany({
            staff: tpl.staff, salon: tpl.salon, type: { $in: ['work','break'] },
            start: { $gte: dayStart }, end: { $lte: dayEnd }
          })
          replaced += delRes.deletedCount || 0
        }

        for (const seg of day.segments) {
          const segStart = at(dayDate, seg.start)
          const segEnd   = at(dayDate, seg.end)
          if (segEnd <= segStart) continue
          await Availability.create({
            staff: tpl.staff,
            salon: tpl.salon,
            type:  seg.type,           // 'work' oder 'break'
            start: segStart,
            end:   segEnd,
            note:  `Template: ${tpl.name}`
          })
          created++
        }
      }
    }

    return res.json({ success:true, created, replaced })
  } catch (e) {
    console.error(e); res.status(500).json({ success:false, message:'Fehler beim Anwenden' })
  }
}
