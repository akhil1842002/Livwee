import mongoose, { Document, Schema } from 'mongoose';

export enum POStatus {
  DRAFT = 'DRAFT',
  QUOTATION = 'QUOTATION',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export interface IPOItem {
  product_name: string;
  qty_ordered: number;
  qty_received: number;
  qty_stocked?: number;
  unit_price: number;
  total: number;
}

export interface IPOAuditLog {
  id?: string;
  timestamp: string;
  updatedBy: string;
  userRole?: string;
  action: string;
  previousStatus?: string;
  newStatus?: string;
  previousAmountPaid?: number;
  newAmountPaid?: number;
  remarks?: string;
}

export interface IPurchaseOrder extends Document {
  po_number: string;
  supplier_name: string;
  supplier_id?: mongoose.Types.ObjectId;
  warehouse_name?: string;
  order_date: string;
  expected_delivery?: string;
  payment_terms?: string;
  items: IPOItem[];
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  payment_status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'FULLY_PAID' | 'PARTIALLY_PAID';
  status: POStatus;
  notes?: string;
  audit_logs?: IPOAuditLog[];
}

const poItemSchema = new Schema<IPOItem>({
  product_name: { type: String, required: true },
  qty_ordered: { type: Number, required: true },
  qty_received: { type: Number, default: 0 },
  qty_stocked: { type: Number, default: 0 },
  unit_price: { type: Number, required: true },
  total: { type: Number, required: true }
});

const auditLogSchema = new Schema<IPOAuditLog>({
  id: String,
  timestamp: { type: String, required: true },
  updatedBy: { type: String, required: true },
  userRole: String,
  action: { type: String, required: true },
  previousStatus: String,
  newStatus: String,
  previousAmountPaid: Number,
  newAmountPaid: Number,
  remarks: String
});

const poSchema = new Schema<IPurchaseOrder>({
  po_number: { type: String, required: true, unique: true },
  supplier_name: { type: String, required: true },
  supplier_id: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  warehouse_name: { type: String, default: 'Main Warehouse' },
  order_date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  expected_delivery: String,
  payment_terms: { type: String, default: 'Net 30' },
  items: [poItemSchema],
  subtotal: { type: Number, required: true },
  shipping_cost: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  paid_amount: { type: Number, default: 0 },
  payment_status: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID', 'FULLY_PAID', 'PARTIALLY_PAID'], default: 'UNPAID' },
  status: { type: String, enum: Object.values(POStatus), default: POStatus.ORDERED },
  notes: String,
  audit_logs: [auditLogSchema]
}, { timestamps: true });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', poSchema);
