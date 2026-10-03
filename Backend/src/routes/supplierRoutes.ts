import { Router } from 'express';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getSuppliers)
  .post(protect, createSupplier);

router.route('/:id')
  .put(protect, updateSupplier)
  .delete(protect, deleteSupplier);

export default router;
