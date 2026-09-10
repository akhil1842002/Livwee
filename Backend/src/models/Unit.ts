import mongoose, { Document, Schema } from 'mongoose';

export interface IUnit extends Document {
  name: string;
  code: string;
  description?: string;
}

const unitSchema = new Schema<IUnit>({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  description: String
}, { timestamps: true });

export const Unit = mongoose.model<IUnit>('Unit', unitSchema);
