import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
  product_id: mongoose.Types.ObjectId;
  variant_id?: mongoose.Types.ObjectId;
  qty: number;
}

export interface ICart extends Document {
  user_id?: mongoose.Types.ObjectId; // Nullable for guest carts if supported
  session_id?: string; // For guest carts
  items: ICartItem[];
}

const cartItemSchema = new Schema<ICartItem>({
  product_id: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variant_id: { type: Schema.Types.ObjectId },
  qty: { type: Number, required: true, min: 1, default: 1 }
});

const cartSchema = new Schema<ICart>({
  user_id: { type: Schema.Types.ObjectId, ref: 'User' },
  session_id: String,
  items: [cartItemSchema]
}, { timestamps: true });

export const Cart = mongoose.model<ICart>('Cart', cartSchema);
