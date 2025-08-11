import { Request, Response } from 'express'
import { Service } from '../models/Service'
import { AuthRequest } from '../middlewares/authMiddleware'


export const listServices = async (req: Request, res: Response) => {
  try {
    const { salonId } = req.query as { salonId?: string }
    const filter: any = {}
    if (salonId) filter.salon = salonId
    const services = await Service.find(filter).sort({ title: 1 }).lean()
    return res.json({ success: true, services })
  } catch (e) {
    console.error('listServices error', e)
    return res.status(500).json({ success: false, message: 'Fehler beim Laden der Services' })
  }
}

// ➡ Alle Services abrufen (öffentlich)
export const getAllServices = async (req: Request, res: Response) => {
  try {
    const services = await Service.find()
    return res.status(200).json({ success: true, services })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Fehler beim Laden der Services' })
  }
}

// ➡ Service erstellen (Admin only)
export const createService = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, price, duration, salonId } = req.body
    if (!title || !duration || price == null) {
      return res.status(400).json({ success: false, message: 'title, duration, price sind erforderlich' })
    }
    const service = await Service.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : '',
      price: Number(price),
      duration: Number(duration),
      salon: salonId ?? null,
    })
    return res.status(201).json({ success: true, service })
  } catch (e) {
    console.error('createService error', e)
    return res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Service' })
  }
}


// ➡ Service löschen (Admin only)
export const deleteService = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const deleted = await Service.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    return res.json({ success: true })
  } catch (e) {
    console.error('deleteService error', e)
    return res.status(500).json({ success: false, message: 'Fehler beim Löschen' })
  }
}

export const updateService = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { title, description, price, duration, salonId } = req.body
    const patch: any = {}
    if (title !== undefined) patch.title = String(title).trim()
    if (description !== undefined) patch.description = String(description).trim()
    if (price !== undefined) patch.price = Number(price)
    if (duration !== undefined) patch.duration = Number(duration)
    if (salonId !== undefined) patch.salon = salonId ?? null

    const updated = await Service.findByIdAndUpdate(id, patch, { new: true })
    if (!updated) return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    return res.json({ success: true, service: updated })
  } catch (e) {
    console.error('updateService error', e)
    return res.status(500).json({ success: false, message: 'Fehler beim Aktualisieren' })
  }
}
