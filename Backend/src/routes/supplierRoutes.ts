import { Router } from 'express';
import { getSuppliers, createSupplier, updateSupplier } from '../controllers/supplierController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/:id')
  .put(protect, updateSupplier);

export default router;
