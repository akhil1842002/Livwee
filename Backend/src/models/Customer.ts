import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  user_id?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  type?: 'INDIVIDUAL' | 'DOCTOR' | 'HOSPITAL' | 'CLINIC';
  outstanding_balance?: number;
  credit_limit?: number;
  addresses?: {
    address_line: string;
    city: string;
    state: string;
    zip: string;
  }[];
}

const customerSchema = new Schema<ICustomer>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  phone: { type: String },
  email: String,
  type: { type: String, enum: ['INDIVIDUAL', 'DOCTOR', 'HOSPITAL', 'CLINIC'], default: 'INDIVIDUAL' },
  outstanding_balance: { type: Number, default: 0 },
  credit_limit: { type: Number, default: 50000 },
  addresses: [{
    address_line: String,
    city: String,
    state: String,
    zip: String
  }]
}, { timestamps: true });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
