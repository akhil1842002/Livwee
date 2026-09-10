import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order, OrderSource, OrderStatus } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { Batch } from '../models/Batch';
import { Inventory, InventoryMovement, MovementType } from '../models/Inventory';
import { AuthRequest } from '../middleware/authMiddleware';
import { runInTransaction } from '../utils/safeTransaction';

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_id';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret';

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

// @desc    Create Razorpay Order (Initiate Checkout)
// @route   POST /api/checkout/create-order
// @access  Private
export const createRazorpayOrder = async (req: AuthRequest, res: Response) => {
  const { shipping_address } = req.body;
  
  const cart = await Cart.findOne({ user_id: req.user?._id }).populate('items.product_id');
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty' });
  }

  // Calculate totals
  let subtotal = 0;
  const orderItems = [];

  for (const item of cart.items) {
    const product = item.product_id as any;
    const price = product.discount_price || product.price;
    const total = price * item.qty;
    subtotal += total;

    orderItems.push({
      product_id: product._id,
      variant_id: item.variant_id,
      qty: item.qty,
      unit_price: price,
      total
    });
  }

  const tax = subtotal * 0.18; // Example 18% tax
  const total_amount = subtotal + tax;

  // Create Razorpay order
  try {
    const options = {
      amount: Math.round(total_amount * 100), // amount in the smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Create pending order in database
    const order = await Order.create({
      order_number: razorpayOrder.id, // Use razorpay order id as our order number for mapping
      customer_id: req.user?._id, // Assume User id matches Customer id for this simple implementation or map it properly
      source: OrderSource.ONLINE,
      status: OrderStatus.PAYMENT_PENDING,
      items: orderItems,
      subtotal,
      tax,
      total_amount,
      shipping_address
    });

    res.json({
      order_id: razorpayOrder.id,
      currency: razorpayOrder.currency,
      amount: razorpayOrder.amount,
      db_order_id: order._id
    });
  } catch (error) {
    console.error('Razorpay Error:', error);
    res.status(500).json({ message: 'Error creating Razorpay order' });
  }
};

// @desc    Verify Razorpay Payment
// @route   POST /api/checkout/verify
// @access  Private
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET as string)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    // Payment is verified
    
    try {
      const order = await runInTransaction(async (session) => {
        const opts = session ? { session } : undefined;
        const foundOrder = session 
          ? await Order.findOne({ order_number: razorpay_order_id }).session(session)
          : await Order.findOne({ order_number: razorpay_order_id });

        if (!foundOrder) {
          throw new Error('Order not found');
        }

        foundOrder.payment_status = 'PAID';
        foundOrder.status = OrderStatus.CONFIRMED;
        foundOrder.transaction_id = razorpay_payment_id;
        foundOrder.payment_method = 'RAZORPAY';
        await foundOrder.save(opts);

        for (const item of foundOrder.items) {
          const inventory = session 
            ? await Inventory.findOne({ product_id: item.product_id, variant_id: item.variant_id }).session(session)
            : await Inventory.findOne({ product_id: item.product_id, variant_id: item.variant_id });

          if (inventory) {
            const previous_stock = inventory.current_stock;
            const new_stock = Math.max(0, previous_stock - item.qty);
            
            inventory.current_stock = new_stock;
            await inventory.save(opts);

            await InventoryMovement.create([{
              inventory_id: inventory._id,
              type: MovementType.SALE,
              qty: -item.qty,
              previous_stock,
              new_stock,
              reference_id: foundOrder._id.toString()
            }], opts);
          }

          // Also update Product.stock & Batch.quantity for consistency
          if (item.product_id) {
            const prod = session 
              ? await Product.findById(item.product_id).session(session)
              : await Product.findById(item.product_id);
            if (prod) {
              prod.stock = Math.max(0, (prod.stock || 0) - item.qty);
              await prod.save(opts);
            }

            const batch = session
              ? await Batch.findOne({ product_id: item.product_id }).session(session)
              : await Batch.findOne({ product_id: item.product_id });
            if (batch) {
              batch.quantity = Math.max(0, (batch.quantity || 0) - item.qty);
              await batch.save(opts);
            }
          }
        }

        if (session) {
          await Cart.findOneAndUpdate({ user_id: req.user?._id }, { items: [] }).session(session);
        } else {
          await Cart.findOneAndUpdate({ user_id: req.user?._id }, { items: [] });
        }

        return foundOrder;
      });

      res.json({ message: "Payment verified successfully", order });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error processing confirmed order' });
    }
  } else {
    res.status(400).json({ message: "Invalid signature sent!" });
  }
};
