import { Router } from 'express';
import { getCustomers, createCustomer, updateCustomer, payCustomerCredit } from '../controllers/customerController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/:id')
  .put(protect, updateCustomer);

router.post('/:id/pay-credit', protect, payCustomerCredit);

export default router;
