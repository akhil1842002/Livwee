import mongoose, { Document, Schema } from 'mongoose';

export enum ReturnDisposition {
  RESTOCK_INVENTORY = 'RESTOCK_INVENTORY',
  DAMAGED_QUARANTINE = 'DAMAGED_QUARANTINE',
  EXPIRED_DESTROY = 'EXPIRED_DESTROY'
}

export enum ReturnStatus {
  APPROVED = 'APPROVED',
  INSPECTING = 'INSPECTING',
  REFUNDED = 'REFUNDED'
}

export interface IReturn extends Document {
  return_number: string;
  order_number?: string;
  customer_name: string;
  customer_phone?: string;
  returned_item_name: string;
  batch_no?: string;
  qty_returned: number;
  reason: string;
  disposition: ReturnDisposition;
  refund_amount: number;
  refund_method: string;
  status: ReturnStatus;
  date: string;
}

const returnSchema = new Schema<IReturn>({
  return_number: { type: String, required: true, unique: true },
  order_number: { type: String },
  customer_name: { type: String, required: true },
  customer_phone: { type: String },
  returned_item_name: { type: String, required: true },
  batch_no: { type: String },
  qty_returned: { type: Number, required: true, default: 1 },
  reason: { type: String, required: true },
  disposition: { type: String, enum: Object.values(ReturnDisposition), default: ReturnDisposition.RESTOCK_INVENTORY },
  refund_amount: { type: Number, required: true },
  refund_method: { type: String, default: 'UPI' },
  status: { type: String, enum: Object.values(ReturnStatus), default: ReturnStatus.REFUNDED },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true });

export const Return = mongoose.model<IReturn>('Return', returnSchema);
