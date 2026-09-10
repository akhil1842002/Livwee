import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentReceipt extends Document {
  receipt_number: string;
  invoice_number: string;
  customer_name: string;
  amount_collected: number;
  payment_method: string;
  timestamp: string;
  notes?: string;
}

const paymentReceiptSchema = new Schema<IPaymentReceipt>({
  receipt_number: { type: String, required: true, unique: true },
  invoice_number: { type: String, required: true },
  customer_name: { type: String, required: true },
  amount_collected: { type: Number, required: true },
  payment_method: { type: String, required: true, default: 'Cash' },
  timestamp: { type: String, default: () => new Date().toLocaleString() },
  notes: String
}, { timestamps: true });

export const PaymentReceipt = mongoose.model<IPaymentReceipt>('PaymentReceipt', paymentReceiptSchema);
