import { Router } from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/roleController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getRoles)
  .post(protect, createRole);

router.route('/:id')
  .put(protect, updateRole)
  .delete(protect, deleteRole);

export default router;
