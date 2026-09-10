import mongoose, { Document, Schema } from 'mongoose';

export interface ISupplier extends Document {
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  gstin?: string;
  outstanding_balance: number;
  status: 'ACTIVE' | 'INACTIVE';
}

const supplierSchema = new Schema<ISupplier>({
  supplier_code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  contact_person: String,
  phone: { type: String, required: true },
  email: String,
  gstin: String,
  outstanding_balance: { type: Number, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' }
}, { timestamps: true });

export const Supplier = mongoose.model<ISupplier>('Supplier', supplierSchema);
