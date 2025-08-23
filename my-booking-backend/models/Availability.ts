import mongoose, { Schema } from 'mongoose'

const availabilitySchema = new Schema({
  staff: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['absence', 'work', 'break'], required: true }, // Abwesenheit, Arbeitszeit, Pause
  start: { type: Date, required: true, index: true },
  end:   { type: Date, required: true, index: true },
  note:  { type: String, default: '' },
}, { timestamps: true })

availabilitySchema.index({ staff: 1, start: 1, end: 1, type: 1 })

export const Availability = mongoose.model('Availability', availabilitySchema)
