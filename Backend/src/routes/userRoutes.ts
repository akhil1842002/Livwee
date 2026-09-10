import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getUsers)
  .post(protect, createUser);

router.route('/:id')
  .put(protect, updateUser)
  .delete(protect, deleteUser);

router.put('/:id/reset-password', protect, resetUserPassword);

export default router;
