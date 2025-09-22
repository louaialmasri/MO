import mongoose, { Schema } from 'mongoose'
import sequelize from 'sequelize/types/sequelize';

const serviceSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  duration: { type: Number, required: true }, // Minuten
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', default: null }, // 👈 optional
  category: { type: Schema.Types.ObjectId, ref: 'ServiceCategory' }
}, { timestamps: true })


export const Service = mongoose.model('Service', serviceSchema)