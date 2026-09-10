import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Order, OrderSource, OrderStatus } from '../models/Order';
import { Product } from '../models/Product';
import { Batch } from '../models/Batch';
import { Inventory, InventoryMovement, MovementType } from '../models/Inventory';
import { Customer } from '../models/Customer';
import { AuthRequest } from '../middleware/authMiddleware';
import { runInTransaction } from '../utils/safeTransaction';
import { logAudit } from '../utils/auditLogger';

// @desc    Process a POS checkout (offline billing)
// @route   POST /api/pos/checkout
// @access  Private/Admin
export const posCheckout = async (req: AuthRequest, res: Response) => {
  const { items, customer_id, customer_name, payment_method, discount, shipping_cost = 0, tax_rate = 0.12, paid_amount, invoice_number } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'No items in POS cart' });
  }

  try {
    const order = await runInTransaction(async (session) => {
      const opts = session ? { session } : undefined;
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        let product = null;
        if (mongoose.Types.ObjectId.isValid(item.product_id)) {
          product = await Product.findById(item.product_id).session(session);
        }
        if (!product) {
          product = await Product.findOne({ sku: item.product_id }).session(session);
        }
        if (!product) {
          product = await Product.findOne().session(session);
        }
        if (!product) {
          const created = await Product.create([{
            name: item.product_name || 'POS Custom Item',
            sku: item.product_id || `POS-ITEM-${Date.now()}`,
            category: 'General',
            price: item.unit_price || 0,
            stock: 1000
          }], opts);
          product = created[0];
        }

        const unit_price = item.unit_price !== undefined ? item.unit_price : (product.discount_price || product.price);
        const total = unit_price * item.qty;
        subtotal += total;

        orderItems.push({
          product_id: product._id,
          variant_id: item.variant_id,
          qty: item.qty,
          unit_price,
          total
        });

        const currentStock = product.stock || 0;

        let inventory = session 
          ? await Inventory.findOne({ product_id: product._id, ...(item.variant_id ? { variant_id: item.variant_id } : {}) }).session(session)
          : await Inventory.findOne({ product_id: product._id, ...(item.variant_id ? { variant_id: item.variant_id } : {}) });

        if (!inventory) {
          inventory = session
            ? await Inventory.findOne({ product_id: product._id }).session(session)
            : await Inventory.findOne({ product_id: product._id });
        }

        const previous_stock = inventory ? inventory.current_stock : currentStock;
        const reserved_stock = inventory ? (inventory.reserved_stock || 0) : 0;
        const available_stock = Math.max(0, previous_stock - reserved_stock);

        if (item.qty > available_stock) {
          throw new Error(`Insufficient available stock for "${product.name}". ${reserved_stock} units reserved, only ${available_stock} available to sell!`);
        }

        const new_stock = Math.max(0, previous_stock - item.qty);

        product.stock = Math.max(0, (product.stock || 0) - item.qty);
        await product.save(opts);

        const batch = await Batch.findOne({ product_id: product._id }).session(session);
        if (batch) {
          batch.quantity = Math.max(0, (batch.quantity || 0) - item.qty);
          await batch.save(opts);
        }

        if (inventory) {
          inventory.current_stock = new_stock;
          await inventory.save(opts);

          await InventoryMovement.create([{
            inventory_id: inventory._id,
            type: MovementType.SALE,
            qty: -item.qty,
            previous_stock,
            new_stock,
            reference_id: `POS-SALE`,
            created_by: req.user?._id
          }], opts);
        } else {
          const newInventory = await Inventory.create([{
            product_id: product._id,
            variant_id: item.variant_id,
            current_stock: new_stock,
            reserved_stock: 0,
            low_stock_threshold: 5
          }], opts);

          await InventoryMovement.create([{
            inventory_id: newInventory[0]._id,
            type: MovementType.SALE,
            qty: -item.qty,
            previous_stock,
            new_stock,
            reference_id: `POS-SALE`,
            created_by: req.user?._id
          }], opts);
        }
      }

      const applied_discount = discount || 0;
      const taxable_amount = subtotal - applied_discount;
      const effectiveTaxRate = Number(tax_rate !== undefined ? tax_rate : 0.12);
      const tax = taxable_amount * effectiveTaxRate;
      const shipping = Number(shipping_cost) || 0;
      const total_amount = Math.round((taxable_amount + tax + shipping) * 100) / 100;

      let actualPaid = paid_amount !== undefined ? Number(paid_amount) : total_amount;
      if (Math.abs(actualPaid - total_amount) < 1 || actualPaid >= total_amount) {
        actualPaid = total_amount;
      }
      const due_amount = Math.max(0, total_amount - actualPaid);

      let pStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'PAID';
      if (actualPaid <= 0) {
        pStatus = 'UNPAID';
      } else if (actualPaid < total_amount && due_amount > 0.5) {
        pStatus = 'PARTIAL';
      }

      const finalOrderNumber = invoice_number || `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const createdOrders = await Order.create([{
        order_number: finalOrderNumber,
        customer_id: customer_id || undefined,
        customer_name: customer_name || 'Walk-in Customer',
        source: OrderSource.POS,
        status: OrderStatus.DELIVERED,
        items: orderItems,
        subtotal,
        tax,
        discount: applied_discount,
        shipping_cost: shipping,
        total_amount,
        paid_amount: actualPaid,
        due_amount,
        payment_status: pStatus,
        payment_method: payment_method || 'CASH',
        created_by_admin: req.user?._id
      }], opts);

      const createdOrder = createdOrders[0];

      if (due_amount > 0) {
        if (customer_id && mongoose.Types.ObjectId.isValid(customer_id)) {
          const cust = await Customer.findById(customer_id).session(session);
          if (cust) {
            cust.outstanding_balance = (cust.outstanding_balance || 0) + due_amount;
            await cust.save(opts);
          }
        } else if (customer_name && customer_name !== 'Walk-in Customer') {
          const cust = session 
            ? await Customer.findOne({ name: customer_name }).session(session)
            : await Customer.findOne({ name: customer_name });
          if (cust) {
            cust.outstanding_balance = (cust.outstanding_balance || 0) + due_amount;
            await cust.save(opts);
          }
        }
      }

      await InventoryMovement.updateMany(
        { reference_id: 'POS-SALE' },
        { $set: { reference_id: createdOrder._id.toString() } },
        opts
      );

      return createdOrder;
    });

    await logAudit({
      req,
      action: 'POS_CHECKOUT',
      entity: 'Billing',
      entityId: order.order_number,
      desc: `Processed POS Retail Invoice #${order.order_number} for ₹${order.total_amount} (${order.payment_method || 'CASH'}) - Customer: ${order.customer_name || 'Walk-in'}`,
      severity: order.total_amount > 10000 ? 'CRITICAL' : 'INFO',
      payload: {
        orderNumber: order.order_number,
        totalAmount: order.total_amount,
        paymentMethod: order.payment_method,
        itemsCount: order.items?.length || 0,
        customerName: order.customer_name
      }
    });

    return res.status(201).json({ message: 'POS Sale Completed', order });
  } catch (error: any) {
    console.error('POS Checkout Error:', error);
    return res.status(400).json({ message: error.message || 'Error processing POS checkout' });
  }
};
