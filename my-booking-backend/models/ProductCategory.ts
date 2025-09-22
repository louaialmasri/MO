import mongoose, { Schema, Document } from 'mongoose';

export interface IProductCategory extends Document {
  name: string;
  salon: mongoose.Types.ObjectId;
}

const productCategorySchema = new Schema({
  name: { type: String, required: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
}, { timestamps: true });

productCategorySchema.index({ name: 1, salon: 1 }, { unique: true });

export const ProductCategory = mongoose.model<IProductCategory>('ProductCategory', productCategorySchema);