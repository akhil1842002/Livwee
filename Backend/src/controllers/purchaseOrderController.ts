import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { PurchaseOrder, POStatus } from '../models/PurchaseOrder';
import { Product } from '../models/Product';
import { Batch } from '../models/Batch';
import { Inventory, InventoryMovement, MovementType } from '../models/Inventory';
import { PaymentReceipt } from '../models/PaymentReceipt';
import { runInTransaction } from '../utils/safeTransaction';
import { logAudit } from '../utils/auditLogger';

const syncStockAndBatches = async (po: any) => {
  try {
    await runInTransaction(async (session) => {
      const opts = session ? { session } : undefined;
      const receiveDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
      let hasUpdates = false;

      for (const item of po.items) {
        const totalReceived = Number(
          po.status === 'CANCELLED' ? 0 :
          (item.qty_received > 0 ? item.qty_received : (po.status === 'RECEIVED' || po.status === 'CLOSED' ? item.qty_ordered : 0))
        );
        const alreadyStocked = Number(item.qty_stocked || 0);
        const deltaQty = totalReceived - alreadyStocked;

        if (deltaQty !== 0) {
          hasUpdates = true;
          item.qty_stocked = totalReceived;
          item.qty_received = totalReceived;

          // 1. Increment product stock by deltaQty
          let prod = await Product.findOneAndUpdate(
            { name: { $regex: new RegExp(`^${item.product_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
            { $inc: { stock: deltaQty } },
            { new: true, ...(session ? { session } : {}) }
          );
          if (!prod && deltaQty > 0) {
            const sku = `SKU-${Math.floor(1000 + Math.random() * 9000)}`;
            const created = await Product.create([{
              name: item.product_name,
              sku,
              price: Number(item.unit_price || 100) * 1.3,
              cost_price: Number(item.unit_price || 100),
              stock: deltaQty,
              unit: 'Box',
              status: 'ACTIVE',
              visibility: true
            }], opts);
            prod = created[0];
          } else if (prod && (prod.stock || 0) < 0) {
            prod.stock = 0;
            await prod.save(opts);
          }

          // 2. Increment batch quantity by deltaQty
          const batchNo = `BAT-${po.po_number || '2026'}-${receiveDate}`;
          const existingBatch = session 
            ? await Batch.findOne({ product_name: item.product_name, batch_number: batchNo }).session(session)
            : await Batch.findOne({ product_name: item.product_name, batch_number: batchNo });

          if (existingBatch) {
            existingBatch.quantity = Math.max(0, (existingBatch.quantity || 0) + deltaQty);
            await existingBatch.save(opts);
          } else if (deltaQty > 0) {
            await Batch.create([{
              product_id: prod?._id,
              product_name: item.product_name,
              sku: prod?.sku || 'SKU-001',
              batch_number: batchNo,
              warehouse_name: po.warehouse_name || 'Main Pharmacy Store',
              expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              purchase_price: Number(item.unit_price || 0),
              selling_price: Number(prod?.price || (item.unit_price * 1.3) || 0),
              quantity: deltaQty,
              status: 'ACTIVE'
            }], opts);
          }

          // 3. Increment Inventory current_stock & log movement
          if (prod) {
            let inv = session
              ? await Inventory.findOne({ product_id: prod._id }).session(session)
              : await Inventory.findOne({ product_id: prod._id });

            const prevStock = inv ? inv.current_stock : 0;
            const newStock = Math.max(0, prevStock + deltaQty);

            if (inv) {
              inv.current_stock = newStock;
              await inv.save(opts);
            } else if (deltaQty > 0) {
              const createdInv = await Inventory.create([{
                product_id: prod._id,
                current_stock: deltaQty,
                reserved_stock: 0,
                low_stock_threshold: 5
              }], opts);
              inv = createdInv[0];
            }

            if (inv) {
              await InventoryMovement.create([{
                inventory_id: inv._id,
                type: deltaQty > 0 ? MovementType.RESTOCK : MovementType.ADJUSTMENT,
                qty: deltaQty,
                previous_stock: prevStock,
                new_stock: newStock,
                reference_id: po.po_number || 'PO-RECEIVE'
              }], opts);
            }
          }
        }
      }

      if (hasUpdates) {
        await po.save(opts);
      }
    });
  } catch (err) {
    console.error('Error syncing stock and batches:', err);
  }
};


// @desc    Get all purchase orders
// @route   GET /api/purchases/orders
// @access  Private/Admin
export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const orders = await PurchaseOrder.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching purchase orders' });
  }
};

// @desc    Create purchase order
// @route   POST /api/purchases/orders
// @access  Private/Admin
export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const {
      po_number,
      supplier_name,
      warehouse_name,
      order_date,
      expected_delivery,
      payment_terms,
      items,
      subtotal,
      shipping_cost = 0,
      tax_amount = 0,
      total_amount,
      notes,
      status
    } = req.body;

    if (!supplier_name || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier name and order items are required' });
    }

    const count = await PurchaseOrder.countDocuments();
    const generatedPONum = po_number || `PO-2026-${String(count + 1).padStart(3, '0')}`;
    const targetStatus = status || POStatus.ORDERED;
    const isFullyReceived = targetStatus === POStatus.RECEIVED || targetStatus === POStatus.CLOSED;

    const po = await PurchaseOrder.create({
      po_number: generatedPONum,
      supplier_name,
      warehouse_name: warehouse_name || 'Main Pharmacy Store',
      order_date: order_date || new Date().toISOString().split('T')[0],
      expected_delivery: expected_delivery || '',
      payment_terms: payment_terms || 'Net 30',
      items: items.map((i: any) => {
        const qOrd = Number(i.qty_ordered || i.qtyOrdered || 1);
        const qRec = isFullyReceived ? qOrd : Number(i.qty_received || i.qtyReceived || 0);
        return {
          product_name: i.product_name || i.productName || 'Product',
          qty_ordered: qOrd,
          qty_received: qRec,
          unit_price: Number(i.unit_price || i.unitCost || 0),
          total: Number(i.total || i.total_cost || i.lineTotal || 0)
        };
      }),
      subtotal: Number(subtotal || 0),
      shipping_cost: Number(shipping_cost || 0),
      tax_amount: Number(tax_amount || 0),
      total_amount: Number(total_amount || 0),
      paid_amount: Number(req.body.paid_amount || req.body.amountPaid || 0),
      payment_status: req.body.payment_status || (Number(req.body.paid_amount || req.body.amountPaid || 0) >= Number(total_amount) ? 'PAID' : (Number(req.body.paid_amount || req.body.amountPaid || 0) > 0 ? 'PARTIAL' : 'UNPAID')),
      status: targetStatus,
      notes: notes || '',
      audit_logs: req.body.audit_logs || req.body.auditLogs || [{
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        updatedBy: req.body.created_by || 'Admin',
        userRole: 'SUPER_ADMIN',
        action: `Issued Purchase Order ${generatedPONum}`,
        newStatus: targetStatus,
        remarks: 'Order created'
      }]
    });

    await syncStockAndBatches(po);

    await logAudit({
      req,
      action: 'PO_CREATED',
      entity: 'PurchaseOrder',
      entityId: po.po_number,
      desc: `Created Purchase Order #${po.po_number} for supplier "${po.supplier_name}" (Total: ₹${po.total_amount})`,
      severity: 'INFO',
      payload: po
    });

    res.status(201).json({ success: true, data: po });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error creating purchase order' });
  }
};

// @desc    Update purchase order status/items/payments
// @route   PUT /api/purchases/orders/:id
// @access  Private/Admin
export const updatePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { status, items, notes, paid_amount, payment_status, audit_logs, auditLogs } = req.body;
    const pId = String(req.params.id || '');
    let po = null;
    if (mongoose.Types.ObjectId.isValid(pId)) {
      po = await PurchaseOrder.findById(pId);
    }
    if (!po) {
      po = await PurchaseOrder.findOne({ po_number: pId });
    }
    if (!po) {
      po = await PurchaseOrder.findOne({ po_number: new RegExp(`^${pId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
    }
    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    if (status) po.status = status;
    if (notes) po.notes = notes;
    if (paid_amount !== undefined) po.paid_amount = Number(paid_amount);
    
    if (payment_status) {
      po.payment_status = payment_status;
    } else if (paid_amount !== undefined) {
      if (po.paid_amount >= po.total_amount) {
        po.payment_status = 'PAID';
      } else if (po.paid_amount > 0) {
        po.payment_status = 'PARTIAL';
      } else {
        po.payment_status = 'UNPAID';
      }
    }

    if (audit_logs || auditLogs) {
      po.audit_logs = audit_logs || auditLogs;
    }

    if (items && Array.isArray(items) && items.length > 0) {
      po.items = items.map((i: any) => {
        const existingItem = po.items.find(existing => existing.product_name === (i.product_name || i.productName));
        return {
          product_name: i.product_name || i.productName || 'Product',
          qty_ordered: Number(i.qty_ordered || i.qtyOrdered || 1),
          qty_received: Number(i.qty_received || i.qtyReceived || 0),
          qty_stocked: Number(i.qty_stocked || i.qtyStocked || existingItem?.qty_stocked || 0),
          unit_price: Number(i.unit_price || i.unitCost || 0),
          total: Number(i.total || i.total_cost || i.lineTotal || 0)
        };
      });
    }

    if (po.status === POStatus.RECEIVED) {
      po.items = po.items.map(item => ({
        ...item,
        qty_received: item.qty_ordered,
        total: item.qty_ordered * item.unit_price
      }));
    } else if (po.status === POStatus.CLOSED) {
      let newSubtotal = 0;
      po.items = po.items.map(item => {
        const rQty = item.qty_received > 0 ? item.qty_received : item.qty_ordered;
        const lineTot = rQty * item.unit_price;
        newSubtotal += lineTot;
        return {
          ...item,
          qty_received: rQty,
          total: lineTot
        };
      });

      const hasPartialQty = po.items.some(i => i.qty_received < i.qty_ordered);
      if (hasPartialQty) {
        po.subtotal = newSubtotal;
        po.tax_amount = Math.round(newSubtotal * 0.12 * 100) / 100;
        po.total_amount = po.subtotal + po.tax_amount + (po.shipping_cost || 0);
      }
      if (po.paid_amount >= po.total_amount) {
        po.payment_status = 'PAID';
      }
    }

    await po.save();
    await syncStockAndBatches(po);

    await logAudit({
      req,
      action: 'PO_STATUS_CHANGED',
      entity: 'PurchaseOrder',
      entityId: po.po_number,
      desc: `Updated Purchase Order #${po.po_number} - Status: ${po.status}, Payment Status: ${po.payment_status}`,
      severity: 'INFO',
      payload: { status: po.status, paymentStatus: po.payment_status, totalAmount: po.total_amount }
    });

    res.status(200).json({ success: true, data: po });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error updating purchase order' });
  }
};


// @desc    Receive shipment & close PO
// @route   PUT /api/purchases/orders/:id/receive
// @access  Private/Admin
export const receivePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    po.status = POStatus.CLOSED;
    po.items = po.items.map(item => ({ ...item, qty_received: item.qty_ordered }));
    await po.save();

    await syncStockAndBatches(po);

    res.status(200).json({ success: true, message: `PO ${po.po_number} closed & stock received`, data: po });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error receiving purchase order' });
  }
};

// @desc    Settle / Pay purchase order balance and issue vendor receipt
// @route   PUT /api/purchases/orders/:id/pay
// @access  Private/Admin
export const payPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { amount_paid, payment_method, notes } = req.body;
    const pId = String(req.params.id || '');
    let po = null;
    if (mongoose.Types.ObjectId.isValid(pId)) {
      po = await PurchaseOrder.findById(pId);
    }
    if (!po) {
      po = await PurchaseOrder.findOne({ po_number: pId });
    }
    if (!po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const payAmt = Number(amount_paid || 0);
    if (payAmt <= 0) {
      return res.status(400).json({ message: 'Payment amount must be greater than 0' });
    }

    const currentPaid = Number(po.paid_amount || 0);
    const newPaid = Math.min(po.total_amount, currentPaid + payAmt);
    po.paid_amount = newPaid;

    if (po.paid_amount >= po.total_amount - 0.01) {
      po.payment_status = 'PAID';
    } else {
      po.payment_status = 'PARTIAL';
    }

    await po.save();

    // Generate Vendor Payment Receipt Record
    const receiptCount = await PaymentReceipt.countDocuments();
    const receiptNum = `REC-PO-2026-${String(receiptCount + 1).padStart(3, '0')}`;
    const receipt = await PaymentReceipt.create({
      receipt_number: receiptNum,
      invoice_number: po.po_number || `PO-${po._id.toString().slice(-6)}`,
      customer_name: po.supplier_name || 'Vendor Supplier',
      amount_collected: payAmt,
      payment_method: payment_method || 'Bank Transfer',
      timestamp: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      notes: notes || `Vendor payment settlement for PO #${po.po_number}`
    });

    await logAudit({
      req,
      action: 'VENDOR_PAYMENT_SETTLED',
      entity: 'PurchaseOrder',
      entityId: po.po_number,
      desc: `Paid ₹${payAmt} for PO #${po.po_number} (${po.supplier_name}). Receipt: ${receiptNum}`,
      severity: 'INFO',
      payload: { poNumber: po.po_number, paidAmount: payAmt, newTotalPaid: newPaid, receiptNumber: receiptNum }
    });

    res.status(200).json({
      success: true,
      message: `Payment of ₹${payAmt} recorded for PO #${po.po_number}`,
      data: po,
      receipt: {
        id: receipt._id.toString(),
        receiptNumber: receipt.receipt_number,
        invoiceNumber: receipt.invoice_number,
        customer: receipt.customer_name,
        amountCollected: receipt.amount_collected,
        paymentMethod: receipt.payment_method,
        timestamp: receipt.timestamp,
        notes: receipt.notes
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error recording purchase order payment' });
  }
};
