import { model, Schema } from "mongoose"

const salonSchema = new Schema({
  name: { type: String, required: true },
  address: String,
  phone: String,
  email: String,
})
export const Salon = model('Salon', salonSchema)