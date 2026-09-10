import { Router } from 'express';
import { getPurchaseOrders, createPurchaseOrder, updatePurchaseOrder, receivePurchaseOrder, payPurchaseOrder } from '../controllers/purchaseOrderController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getPurchaseOrders)
  .post(protect, createPurchaseOrder);

router.route('/:id')
  .put(protect, updatePurchaseOrder);

router.route('/:id/receive')
  .put(protect, receivePurchaseOrder);

router.route('/:id/pay')
  .put(protect, payPurchaseOrder);

export default router;
