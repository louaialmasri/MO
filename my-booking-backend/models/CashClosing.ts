import mongoose, { Schema, Document } from 'mongoose';

export interface ICashClosing extends Document {
  salon: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  closingDate: Date;
  startPeriod: Date;
  endPeriod: Date;
  revenueServices: number;
  revenueProducts: number;
  soldVouchers: number;
  redeemedVouchers: number;
  cashDeposit: number;
  bankWithdrawal: number;
  tipsWithdrawal: number;
  otherWithdrawal: number;
  calculatedCashOnHand: number;
  actualCashOnHand: number;
  difference: number;
  notes?: string;
  status: 'completed' | 'cancelled';
}

const cashClosingSchema = new Schema({
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  closingDate: { type: Date, default: Date.now },
  startPeriod: { type: Date, required: true },
  endPeriod: { type: Date, required: true },
  revenueServices: { type: Number, required: true, default: 0 },
  revenueProducts: { type: Number, required: true, default: 0 },
  soldVouchers: { type: Number, required: true, default: 0 },
  redeemedVouchers: { type: Number, required: true, default: 0 },
  cashDeposit: { type: Number, required: true, default: 0 },
  bankWithdrawal: { type: Number, required: true, default: 0 },
  tipsWithdrawal: { type: Number, required: true, default: 0 },
  otherWithdrawal: { type: Number, required: true, default: 0 },
  calculatedCashOnHand: { type: Number, required: true },
  actualCashOnHand: { type: Number, required: true },
  difference: { type: Number, required: true },
  notes: { type: String },
  status: { type: String, enum: ['completed', 'cancelled'], default: 'completed' },
}, { timestamps: true });

export const CashClosing = mongoose.model<ICashClosing>('CashClosing', cashClosingSchema);