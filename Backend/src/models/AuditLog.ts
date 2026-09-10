import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  user: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  desc: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  date: string;
  time: string;
  ip: string;
  payload?: string;
}

const auditLogSchema = new Schema<IAuditLog>({
  user: { type: String, required: true },
  userRole: { type: String, default: 'Admin' },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String, default: '' },
  desc: { type: String, required: true },
  severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'INFO' },
  date: { type: String, required: true },
  time: { type: String, required: true },
  ip: { type: String, default: '127.0.0.1' },
  payload: String
}, { timestamps: true });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
