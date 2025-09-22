import mongoose, { Schema } from 'mongoose'

const serviceSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  duration: { type: Number, required: true }, // Minuten
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', default: null },
  category: { type: Schema.Types.ObjectId, ref: 'ServiceCategory', required: true }
}, { timestamps: true })


export const Service = mongoose.model('Service', serviceSchema)