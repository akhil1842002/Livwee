import express from 'express';
import { getInventory, adjustStock, getTransactions } from '../controllers/inventoryController';
import { protect, requirePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', protect, requirePermission('inventory.view'), getInventory);
router.post('/adjust', protect, requirePermission('inventory.adjust'), adjustStock);

router.get('/transactions', protect, getTransactions);
router.post('/transactions', protect, adjustStock);

export default router;
