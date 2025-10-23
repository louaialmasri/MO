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

  // --- NEUES FELD ---
  // Ein Array von Strings, das spezielle Berechtigungen für Staff-Benutzer speichert.
  // Admins brauchen dies nicht, sie haben implizit alle Rechte.
  // Benutzer (user) haben keine Sonderrechte.
  permissions: { type: [String], default: [] }

}, { timestamps: true })

userSchema.index({ role: 1, salon: 1 })
// Hinzufügen eines Index für das neue Permissions-Feld kann sinnvoll sein, wenn oft danach gesucht wird
userSchema.index({ permissions: 1 });

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password
    // Sicherstellen, dass auch permissions nicht standardmäßig an den Client gesendet wird,
    // es sei denn, es wird explizit abgefragt (select('+permissions')).
    // Das 'toJSON'-Transform ist dafür nicht der beste Ort, besser bei der Abfrage steuern.
    // Aber wir stellen sicher, dass __v entfernt wird.
    delete ret.__v
    // dashboardPin wird bereits durch select: false ausgeblendet
    return ret
  }
})

export const User = mongoose.model('User', userSchema)
