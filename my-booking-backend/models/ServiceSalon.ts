import mongoose, { Schema } from 'mongoose'

const serviceSalonSchema = new Schema({
  service:  { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
  salon:    { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  active:   { type: Boolean, default: true },
  // optionale pro-Salon Overrides:
  priceOverride:    { type: Number, default: null },
  durationOverride: { type: Number, default: null },
}, { timestamps: true })

serviceSalonSchema.index({ service: 1, salon: 1 }, { unique: true })

export const ServiceSalon = mongoose.model('ServiceSalon', serviceSalonSchema)
