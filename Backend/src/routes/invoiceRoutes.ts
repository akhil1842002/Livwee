import { Router } from 'express';
import { downloadInvoice, getInvoices, receiveInvoicePayment, getInvoiceReceipts, getAllReceipts } from '../controllers/invoiceController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.route('/')
  .get(protect, getInvoices);

router.route('/receipts/all')
  .get(protect, getAllReceipts);

router.route('/:orderId/download')
  .get(protect, downloadInvoice);

router.route('/:invoiceNumber/payment')
  .post(protect, receiveInvoicePayment);

router.route('/:invoiceNumber/receipts')
  .get(protect, getInvoiceReceipts);

export default router;
