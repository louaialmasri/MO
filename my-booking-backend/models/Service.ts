import mongoose, { Schema } from 'mongoose'

const serviceSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  duration: { type: Number, required: true }, // Minuten
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', default: null }, // 👈 optional
}, { timestamps: true })

Service.belongsToMany(sequelize.models.User, { through: 'StaffService', foreignKey: 'serviceId', as: 'staff' });

export const Service = mongoose.model('Service', serviceSchema)
