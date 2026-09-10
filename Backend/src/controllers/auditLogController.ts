import { Request, Response } from 'express';
import { AuditLog } from '../models';
import { logAudit } from '../utils/auditLogger';

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 });

    const formatted = logs.map(l => ({
      id: l._id.toString(),
      _id: l._id,
      user: l.user || 'System',
      userRole: l.userRole || 'Admin',
      action: l.action || 'GENERAL_ACTION',
      entity: l.entity || 'System',
      entityId: l.entityId || '',
      desc: l.desc || 'No description provided',
      severity: l.severity || 'INFO',
      date: l.date || new Date((l as any).createdAt || Date.now()).toLocaleDateString(),
      time: l.time || new Date((l as any).createdAt || Date.now()).toLocaleTimeString(),
      ip: l.ip || '127.0.0.1',
      payload: l.payload
    }));

    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching audit logs' });
  }
};

export const deleteAuditLog = async (req: Request, res: Response) => {
  try {
    const logId = req.params.id;
    const target = await AuditLog.findById(logId);
    if (target) {
      await AuditLog.findByIdAndDelete(logId);
      await logAudit({
        req,
        action: 'AUDIT_LOG_DELETED',
        entity: 'AuditLog',
        entityId: logId,
        desc: `Super Admin purged audit log entry #${logId} (${target.action})`,
        severity: 'WARNING',
        payload: { deletedAction: target.action, deletedUser: target.user }
      });
    }
    res.json({ success: true, message: 'Audit log deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting audit log' });
  }
};

export const purgeAuditLogs = async (req: Request, res: Response) => {
  try {
    const count = await AuditLog.countDocuments();
    await AuditLog.deleteMany({});
    await logAudit({
      req,
      action: 'AUDIT_LOGS_PURGED',
      entity: 'AuditLog',
      entityId: 'ALL',
      desc: `Super Admin purged all ${count} audit log records from system`,
      severity: 'CRITICAL',
      payload: { purgedCount: count }
    });
    res.json({ success: true, message: 'All audit logs purged successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error purging audit logs' });
  }
};

