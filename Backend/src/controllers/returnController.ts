import { Request, Response } from 'express';
import { Return, ReturnDisposition, ReturnStatus } from '../models/Return';
import { Product } from '../models/Product';
import { Batch } from '../models/Batch';
import { Inventory, InventoryMovement, MovementType } from '../models/Inventory';
import { AuthRequest } from '../middleware/authMiddleware';
import { logAudit } from '../utils/auditLogger';

// @desc    Get all sales returns & customer refund vouchers
// @route   GET /api/returns
// @access  Private/Admin
export const getReturns = async (req: Request, res: Response) => {
  try {
    const returns = await Return.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: returns.length, data: returns });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching returns' });
  }
};

// @desc    Create a new customer return & refund voucher with automatic inventory restock/quarantine & movement tracking
// @route   POST /api/returns
// @access  Private/Admin
export const createReturn = async (req: AuthRequest, res: Response) => {
  try {
    const {
      order_number,
      customer_name,
      customer_phone,
      returned_item_name,
      batch_no,
      qty_returned = 1,
      reason,
      disposition = ReturnDisposition.RESTOCK_INVENTORY,
      refund_amount,
      refund_method = 'UPI'
    } = req.body;

    if (!customer_name || !returned_item_name || !reason || refund_amount === undefined) {
      return res.status(400).json({ message: 'Please provide all required return details' });
    }

    const returnCount = await Return.countDocuments();
    const return_number = `RET-2026-${String(returnCount + 1).padStart(3, '0')}`;

    const newReturn = await Return.create({
      return_number,
      order_number,
      customer_name,
      customer_phone,
      returned_item_name,
      batch_no,
      qty_returned,
      reason,
      disposition,
      refund_amount,
      refund_method,
      status: ReturnStatus.REFUNDED,
      date: new Date().toISOString().split('T')[0]
    });

    // ─── Automated Stock, Batch & Inventory Movement Management ────────────────
    const qty = Number(qty_returned) || 1;
    let product = await Product.findOne({ name: new RegExp(`^${returned_item_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    if (!product) {
      product = await Product.findOne({ name: { $regex: returned_item_name, $options: 'i' } });
    }

    if (product) {
      if (disposition === ReturnDisposition.RESTOCK_INVENTORY || disposition === 'RESTOCK_INVENTORY') {
        product.stock = (product.stock || 0) + qty;
        await product.save();

        if (batch_no) {
          const batch = await Batch.findOne({ product_id: product._id, batch_number: batch_no }) || await Batch.findOne({ product_id: product._id });
          if (batch) {
            batch.quantity = (batch.quantity || 0) + qty;
            await batch.save();
          }
        }

        let inventory = await Inventory.findOne({ product_id: product._id });
        if (inventory) {
          const prevStock = inventory.current_stock || 0;
          const nextStock = prevStock + qty;
          inventory.current_stock = nextStock;
          await inventory.save();

          await InventoryMovement.create({
            inventory_id: inventory._id,
            type: MovementType.RETURN,
            qty: qty,
            previous_stock: prevStock,
            new_stock: nextStock,
            reference_id: return_number,
            created_by: req.user?._id
          });
        }
      } else {
        // Damaged / Expired Quarantine
        let inventory = await Inventory.findOne({ product_id: product._id });
        if (inventory) {
          await InventoryMovement.create({
            inventory_id: inventory._id,
            type: MovementType.ADJUSTMENT,
            qty: 0,
            previous_stock: inventory.current_stock,
            new_stock: inventory.current_stock,
            reference_id: `${return_number}-DAMAGED`,
            created_by: req.user?._id
          });
        }
      }
    }

    await logAudit({
      req,
      action: 'SALE_RETURN_PROCESSED',
      entity: 'Billing',
      entityId: newReturn.return_number,
      desc: `Processed customer return voucher #${newReturn.return_number} for "${newReturn.returned_item_name}" (Qty: ${newReturn.qty_returned}, Disposition: ${newReturn.disposition}, Refund: ₹${newReturn.refund_amount} via ${newReturn.refund_method})`,
      severity: 'WARNING',
      payload: newReturn
    });

    res.status(201).json({ success: true, data: newReturn });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error creating return voucher' });
  }
};

