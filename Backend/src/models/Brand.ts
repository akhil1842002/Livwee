import mongoose, { Document, Schema } from 'mongoose';

export interface IBrand extends Document {
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const brandSchema = new Schema<IBrand>({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });

export const Brand = mongoose.model<IBrand>('Brand', brandSchema);
