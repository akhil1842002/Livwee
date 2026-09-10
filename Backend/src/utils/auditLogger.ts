import { AuditLog } from '../models/AuditLog';

export interface AuditParams {
  req?: any;
  user?: string;
  userRole?: string;
  action: string;
  entity: string;
  entityId?: string | string[];
  desc: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  ip?: string;
  payload?: any;
}

export async function logAudit(params: AuditParams) {
  try {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('en-US', { hour12: true });

    let username = params.user;
    let role = params.userRole;
    let ipAddr = params.ip;

    if (params.req) {
      if (!username && params.req.user) {
        username = params.req.user.name || params.req.user.email;
      }
      if (!role && params.req.user) {
        role = params.req.user.type || 'Admin';
      }
      if (!ipAddr) {
        ipAddr = params.req.ip || params.req.socket?.remoteAddress || '127.0.0.1';
      }
    }

    let payloadStr: string | undefined = undefined;
    if (params.payload !== undefined && params.payload !== null) {
      payloadStr = typeof params.payload === 'string' ? params.payload : JSON.stringify(params.payload, null, 2);
    }

    const entId = Array.isArray(params.entityId) ? params.entityId.join(',') : (params.entityId || '');

    await AuditLog.create({
      user: username || 'System',
      userRole: role || 'Super Admin',
      action: params.action,
      entity: params.entity,
      entityId: entId,
      desc: params.desc,
      severity: params.severity || 'INFO',
      date,
      time,
      ip: ipAddr || '127.0.0.1',
      payload: payloadStr,
    });
  } catch (err) {
    console.error('Failed to write AuditLog entry:', err);
  }
}


