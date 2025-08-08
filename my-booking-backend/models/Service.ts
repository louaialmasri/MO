import mongoose from 'mongoose'

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    duration: { type: Number, required: true },
  },
  { timestamps: true }
)

export const Service = mongoose.model('Service', serviceSchema)
