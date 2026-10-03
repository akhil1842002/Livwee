import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomer extends Document {
  user_id?: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  type?: 'INDIVIDUAL' | 'DOCTOR' | 'HOSPITAL' | 'CLINIC' | 'DISTRIBUTOR';
  gstin?: string;
  drug_license_no?: string;
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
  user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  phone: { type: String },
  email: String,
  type: { type: String, enum: ['INDIVIDUAL', 'DOCTOR', 'HOSPITAL', 'CLINIC', 'DISTRIBUTOR'], default: 'INDIVIDUAL' },
  gstin: String,
  drug_license_no: String,
  outstanding_balance: { type: Number, default: 0 },
  credit_limit: { type: Number, default: 50000 },
  addresses: [{
    address_line: String,
    city: String,
    state: String,
    zip: String
  }]
}, { timestamps: true });

// Sparse unique index on user_id — allows multiple documents with null user_id
// (admin-created customers have no linked user account)
customerSchema.index({ user_id: 1 }, { unique: true, sparse: true });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);

// One-time migration: drop the old non-sparse unique index on user_id if it exists.
// That index was created without 'sparse: true' which blocks saving multiple null user_ids.
Customer.collection.getIndexes().then((indexes: Record<string, any>) => {
  const entry = Object.entries(indexes).find(([name]) => name === 'user_id_1');
  if (entry) {
    const [, idx] = entry;
    if (!idx.sparse) {
      Customer.collection.dropIndex('user_id_1')
        .then(() => console.log('[Migration] Dropped old non-sparse user_id_1 index on customers collection'))
        .catch((e: any) => console.warn('[Migration] Could not drop user_id_1 index:', e.message));
    }
  }
}).catch(() => {});
