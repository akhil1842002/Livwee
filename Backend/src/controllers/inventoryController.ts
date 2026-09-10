import { Request, Response } from 'express';
import { Inventory, InventoryMovement, MovementType } from '../models/Inventory';
import { Product } from '../models/Product';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get all inventory levels
// @route   GET /api/inventory
// @access  Private/Admin
export const getInventory = async (req: Request, res: Response) => {
  const inventory = await Inventory.find({}).populate('product_id');
  res.json(inventory);
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await InventoryMovement.find({})
      .populate({
        path: 'inventory_id',
        populate: { path: 'product_id', strictPopulate: false },
        strictPopulate: false
      })
      .populate({ path: 'created_by', select: 'name email', strictPopulate: false })
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err: any) {
    console.error('getTransactions Error:', err);
    res.status(500).json({ message: err.message || 'Error fetching transactions' });
  }
};

// @desc    Adjust stock level (Manual adjustment)
// @route   POST /api/inventory/adjust or /transactions
// @access  Private/Admin
export const adjustStock = async (req: AuthRequest, res: Response) => {
  try {
    const { inventory_id, productId, qty, type, ref } = req.body;
    const reference_id = ref || req.body.reference_id;
    const numQty = Number(qty) || 0;
    
    let inventory = null;
    let prodId = productId;

    if (inventory_id) {
      inventory = await Inventory.findById(inventory_id);
      if (inventory) prodId = inventory.product_id;
    }

    if (!inventory && prodId) {
      inventory = await Inventory.findOne({ product_id: prodId });
    }

    let product = null;
    if (prodId) {
      product = await Product.findById(prodId);
    }

    if (!inventory && product) {
      inventory = await Inventory.create({
        product_id: product._id,
        current_stock: product.stock || 0,
        reserved_stock: 0,
        low_stock_threshold: 5
      });
    }
    
    if (!inventory) {
      return res.status(404).json({ message: 'Inventory record not found' });
    }

    const previous_stock = inventory.current_stock !== undefined ? inventory.current_stock : (product?.stock || 0);
    const new_stock = previous_stock + numQty;

    inventory.current_stock = new_stock;
    await inventory.save();

    if (product) {
      product.stock = new_stock;
      await product.save();
    }

    const movement = await InventoryMovement.create({
      inventory_id: inventory._id,
      type: type || MovementType.ADJUSTMENT,
      qty: numQty,
      previous_stock,
      new_stock,
      reference_id: reference_id || `ADJ-${Date.now().toString().slice(-6)}`,
      created_by: req.user?._id
    });

    return res.json({ success: true, inventory, movement });
  } catch (err: any) {
    console.error('adjustStock error:', err);
    return res.status(400).json({ message: err.message || 'Error adjusting stock' });
  }
};
