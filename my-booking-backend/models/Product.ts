import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: mongoose.Types.ObjectId;
  salon: mongoose.Types.ObjectId;
}

const productSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  category: { type: Schema.Types.ObjectId, ref: 'ProductCategory', required: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
}, { timestamps: true });

export const Product = mongoose.model<IProduct>('Product', productSchema);