import mongoose, { Schema } from 'mongoose'

// Ein Schema für einen einzelnen Eintrag in der Historie
const historyEntrySchema = new Schema({
  action: { type: String, required: true, enum: ['created', 'rescheduled', 'assigned', 'cancelled'] },
  executedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: String } // Ein Textfeld für Details wie "Geändert von 10:00 auf 11:00"
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dateTime: { type: Date, required: true },
  status: { type: String, enum: ['confirmed', 'paid', 'cancelled', 'completed'], default: 'confirmed' },
  paymentMethod: { type: String, enum: ['cash', 'card'], default: null },
  invoiceNumber: { type: String, default: null },
  reminderSent: { type: Boolean, default: false },
  
  // Das History-Array wird hinzugefügt
  history: { type: [historyEntrySchema], default: [] } 
})

export const Booking = mongoose.model('Booking', bookingSchema)