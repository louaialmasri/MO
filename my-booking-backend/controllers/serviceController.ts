import { Request, Response } from 'express'
import { Service } from '../models/Service'
import { ServiceSalon } from '../models/ServiceSalon'
import { AuthRequest } from '../middlewares/authMiddleware'
import { SalonRequest } from '../middlewares/activeSalon'


export const listServices = async (req: any, res: any) => {
  try {
    const sid = req.salonId || (req.query?.salonId as string | undefined)
    if (!sid) return res.json({ success:true, services: [] })

    // 1) bevorzugt: Zuordnungen nutzen
    const rows = await ServiceSalon.find({ salon: sid, active: true }).lean()
    if (rows.length > 0) {
      const ids = rows.map(r => r.service)
      const svcs = await Service.find({ _id: { $in: ids } }).populate('category').lean() // Geändert
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
    }

    // 2) Fallback: alte Logik (falls noch keine Zuordnungen existieren)
    const services = await Service.find({ salon: sid }).sort({ title: 1 }).populate('category').lean() // Geändert
    return res.json({ success:true, services })
  } catch (e) {
    console.error('listServices error', e)
    return res.status(500).json({ success:false, message:'Fehler beim Laden der Services' })
  }
}

// ➡ Alle Services abrufen (öffentlich)
export const getAllServices = listServices;

// ➡ Service erstellen (Admin only)
export const createService = async (req: SalonRequest, res: Response) => {
  try {
    const { title, description, price, duration, category } = req.body // Geändert
    if (!title || !duration || price == null) {
      return res.status(400).json({ success: false, message: 'title, duration, price sind erforderlich' })
    }
    const service = await Service.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      price: Number(price),
      duration: Number(duration),
      // Prefer salon from middleware (header/user) to ensure correct binding
      salon: req.salonId ?? null,
      category: category || null, // Geändert
    })
    return res.status(201).json({ success: true, service })
  } catch (e) {
    console.error('createService error', e)
    return res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Service' })
  }
}


// ➡ Service löschen (Admin only)
export const deleteService = async (req: SalonRequest, res: Response) => {
  try {
    const { id } = req.params
    const svc = await Service.findById(id)
    if (!svc) return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    if (req.salonId && String(svc.salon) !== String(req.salonId)) {
      return res.status(403).json({ success:false, message:'Nicht autorisiert (Salon)'} )
    }
    const deleted = await Service.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    return res.json({ success: true })
  } catch (e) {
    console.error('deleteService error', e)
    return res.status(500).json({ success: false, message: 'Fehler beim Löschen' })
  }
}

export const updateService = async (req: SalonRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, price, duration, salonId, category } = req.body // Geändert
    const patch: any = {}
    if (title !== undefined) patch.title = String(title).trim()
    if (description !== undefined) patch.description = String(description).trim()
    if (price !== undefined) patch.price = Number(price)
    if (duration !== undefined) patch.duration = Number(duration)
    if (category !== undefined) patch.category = category // Geändert
    // Prevent changing salon to another salon if middleware provides one
    if (salonId !== undefined) {
      if (req.salonId && salonId && String(salonId) !== String(req.salonId)) {
        return res.status(403).json({ success:false, message:'Nicht autorisiert (Salon)'} )
      }
      patch.salon = salonId ?? null
    }

    const service = await Service.findById(id)
    if (!service) return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    if (req.salonId && service.salon && String(service.salon) !== String(req.salonId)) {
      return res.status(403).json({ success:false, message:'Nicht autorisiert (Salon)'} )
    }

    Object.assign(service, patch)
    await service.save()
    return res.json({ success: true, service })
  } catch (e) {
    console.error('updateService error', e)
    return res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren' })
  }
}