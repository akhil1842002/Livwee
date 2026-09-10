import express from 'express';
import { posCheckout } from '../controllers/posController';
import { protect, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.post('/checkout', requirePermission('pos.create_sale'), posCheckout);

export default router;
