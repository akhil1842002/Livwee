import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Customer } from '../models/Customer';
import { Order } from '../models/Order';

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private/Admin
export const getCustomers = async (req: Request, res: Response) => {
  try {
    const customers = await Customer.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching customers' });
  }
};

// @desc    Create customer profile
// @route   POST /api/customers
// @access  Private/Admin
export const createCustomer = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, type = 'INDIVIDUAL', street_address, city, state, zip } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Customer name and phone are required' });
    }

    const address = street_address ? {
      street_address,
      city: city || 'Mumbai',
      state: state || 'Maharashtra',
      zip: zip || '400001'
    } : undefined;

    const customer = await Customer.create({
      name,
      phone,
      email,
      type,
      addresses: address ? [address] : []
    });

    res.status(201).json({ success: true, data: customer });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error creating customer' });
  }
};

// @desc    Update customer profile
// @route   PUT /api/customers/:id
// @access  Private/Admin
export const updateCustomer = async (req: Request, res: Response) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(200).json({ success: true, data: customer });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error updating customer' });
  }
};

// @desc    Pay customer credit balance
// @route   POST /api/customers/:id/pay-credit
// @access  Private/Admin
export const payCustomerCredit = async (req: Request, res: Response) => {
  try {
    const { amount, payment_method = 'Cash', invoice_number, notes } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const payAmt = Number(amount) || 0;
    customer.outstanding_balance = Math.max(0, (customer.outstanding_balance || 0) - payAmt);
    await customer.save();

    if (invoice_number) {
      const order = await Order.findOne({ order_number: invoice_number });
      if (order) {
        const newPaid = (order.paid_amount || 0) + payAmt;
        const newDue = Math.max(0, order.total_amount - newPaid);
        order.paid_amount = newPaid;
        order.due_amount = newDue;
        order.payment_status = newDue <= 0.01 ? 'PAID' : 'PARTIAL';
        await order.save();
      }
    }

    // Create Payment Receipt
    const receiptCount = await mongoose.model('PaymentReceipt').countDocuments();
    const receiptNumber = `REC-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(3, '0')}`;
    
    const receipt = await mongoose.model('PaymentReceipt').create({
      receipt_number: receiptNumber,
      invoice_number: invoice_number || `CUST-CREDIT-${customer._id.toString().slice(-4)}`,
      customer_name: customer.name,
      amount_collected: payAmt,
      payment_method,
      notes: notes || `Credit payment for ${customer.name}`
    });

    res.status(200).json({ success: true, data: customer, receipt });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error processing customer credit payment' });
  }
};
