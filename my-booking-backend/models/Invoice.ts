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
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: false },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  staff: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    description: String,
    price: Number,
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true, enum: ['cash', 'card'] },
  status: { type: String, required: true, enum: ['paid', 'unpaid', 'cancelled'], default: 'paid' },
}, { timestamps: true });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);