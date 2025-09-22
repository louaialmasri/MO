import { Request, Response } from 'express'
import { Service } from '../models/Service'
import { ServiceSalon } from '../models/ServiceSalon'
import { SalonRequest } from '../middlewares/activeSalon'

// ... (listServices, createService, deleteService, updateService bleiben wie in unserem letzten richtigen Stand)
export const listServices = async (req: any, res: any) => {
  try {
    const sid = req.salonId || (req.query?.salonId as string | undefined)
    if (!sid) return res.json({ success:true, services: [] })
    const rows = await ServiceSalon.find({ salon: sid, active: true }).lean()
    if (rows.length > 0) {
      const ids = rows.map(r => r.service)
      const svcs = await Service.find({ _id: { $in: ids } }).populate('category').lean()
      const byId = new Map(svcs.map(s => [String(s._id), s]))
      const services = rows.map(r => {
        const base = byId.get(String(r.service))!
        return { ...base, price: r.priceOverride ?? base.price, duration: r.durationOverride ?? base.duration, }
      })
      return res.json({ success:true, services })
    }
    const services = await Service.find({ salon: sid }).sort({ title: 1 }).populate('category').lean()
    return res.json({ success:true, services })
  } catch (e) {
    console.error('listServices error', e)
    return res.status(500).json({ success:false, message:'Fehler beim Laden der Services' })
  }
}
export const createService = async (req: SalonRequest, res: Response) => {
  try {
    const { title, description, price, duration, category } = req.body
    if (!title || !duration || price == null || !category) {
      return res.status(400).json({ success: false, message: 'Titel, Dauer, Preis und Kategorie sind erforderlich' })
    }
    const service = await Service.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      price: Number(price),
      duration: Number(duration),
      salon: req.salonId ?? null,
      category: category,
    })
    return res.status(201).json({ success: true, service })
  } catch (e) {
    console.error('createService error', e)
    return res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Service' })
  }
}
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
    const { title, description, price, duration, salonId, category } = req.body
    const patch: any = {}
    if (title !== undefined) patch.title = String(title).trim()
    if (description !== undefined) patch.description = String(description).trim()
    if (price !== undefined) patch.price = Number(price)
    if (duration !== undefined) patch.duration = Number(duration)
    if (category) patch.category = category
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


// --- NEU: Globale Service-Funktionen ---

export const listGlobalServices = async (req: Request, res: Response) => {
  try {
    const services = await Service.find({ salon: null }).sort({ title: 1 }).populate('category').lean()
    res.json(services)
  } catch (e) {
    res.status(500).json({ message: 'Fehler beim Laden der globalen Services' })
  }
}

export const createGlobalService = async (req: Request, res: Response) => {
  try {
    const { title, description, price, duration, category } = req.body
    // HIER IST DIE WICHTIGE VALIDIERUNG
    if (!title || !price || !duration || !category) {
      return res.status(400).json({ success: false, message: 'Titel, Preis, Dauer und Kategorie sind erforderlich' })
    }
    const service = await Service.create({
      title,
      description,
      price: Number(price),
      duration: Number(duration),
      salon: null, // Explizit null für globale Services
      category: category
    })
    res.status(201).json({ success: true, service })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, message: 'Fehler beim Erstellen des globalen Service' })
  }
}

export const updateGlobalService = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, description, price, duration, category } = req.body;
      const patchData: any = {};
      if (title !== undefined) patchData.title = title;
      if (description !== undefined) patchData.description = description;
      if (price !== undefined) patchData.price = Number(price);
      if (duration !== undefined) patchData.duration = Number(duration);
      if (category !== undefined) patchData.category = category;
      const updatedService = await Service.findByIdAndUpdate(id, patchData, { new: true });
      if (!updatedService) {
        return res.status(404).json({ success: false, message: 'Service nicht gefunden' });
      }
      res.json({ success: true, service: updatedService });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren' });
    }
};

export const deleteGlobalService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const assignCount = await ServiceSalon.countDocuments({ service: id })
    if (assignCount > 0) return res.status(400).json({ message: 'Service ist noch Salons zugewiesen' })
    const deleted = await Service.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ message: 'Service nicht gefunden' })
    res.json({ success: true })
  } catch (e) {
    res.status(500).json({ message: 'Fehler beim Löschen des Service' })
  }
}