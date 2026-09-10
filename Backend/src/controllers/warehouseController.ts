import { Request, Response } from 'express';
import { Warehouse } from '../models';

export const getWarehouses = async (req: Request, res: Response) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    const formatted = warehouses.map(w => ({
      id: w._id.toString(),
      _id: w._id,
      name: w.name,
      code: w.code,
      location: w.location,
      isDefault: w.is_default,
      status: w.status || 'ACTIVE'
    }));
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching warehouses' });
  }
};

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    const { name, code, location, isDefault = false, status = 'ACTIVE' } = req.body;
    if (isDefault) {
      // Set all other warehouses default to false
      await Warehouse.updateMany({}, { is_default: false });
    }
    const whCode = code || name.substring(0, 3).toUpperCase();
    const warehouse = await Warehouse.create({ name, code: whCode, location, is_default: isDefault, status });
    res.status(201).json({
      success: true,
      data: {
        id: warehouse._id.toString(),
        name: warehouse.name,
        code: warehouse.code,
        location: warehouse.location,
        isDefault: warehouse.is_default,
        status: warehouse.status
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating warehouse' });
  }
};

export const updateWarehouse = async (req: Request, res: Response) => {
  try {
    const { name, code, location, isDefault, status } = req.body;
    if (isDefault) {
      await Warehouse.updateMany({}, { is_default: false });
    }
    const updateData: any = {};
    if (name) updateData.name = name;
    if (code) updateData.code = code;
    if (location) updateData.location = location;
    if (isDefault !== undefined) updateData.is_default = isDefault;
    if (status) updateData.status = status;

    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!warehouse) return res.status(404).json({ message: 'Warehouse not found' });
    res.json({
      success: true,
      data: {
        id: warehouse._id.toString(),
        name: warehouse.name,
        code: warehouse.code,
        location: warehouse.location,
        isDefault: warehouse.is_default,
        status: warehouse.status
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating warehouse' });
  }
};

export const deleteWarehouse = async (req: Request, res: Response) => {
  try {
    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Warehouse deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting warehouse' });
  }
};
