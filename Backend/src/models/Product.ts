import mongoose, { Document, Schema } from 'mongoose';

export interface IProductVariant {
  _id: mongoose.Types.ObjectId;
  size?: string;
  color?: string;
  sku: string;
  price_override?: number;
}

export interface IProduct extends Document {
  name: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  discount_price?: number;
  category?: string;
  brand?: string;
  unit?: string;
  tax_rate?: number;
  stock?: number;
  status?: string;
  tax_id?: mongoose.Types.ObjectId;
  unit_id?: mongoose.Types.ObjectId;
  category_id?: mongoose.Types.ObjectId;
  brand_id?: mongoose.Types.ObjectId;
  visibility: boolean;
  images: string[];
  variants: IProductVariant[];
}

const variantSchema = new Schema<IProductVariant>({
  size: String,
  color: String,
  sku: { type: String, required: true },
  price_override: Number
});

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  sku: { type: String, required: true, unique: true },
  barcode: String,
  price: { type: Number, required: true },
  cost_price: { type: Number, default: 0 },
  discount_price: Number,
  category: { type: String, default: '' },
  brand: { type: String, default: '' },
  unit: { type: String, default: '' },
  tax_rate: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  status: { type: String, default: 'ACTIVE' },
  tax_id: { type: Schema.Types.ObjectId, ref: 'Tax' },
  unit_id: { type: Schema.Types.ObjectId, ref: 'Unit' },
  category_id: { type: Schema.Types.ObjectId, ref: 'Category' },
  brand_id: { type: Schema.Types.ObjectId, ref: 'Brand' },
  visibility: { type: Boolean, default: true },
  images: [String],
  variants: [variantSchema]
}, { timestamps: true });

export const Product = mongoose.model<IProduct>('Product', productSchema);
