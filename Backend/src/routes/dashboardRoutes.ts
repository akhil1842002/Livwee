import express from 'express';
import { getDashboardMetrics, getLiveNotifications } from '../controllers/dashboardController';
import { protect, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/metrics', requirePermission('reports.view'), getDashboardMetrics);
router.get('/notifications', getLiveNotifications);

export default router;
