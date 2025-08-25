import mongoose, { Schema } from 'mongoose'

const segmentSchema = new Schema({
  start: { type: String, required: true }, // "HH:mm"
  end:   { type: String, required: true }, // "HH:mm"
  type:  { type: String, enum: ['work','break'], default: 'work' }
}, { _id: false })

const daySchema = new Schema({
  weekday: { type: Number, min: 0, max: 6, required: true }, // 0=So ... 6=Sa
  segments: { type: [segmentSchema], default: [] }
}, { _id: false })

const availabilityTemplateSchema = new Schema({
  name:  { type: String, required: true },
  staff: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  days:  { type: [daySchema], default: [] }
}, { timestamps: true })

availabilityTemplateSchema.index({ staff: 1, salon: 1, name: 1 }, { unique: true })

export const AvailabilityTemplate = mongoose.model('AvailabilityTemplate', availabilityTemplateSchema)
