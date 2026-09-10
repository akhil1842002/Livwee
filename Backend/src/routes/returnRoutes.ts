import { Router } from 'express';
import { getReturns, createReturn } from '../controllers/returnController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getReturns)
  .post(protect, createReturn);

export default router;
