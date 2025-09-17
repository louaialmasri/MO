
import mongoose from 'mongoose'

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Mitarbeiter-Zuweisung
  dateTime: { type: Date, required: true },
  // NEUE FELDER
  status: { type: String, enum: ['confirmed', 'paid', 'cancelled', 'completed'], default: 'confirmed' },
  paymentMethod: { type: String, enum: ['cash', 'card'], default: null },
  invoiceNumber: { type: String, default: null }
})

export const Booking = mongoose.model('Booking', bookingSchema)