import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user','staff','admin'], required: true },
  address: { type: String },
  phone: { type: String, required: true },
  // NEU: Feld für den gehashten Dashboard-PIN
  dashboardPin: { type: String, select: false },
  // Skills sind primär für Staff relevant
  skills: [{ type: Schema.Types.ObjectId, ref: 'Service', default: [] }],
  // Salon-Zuweisung nur für Staff und Admin relevant
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', default: null },
}, { timestamps: true })

userSchema.index({ role: 1, salon: 1 })

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password
    delete ret.__v
    return ret
  }
})

export const User = mongoose.model('User', userSchema)