import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  product_id: mongoose.Types.ObjectId;
  variant_id?: mongoose.Types.ObjectId; // null if product has no variants
  current_stock: number;
  reserved_stock: number;
  low_stock_threshold: number;
}

const inventorySchema = new Schema<IInventory>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_id: { type: Schema.Types.ObjectId },
  current_stock: { type: Number, required: true, default: 0 },
  reserved_stock: { type: Number, required: true, default: 0 },
  low_stock_threshold: { type: Number, default: 5 }
}, { timestamps: true });

export const Inventory = mongoose.model<IInventory>('Inventory', inventorySchema);

export enum MovementType {
  SALE = 'SALE',
  RESTOCK = 'RESTOCK',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  RESERVATION = 'RESERVATION',
  RELEASE = 'RELEASE'
}

export interface IInventoryMovement extends Document {
  inventory_id: mongoose.Types.ObjectId;
  type: MovementType;
  qty: number;
  previous_stock: number;
  new_stock: number;
  previous_reserved?: number;
  new_reserved?: number;
  reference_id?: string; // e.g., Order ID or Invoice ID
  created_by?: mongoose.Types.ObjectId; // Admin User ID
}

const inventoryMovementSchema = new Schema<IInventoryMovement>({
  inventory_id: { type: Schema.Types.ObjectId, ref: 'Inventory', required: true },
  type: { type: String, enum: Object.values(MovementType), required: true },
  qty: { type: Number, required: true },
  previous_stock: { type: Number, required: true },
  new_stock: { type: Number, required: true },
  previous_reserved: { type: Number, default: 0 },
  new_reserved: { type: Number, default: 0 },
  reference_id: String,
  created_by: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export const InventoryMovement = mongoose.model<IInventoryMovement>('InventoryMovement', inventoryMovementSchema);
