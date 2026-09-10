import express from 'express';
import { getMyOrders, getOrderById, getOrders } from '../controllers/orderController';
import { protect, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/myorders', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.get('/', protect, requirePermission('orders.view'), getOrders);

export default router;
