import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  invoiceNumber: string;
  booking: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  service: mongoose.Types.ObjectId;
  staff: mongoose.Types.ObjectId;
  salon: mongoose.Types.ObjectId;
  date: Date;
  amount: number;
  amountGiven?: number; // NEU
  change?: number;      // NEU
  paymentMethod: 'cash' | 'card';
}

const invoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
  staff: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon' },
  date: { type: Date, default: Date.now },
  amount: { type: Number, required: true },
  amountGiven: { type: Number }, // NEU
  change: { type: Number },      // NEU
  paymentMethod: { type: String, enum: ['cash', 'card'], required: true },
}, { timestamps: true });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);