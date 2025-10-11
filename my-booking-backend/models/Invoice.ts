import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoice extends Document {
  invoiceNumber: string;
  booking?: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  staff: mongoose.Types.ObjectId;
  salon: mongoose.Types.ObjectId;
  date: Date;
  items: {
    description: string;
    price: number;
  }[];
  redeemedVoucher?: string;
  redeemedAmount?: number;
  amount: number;
  paymentMethod: 'cash' | 'card';
  status: 'paid' | 'unpaid' | 'cancelled';
  amountGiven?: number;
  change?: number;
  discount?: {
    type: 'percentage' | 'fixed';
    value: number;
  };
}

const invoiceSchema = new Schema({
  invoiceNumber: { type: String, required: true, unique: true, index: true },
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: false },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true },
  staff: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  items: [{
    description: String,
    price: Number,
  }],
  discount: {
    type: { type: String, enum: ['percentage', 'fixed'] },
    value: { type: Number }
  },
  redeemedVoucher: { type: String },
  redeemedAmount: { type: Number, default: 0 },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, required: true, enum: ['cash', 'card'] },
  status: { type: String, required: true, enum: ['paid', 'unpaid', 'cancelled'], default: 'paid' },
  amountGiven: { type: Number },
  change: { type: Number },
}, { timestamps: true });

export const Invoice = mongoose.model<IInvoice>('Invoice', invoiceSchema);
