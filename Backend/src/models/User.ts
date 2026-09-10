import mongoose, { Document, Schema } from 'mongoose';
import './Role';

export enum UserType {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}

export interface IUser extends Document {
  name: string;
  email: string;
  password_hash: string;
  status: 'ACTIVE' | 'INACTIVE';
  type: UserType;
  roles: mongoose.Types.ObjectId[];
  accent_color?: string;
  avatar_url?: string;
  reset_password_token_hash?: string;
  reset_password_expires?: Date;
  deleted_at?: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true, default: 'Admin User' },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  type: { type: String, enum: Object.values(UserType), required: true, default: UserType.STAFF },
  roles: [{ type: Schema.Types.ObjectId, ref: 'Role' }],
  accent_color: { type: String, default: '#7C3AED' },
  avatar_url: { type: String, default: '' },
  reset_password_token_hash: { type: String },
  reset_password_expires: { type: Date },
  deleted_at: { type: Date }
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);

