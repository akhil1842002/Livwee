import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({ customer_id: req.user?._id }).sort({ createdAt: -1 });
  res.json(orders);
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req: AuthRequest, res: Response) => {
  const order = await Order.findById(req.params.id).populate('items.product_id');

  if (order) {
    // Check if user is admin or the order belongs to the user
    if (req.user?.type === 'ADMIN' || order.customer_id?.toString() === req.user?._id.toString()) {
      res.json(order);
    } else {
      res.status(401).json({ message: 'Not authorized to view this order' });
    }
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
export const getOrders = async (req: AuthRequest, res: Response) => {
  const orders = await Order.find({}).populate('customer_id', 'name email').sort({ createdAt: -1 });
  res.json(orders);
};
