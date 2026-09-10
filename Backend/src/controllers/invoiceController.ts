import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { Order } from '../models/Order';
import { PaymentReceipt } from '../models/PaymentReceipt';
import { Customer } from '../models/Customer';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get all billing invoices
// @route   GET /api/invoices
// @access  Private/Admin
export const getInvoices = async (req: Request, res: Response) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('items.product_id');
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching invoices' });
  }
};

// @desc    Receive Payment on Invoice & Issue Receipt Voucher
// @route   POST /api/invoices/:invoiceNumber/payment
// @access  Private/Admin
export const receiveInvoicePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { amount_collected, payment_method = 'Cash', notes } = req.body;
    const invoiceNumber = String(req.params.invoiceNumber);

    if (!amount_collected || amount_collected <= 0) {
      return res.status(400).json({ message: 'Valid amount_collected is required' });
    }

    const order = await Order.findOne({ order_number: invoiceNumber });
    if (!order) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const newPaidAmount = (order.paid_amount || 0) + amount_collected;
    const dueAmount = Math.max(0, order.total_amount - newPaidAmount);
    const newPaymentStatus = newPaidAmount >= order.total_amount - 0.01 ? 'PAID' : 'PARTIAL';

    order.paid_amount = newPaidAmount;
    order.due_amount = dueAmount;
    order.payment_status = newPaymentStatus;
    await order.save();

    // Deduct customer's outstanding balance
    if (order.customer_id) {
      const cust = await Customer.findById(order.customer_id);
      if (cust) {
        cust.outstanding_balance = Math.max(0, (cust.outstanding_balance || 0) - amount_collected);
        await cust.save();
      }
    } else if (order.customer_name && order.customer_name !== 'Walk-in Customer') {
      const cust = await Customer.findOne({ name: order.customer_name });
      if (cust) {
        cust.outstanding_balance = Math.max(0, (cust.outstanding_balance || 0) - amount_collected);
        await cust.save();
      }
    }

    const receiptCount = await PaymentReceipt.countDocuments();
    const receipt_number = `REC-2026-${String(receiptCount + 1).padStart(3, '0')}`;

    const receipt = await PaymentReceipt.create({
      receipt_number,
      invoice_number: invoiceNumber,
      customer_name: order.customer_name || 'Customer',
      amount_collected,
      payment_method,
      notes: notes || `Credit payment received for invoice ${invoiceNumber}`
    });

    res.status(200).json({
      success: true,
      message: `Payment of ₹${amount_collected.toFixed(2)} received successfully!`,
      data: { order, receipt }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error processing payment' });
  }
};

// @desc    Get payment receipt vouchers for invoice
// @route   GET /api/invoices/:invoiceNumber/receipts
// @access  Private/Admin
export const getInvoiceReceipts = async (req: Request, res: Response) => {
  try {
    const invoiceNumber = String(req.params.invoiceNumber);
    const receipts = await PaymentReceipt.find({ invoice_number: invoiceNumber }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: receipts });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching receipts' });
  }
};

// @desc    Get all payment receipt vouchers
// @route   GET /api/invoices/receipts/all
// @access  Private/Admin
export const getAllReceipts = async (req: Request, res: Response) => {
  try {
    const receipts = await PaymentReceipt.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: receipts.length, data: receipts });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching payment receipts' });
  }
};

// @desc    Download Order Invoice (PDF)
// @route   GET /api/invoices/:orderId/download
// @access  Private
export const downloadInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('items.product_id');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions
    if (req.user?.type !== 'ADMIN' && order.customer_id?.toString() !== req.user?._id.toString()) {
      return res.status(401).json({ message: 'Not authorized to view this invoice' });
    }

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Stream the PDF to the response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice_${order.order_number}.pdf`);
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('LIVWEE INVOICE', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Order Number: ${order.order_number}`);
    doc.text(`Date: ${new Date((order as any).createdAt || Date.now()).toLocaleString()}`);
    doc.text(`Source: ${order.source}`);
    doc.text(`Payment Method: ${order.payment_method || 'N/A'}`);
    doc.text(`Payment Status: ${order.payment_status}`);
    doc.moveDown();

    // Table Header
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, doc.y, { continued: true, width: 250 });
    doc.text('Qty', 300, doc.y, { continued: true, width: 50 });
    doc.text('Price', 350, doc.y, { continued: true, width: 100 });
    doc.text('Total', 450, doc.y);
    doc.font('Helvetica');
    
    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(1.5);

    // Items
    for (const item of order.items) {
      const productName = (item.product_id as any)?.name || 'Product';
      doc.text(productName, 50, doc.y, { continued: true, width: 250 });
      doc.text(item.qty.toString(), 300, doc.y, { continued: true, width: 50 });
      doc.text(`INR ${item.unit_price}`, 350, doc.y, { continued: true, width: 100 });
      doc.text(`INR ${item.total}`, 450, doc.y);
      doc.moveDown(0.5);
    }

    doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    doc.moveDown(1.5);

    // Totals
    doc.font('Helvetica-Bold');
    doc.text(`Subtotal: INR ${order.subtotal}`, { align: 'right' });
    doc.text(`Tax: INR ${order.tax}`, { align: 'right' });
    doc.text(`Discount: INR ${order.discount}`, { align: 'right' });
    if (order.shipping_cost) {
      doc.text(`Delivery Fee: INR ${order.shipping_cost}`, { align: 'right' });
    }
    doc.text(`Total Amount: INR ${order.total_amount}`, { align: 'right' });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error generating PDF invoice' });
    }
  }
};
