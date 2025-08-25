import mongoose, { Schema } from 'mongoose'

const staffSalonSchema = new Schema({
  staff: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  active: { type: Boolean, default: true },
}, { timestamps: true })

staffSalonSchema.index({ staff: 1, salon: 1 }, { unique: true })

export const StaffSalon = mongoose.model('StaffSalon', staffSalonSchema)
