import mongoose, { Schema, Document } from 'mongoose';

export interface ISale extends Document {
  items: {
    itemType: 'service' | 'product' | 'voucher';
    itemId: mongoose.Types.ObjectId;
    name: string;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: 'cash' | 'card' | 'voucher';
  salon: mongoose.Types.ObjectId;
  staff: mongoose.Types.ObjectId;
  customer?: mongoose.Types.ObjectId;
}

const saleSchema = new Schema({
  items: [{
    itemType: { type: String, required: true, enum: ['service', 'product', 'voucher'] },
    itemId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true, enum: ['cash', 'card', 'voucher'] },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  staff: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export const Sale = mongoose.model<ISale>('Sale', saleSchema);