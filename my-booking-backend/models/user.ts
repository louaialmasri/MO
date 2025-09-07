import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema({
  // Hinzugefügte Felder
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },

  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['user','staff','admin'], required: true },
  skills: [{ type: Schema.Types.ObjectId, ref: 'Service', default: [] }], // Das ist schon perfekt!
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