import { Request, Response } from 'express'
import { Service } from '../models/Service'
import { AuthRequest } from '../middlewares/authMiddleware'

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
  const { name } = req.body

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name erforderlich' })
  }

  try {
    const exists = await Service.findOne({ name })
    if (exists) {
      return res.status(409).json({ success: false, message: 'Service existiert bereits' })
    }

    const service = new Service({ name })
    await service.save()

    return res.status(201).json({ success: true, message: 'Service erstellt', service })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Fehler beim Erstellen des Services' })
  }
}

// ➡ Service löschen (Admin only)
export const deleteService = async (req: AuthRequest, res: Response) => {
  const serviceId = req.params.id

  try {
    const service = await Service.findById(serviceId)
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service nicht gefunden' })
    }

    await Service.deleteOne({ _id: serviceId })
    return res.status(200).json({ success: true, message: 'Service gelöscht' })
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Fehler beim Löschen des Services' })
  }
}
