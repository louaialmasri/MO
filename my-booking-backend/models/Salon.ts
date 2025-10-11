import { model, Schema } from "mongoose"

const openingHoursSchema = new Schema({
  weekday: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sonntag, 6 = Samstag
  isOpen: { type: Boolean, default: true },
  open: { type: String, default: '09:00' }, // Format "HH:mm"
  close: { type: String, default: '18:00' } // Format "HH:mm"
}, { _id: false });

const salonSchema = new Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  email: String,
  openingHours: { 
    type: [openingHoursSchema], 
    default: () => Array.from({length: 7}, (_, i) => ({ 
      weekday: i,
      isOpen: i > 0, // Sonntag standardmäßig geschlossen
      open: '09:00',
      close: '18:00'
    })) 
  },
  datevSettings: {
    revenueAccountServices: { type: String, default: '8400' }, // Erlöse 19%
    revenueAccountProducts: { type: String, default: '8400' }, // Erlöse 19%
    cashAccount: { type: String, default: '1000' }, // Kasse
    cardAccount: { type: String, default: '1360' }, // Geldtransit
    consultantNumber: { type: String },
    clientNumber: { type: String },
  }
})

export const Salon = model('Salon', salonSchema)