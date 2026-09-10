import { Router } from 'express';
import { getBatches, createBatch, updateBatch, deleteBatch } from '../controllers/batchController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getBatches)
  .post(protect, createBatch);

router.route('/:id')
  .put(protect, updateBatch)
  .delete(protect, deleteBatch);

export default router;
