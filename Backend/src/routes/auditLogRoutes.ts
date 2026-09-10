import { Router } from 'express';
import { getAuditLogs, deleteAuditLog, purgeAuditLogs } from '../controllers/auditLogController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getAuditLogs);

router.delete('/purge', protect, purgeAuditLogs);

router.route('/:id')
  .delete(protect, deleteAuditLog);

export default router;
