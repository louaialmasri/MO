import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: String,
  role: { type: String, enum: ['user','staff','admin'], required: true },
  skills: [{ type: Schema.Types.ObjectId, ref: 'Service' }], // welche Services kann er/sie
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', default: null }, // optional
})

export const User = mongoose.model('User', userSchema)
