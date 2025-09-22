import mongoose, { Schema, Document } from 'mongoose';

export interface IVoucher extends Document {
  code: string;
  initialValue: number;
  currentValue: number;
  isActive: boolean;
  salon: mongoose.Types.ObjectId;
  expiresAt?: Date;
}

const voucherSchema = new Schema({
  code: { type: String, required: true, unique: true },
  initialValue: { type: Number, required: true },
  currentValue: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  expiresAt: { type: Date },
}, { timestamps: true });

export const Voucher = mongoose.model<IVoucher>('Voucher', voucherSchema);