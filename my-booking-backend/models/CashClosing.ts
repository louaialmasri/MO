import mongoose, { Schema, Document } from 'mongoose';

export interface ICashClosing extends Document {
  salon: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  closingDate: Date;
  startPeriod: Date;
  endPeriod: Date;
  cashSales: number;
  cashDeposit: number;
  bankWithdrawal: number;
  tipsWithdrawal: number;
  otherWithdrawal: number;
  calculatedCashOnHand: number;
  actualCashOnHand: number;
  difference: number;
  notes?: string;
  withdrawals: { reason: string; amount: number }[];
  finalExpectedAmount: number;
}

const cashClosingSchema = new Schema({
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  employee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  closingDate: { type: Date, default: Date.now },
  startPeriod: { type: Date, required: true },
  endPeriod: { type: Date, required: true },
  cashSales: { type: Number, required: true, default: 0 },
  cashDeposit: { type: Number, required: true, default: 0 },
  bankWithdrawal: { type: Number, required: true, default: 0 },
  tipsWithdrawal: { type: Number, required: true, default: 0 },
  otherWithdrawal: { type: Number, required: true, default: 0 },
  expectedAmount: { type: Number, required: true },
  countedAmount: { type: Number, required: true },
  difference: { type: Number, required: true },
  
  withdrawals: [{
    reason: { type: String, required: true },
    amount: { type: Number, required: true }
  }],
  
  finalExpectedAmount: { type: Number, required: true },
  notes: { type: String },
}, { timestamps: true });

export const CashClosing = mongoose.model<ICashClosing>('CashClosing', cashClosingSchema);