import mongoose, { Document, Schema } from 'mongoose';

export interface IWarehouse extends Document {
  name: string;
  code: string;
  location: string;
  is_default: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

const warehouseSchema = new Schema<IWarehouse>({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true },
  location: { type: String, required: true },
  is_default: { type: Boolean, default: false },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });

export const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);
