import { Router } from 'express';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../controllers/warehouseController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getWarehouses)
  .post(protect, createWarehouse);

router.route('/:id')
  .put(protect, updateWarehouse)
  .delete(protect, deleteWarehouse);

export default router;
