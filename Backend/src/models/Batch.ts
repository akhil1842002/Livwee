import mongoose, { Document, Schema } from 'mongoose';

export interface IBatch extends Document {
  product_id?: mongoose.Types.ObjectId;
  product_name: string;
  sku?: string;
  batch_number: string;
  warehouse_id?: mongoose.Types.ObjectId;
  warehouse_name?: string;
  expiry_date: Date | string;
  purchase_price: number;
  selling_price: number;
  quantity: number;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}

const batchSchema = new Schema<IBatch>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product' },
  product_name: { type: String, required: true },
  sku: String,
  batch_number: { type: String, required: true },
  warehouse_id: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
  warehouse_name: String,
  expiry_date: { type: Date, required: true },
  purchase_price: { type: Number, required: true, default: 0 },
  selling_price: { type: Number, required: true, default: 0 },
  quantity: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'], default: 'ACTIVE' }
}, { timestamps: true });

export const Batch = mongoose.model<IBatch>('Batch', batchSchema);
