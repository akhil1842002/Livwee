import { Router } from 'express';
import { getStockTransactions, createStockTransaction } from '../controllers/stockTransactionController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getStockTransactions)
  .post(protect, createStockTransaction);

export default router;
