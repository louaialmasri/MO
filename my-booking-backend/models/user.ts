import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'staff', 'admin'], default: 'user' },
    name: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String }, // optional
  },
  { timestamps: true }
)

export const User = mongoose.model('User', userSchema)
