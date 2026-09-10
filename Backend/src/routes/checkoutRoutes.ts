import express from 'express';
import { createRazorpayOrder, verifyPayment } from '../controllers/checkoutController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect);

router.post('/create-order', createRazorpayOrder);
router.post('/verify', verifyPayment);

export default router;
