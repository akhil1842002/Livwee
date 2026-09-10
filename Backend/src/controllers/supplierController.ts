import { Request, Response } from 'express';
import { Supplier } from '../models/Supplier';

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private/Admin
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error fetching suppliers' });
  }
};

// @desc    Create supplier
// @route   POST /api/suppliers
// @access  Private/Admin
export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contact_person, phone, email, gstin, outstanding_balance = 0 } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: 'Supplier name and phone are required' });
    }

    const count = await Supplier.countDocuments();
    const supplier_code = `SUP-2026-${String(count + 1).padStart(3, '0')}`;

    const supplier = await Supplier.create({
      supplier_code,
      name,
      contact_person,
      phone,
      email,
      gstin,
      outstanding_balance
    });

    res.status(201).json({ success: true, data: supplier });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error creating supplier' });
  }
};

// @desc    Update supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.status(200).json({ success: true, data: supplier });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Server error updating supplier' });
  }
};
