import express from 'express';
import { getDashboardMetrics } from '../controllers/dashboardController';
import { protect, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/metrics', requirePermission('reports.view'), getDashboardMetrics);

export default router;
