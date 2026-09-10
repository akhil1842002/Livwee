import mongoose, { Document, Schema } from 'mongoose';

export enum OrderSource {
  ONLINE = 'ONLINE',
  POS = 'POS'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  PAYMENT_SUCCESSFUL = 'PAYMENT_SUCCESSFUL',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED'
}

export interface IOrderItem {
  product_id: mongoose.Types.ObjectId;
  variant_id?: mongoose.Types.ObjectId;
  qty: number;
  unit_price: number;
  total: number;
}

export interface IOrder extends Document {
  order_number: string;
  customer_id?: mongoose.Types.ObjectId; // Optional for guest POS walk-ins
  customer_name?: string;
  source: OrderSource;
  status: OrderStatus;
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  shipping_cost?: number;
  total_amount: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'PENDING' | 'FAILED' | 'REFUNDED';
  payment_method?: string;
  transaction_id?: string;
  created_by_admin?: mongoose.Types.ObjectId; // For POS orders
  shipping_address?: {
    address_line: string;
    city: string;
    state: string;
    zip: string;
  };
}

const orderItemSchema = new Schema<IOrderItem>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_id: { type: Schema.Types.ObjectId },
  qty: { type: Number, required: true, min: 1 },
  unit_price: { type: Number, required: true },
  total: { type: Number, required: true }
});

const orderSchema = new Schema<IOrder>({
  order_number: { type: String, required: true, unique: true },
  customer_id: { type: Schema.Types.ObjectId, ref: 'Customer' },
  customer_name: { type: String, default: 'Walk-in Customer' },
  source: { type: String, enum: Object.values(OrderSource), required: true },
  status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  shipping_cost: { type: Number, default: 0 },
  total_amount: { type: Number, required: true },
  paid_amount: { type: Number, default: 0 },
  due_amount: { type: Number, default: 0 },
  payment_status: { type: String, enum: ['PAID', 'PARTIAL', 'UNPAID', 'PENDING', 'FAILED', 'REFUNDED'], default: 'PAID' },
  payment_method: String,
  transaction_id: String,
  created_by_admin: { type: Schema.Types.ObjectId, ref: 'User' },
  shipping_address: {
    address_line: String,
    city: String,
    state: String,
    zip: String
  }
}, { timestamps: true });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
