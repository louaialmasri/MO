import mongoose, { Schema } from 'mongoose'

const userSchema = new Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true }, // robustere E-Mail
  password: { type: String, select: false }, // wird standardmäßig nicht mitgesendet
  role: { type: String, enum: ['user','staff','admin'], required: true },
  skills: [{ type: Schema.Types.ObjectId, ref: 'Service', default: [] }], // default: []
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', default: null },
}, { timestamps: true }) // createdAt/updatedAt

// sinnvolle Indizes
userSchema.index({ role: 1, salon: 1 })

// schöneres JSON (passwort nie rausgeben)
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password
    delete ret.__v
    return ret
  }
})

export const User = mongoose.model('User', userSchema)
