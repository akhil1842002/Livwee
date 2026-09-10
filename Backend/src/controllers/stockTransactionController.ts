import { Request, Response } from 'express';
import { InventoryMovement, Product, Inventory } from '../models';
import { logAudit } from '../utils/auditLogger';

export const getStockTransactions = async (req: Request, res: Response) => {
  try {
    const movements = await InventoryMovement.find()
      .populate('inventory_id')
      .populate('created_by', 'name email')
      .sort({ createdAt: -1 });

    const formatted = await Promise.all(
      movements.map(async (m: any) => {
        let productName = 'Medicine Item';
        let batch = 'BAT-2026-001';
        if (m.inventory_id && m.inventory_id.product_id) {
          const prod = await Product.findById(m.inventory_id.product_id);
          if (prod) productName = prod.name;
        }

        let prevRes = m.previous_reserved;
        let newRes = m.new_reserved;

        if (prevRes === undefined || newRes === undefined) {
          const currentInvReserved = m.inventory_id?.reserved_stock || 0;
          const absQty = Math.abs(m.qty || 0);
          if (m.type === 'RESERVATION') {
            newRes = newRes !== undefined ? newRes : (currentInvReserved || absQty);
            prevRes = prevRes !== undefined ? prevRes : Math.max(0, newRes - absQty);
          } else if (m.type === 'RELEASE') {
            newRes = newRes !== undefined ? newRes : currentInvReserved;
            prevRes = prevRes !== undefined ? prevRes : (newRes + absQty);
          } else {
            prevRes = prevRes || 0;
            newRes = newRes || 0;
          }
        }

        return {
          id: m._id.toString(),
          _id: m._id,
          productId: m.inventory_id?.product_id ? m.inventory_id.product_id.toString() : '',
          product: productName,
          batch: batch,
          type: m.type,
          qty: m.qty,
          prevQty: m.previous_stock,
          newQty: m.new_stock,
          prevReserved: prevRes,
          newReserved: newRes,
          ref: m.reference_id || `REF-${m._id.toString().slice(-6).toUpperCase()}`,
          by: m.created_by?.name || (req as any).user?.name || 'Super Admin (Akhil)',
          time: new Date(m.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
        };
      })
    );

    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching stock transactions' });
  }
};

export const createStockTransaction = async (req: Request, res: Response) => {
  try {
    const { productId, batch, type, qty, ref } = req.body;
    const numQty = Number(qty) || 0;
    
    let prod = null;
    if (productId) {
      prod = await Product.findById(productId);
    }

    if (!prod) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let inventory = await Inventory.findOne({ product_id: prod._id });
    if (!inventory) {
      inventory = await Inventory.create({
        product_id: prod._id,
        current_stock: prod.stock || 0,
        reserved_stock: 0,
        low_stock_threshold: 5
      });
    }

    const previous_stock = inventory.current_stock !== undefined ? inventory.current_stock : (prod.stock || 0);
    const previous_reserved = inventory.reserved_stock || 0;
    let new_stock = previous_stock;

    if (type === 'RESERVATION') {
      if (req.body.reservedStock !== undefined || req.body.reserved_stock !== undefined) {
        const resVal = req.body.reservedStock !== undefined ? req.body.reservedStock : req.body.reserved_stock;
        inventory.reserved_stock = Math.max(0, Number(resVal) || 0);
      } else {
        const delta = Math.abs(numQty);
        inventory.reserved_stock = Math.max(0, (inventory.reserved_stock || 0) + delta);
      }
    } else if (type === 'RELEASE') {
      if (req.body.reservedStock !== undefined || req.body.reserved_stock !== undefined) {
        const resVal = req.body.reservedStock !== undefined ? req.body.reservedStock : req.body.reserved_stock;
        inventory.reserved_stock = Math.max(0, Number(resVal) || 0);
      } else {
        const delta = Math.abs(numQty);
        inventory.reserved_stock = Math.max(0, (inventory.reserved_stock || 0) - delta);
      }
    } else {
      new_stock = Math.max(0, previous_stock + numQty);
      if (req.body.reservedStock !== undefined || req.body.reserved_stock !== undefined) {
        const resVal = req.body.reservedStock !== undefined ? req.body.reservedStock : req.body.reserved_stock;
        inventory.reserved_stock = Math.max(0, Number(resVal) || 0);
      }
      inventory.current_stock = new_stock;
      prod.stock = new_stock;
      await prod.save();
    }

    await inventory.save();
    const new_reserved = inventory.reserved_stock || 0;

    const movement = await InventoryMovement.create({
      inventory_id: inventory._id,
      type: type || 'ADJUSTMENT',
      qty: numQty,
      previous_stock,
      new_stock,
      previous_reserved,
      new_reserved,
      reference_id: ref || (type === 'RESERVATION' ? `RES-${Date.now().toString().slice(-6)}` : type === 'RELEASE' ? `REL-${Date.now().toString().slice(-6)}` : `ADJ-${Date.now().toString().slice(-6)}`),
      created_by: (req as any).user?._id
    });

    await logAudit({
      req,
      action: type === 'RESERVATION' ? 'STOCK_RESERVATION' : type === 'RELEASE' ? 'STOCK_RELEASE' : 'STOCK_ADJUSTMENT',
      entity: 'Inventory',
      entityId: prod._id.toString(),
      desc: `${type || 'ADJUSTMENT'} transaction recorded for "${prod.name}" (${numQty >= 0 ? '+' : ''}${numQty} units). Stock changed from ${previous_stock} to ${new_stock}`,
      severity: numQty < 0 ? 'WARNING' : 'INFO',
      payload: {
        productName: prod.name,
        type: type || 'ADJUSTMENT',
        qty: numQty,
        previousStock: previous_stock,
        newStock: new_stock,
        ref: movement.reference_id
      }
    });

    const formatted = {
      id: movement._id.toString(),
      _id: movement._id,
      productId: prod._id.toString(),
      product: prod.name,
      batch: batch || 'BAT-2026-001',
      type: movement.type,
      qty: movement.qty,
      prevQty: movement.previous_stock,
      newQty: movement.new_stock,
      prevReserved: previous_reserved,
      newReserved: new_reserved,
      ref: movement.reference_id,
      by: (req as any).user?.name || 'Super Admin (Akhil)',
      time: new Date((movement as any).createdAt || Date.now()).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    };

    res.status(201).json({ success: true, data: formatted });
  } catch (err: any) {
    console.error('createStockTransaction Error:', err);
    res.status(400).json({ message: err.message || 'Error creating transaction' });
  }
};

