import mongoose, { Document, Schema } from 'mongoose';

export interface ITax extends Document {
  name: string;
  percentage: number;
  status: 'ACTIVE' | 'INACTIVE';
  description?: string;
}

const taxSchema = new Schema<ITax>({
  name: { type: String, required: true },
  percentage: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  description: String
}, { timestamps: true });

export const Tax = mongoose.model<ITax>('Tax', taxSchema);
