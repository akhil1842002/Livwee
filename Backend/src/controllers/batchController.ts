import { Request, Response } from 'express';
import { Batch } from '../models';

export const getBatches = async (req: Request, res: Response) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    const formatted = batches.map(b => ({
      id: b._id.toString(),
      _id: b._id,
      productId: b.product_id ? b.product_id.toString() : '',
      product: b.product_name,
      sku: b.sku || 'N/A',
      batchNumber: b.batch_number,
      warehouseId: b.warehouse_id ? b.warehouse_id.toString() : '',
      warehouse: b.warehouse_name || 'Main Warehouse',
      expiryDate: b.expiry_date ? new Date(b.expiry_date).toISOString().split('T')[0] : '',
      purchasePrice: b.purchase_price,
      sellingPrice: b.selling_price,
      quantity: b.quantity,
      status: b.status || 'ACTIVE'
    }));
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching batches' });
  }
};

export const createBatch = async (req: Request, res: Response) => {
  try {
    const { productId, product, sku, batchNumber, warehouseId, warehouse, expiryDate, purchasePrice, sellingPrice, quantity } = req.body;
    const batch = await Batch.create({
      product_id: productId || undefined,
      product_name: product || 'Medicine Product',
      sku,
      batch_number: batchNumber,
      warehouse_id: warehouseId || undefined,
      warehouse_name: warehouse || 'Main Warehouse',
      expiry_date: expiryDate,
      purchase_price: Number(purchasePrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      quantity: Number(quantity) || 0,
      status: new Date(expiryDate) < new Date(Date.now() + 30 * 86400000) ? 'EXPIRING_SOON' : 'ACTIVE'
    });
    res.status(201).json({
      success: true,
      data: {
        id: batch._id.toString(),
        productId: batch.product_id?.toString() || '',
        product: batch.product_name,
        sku: batch.sku || '',
        batchNumber: batch.batch_number,
        warehouseId: batch.warehouse_id?.toString() || '',
        warehouse: batch.warehouse_name,
        expiryDate: new Date(batch.expiry_date).toISOString().split('T')[0],
        purchasePrice: batch.purchase_price,
        sellingPrice: batch.selling_price,
        quantity: batch.quantity,
        status: batch.status
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating batch' });
  }
};

export const updateBatch = async (req: Request, res: Response) => {
  try {
    const { productId, product, sku, batchNumber, warehouseId, warehouse, expiryDate, purchasePrice, sellingPrice, quantity, status } = req.body;
    const updateData: any = {};
    if (productId !== undefined) updateData.product_id = productId;
    if (product) updateData.product_name = product;
    if (sku !== undefined) updateData.sku = sku;
    if (batchNumber) updateData.batch_number = batchNumber;
    if (warehouseId !== undefined) updateData.warehouse_id = warehouseId;
    if (warehouse) updateData.warehouse_name = warehouse;
    if (expiryDate) updateData.expiry_date = expiryDate;
    if (purchasePrice !== undefined) updateData.purchase_price = Number(purchasePrice);
    if (sellingPrice !== undefined) updateData.selling_price = Number(sellingPrice);
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (status) updateData.status = status;

    const batch = await Batch.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json({
      success: true,
      data: {
        id: batch._id.toString(),
        productId: batch.product_id?.toString() || '',
        product: batch.product_name,
        sku: batch.sku || '',
        batchNumber: batch.batch_number,
        warehouseId: batch.warehouse_id?.toString() || '',
        warehouse: batch.warehouse_name,
        expiryDate: new Date(batch.expiry_date).toISOString().split('T')[0],
        purchasePrice: batch.purchase_price,
        sellingPrice: batch.selling_price,
        quantity: batch.quantity,
        status: batch.status
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating batch' });
  }
};

export const deleteBatch = async (req: Request, res: Response) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting batch' });
  }
};
