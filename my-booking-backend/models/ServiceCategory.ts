import mongoose, { Schema, Document } from 'mongoose';

export interface IServiceCategory extends Document {
  name: string;
  salon: mongoose.Types.ObjectId;
}

const serviceCategorySchema = new Schema({
  name: { type: String, required: true },
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
}, { timestamps: true });

serviceCategorySchema.index({ name: 1, salon: 1 }, { unique: true });

export const ServiceCategory = mongoose.model<IServiceCategory>('ServiceCategory', serviceCategorySchema);