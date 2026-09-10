import { Request, Response } from 'express';
import { Category, Brand, Unit, Tax, Product } from '../models';

// --- Categories ---
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    // Count products per category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ category_id: cat._id });
        return {
          id: cat._id.toString(),
          _id: cat._id,
          name: cat.name,
          slug: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
          description: cat.description || '',
          status: cat.status || 'ACTIVE',
          productsCount: count,
        };
      })
    );
    res.json({ success: true, data: categoriesWithCount });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, status = 'ACTIVE' } = req.body;
    const catSlug = slug || name.toLowerCase().replace(/\s+/g, '-');
    const category = await Category.create({ name, slug: catSlug, description, status });
    res.status(201).json({ success: true, data: { id: category._id.toString(), ...category.toObject(), productsCount: 0 } });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating category' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { name, slug, description, status } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (slug || name) updateData.slug = slug || name.toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) updateData.description = description;
    if (status) updateData.status = status;

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    const count = await Product.countDocuments({ category_id: category._id });
    res.json({ success: true, data: { id: category._id.toString(), ...category.toObject(), productsCount: count } });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting category' });
  }
};

// --- Brands ---
export const getBrands = async (req: Request, res: Response) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
    const brandsWithCount = brands.map((b) => ({
      id: b._id.toString(),
      _id: b._id,
      name: b.name,
      code: b.code,
      status: b.status || 'ACTIVE',
      productsCount: 0,
    }));
    res.json({ success: true, data: brandsWithCount });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching brands' });
  }
};

export const createBrand = async (req: Request, res: Response) => {
  try {
    const { name, code, status = 'ACTIVE' } = req.body;
    const brandCode = code || name.substring(0, 3).toUpperCase();
    const brand = await Brand.create({ name, code: brandCode, status });
    res.status(201).json({ success: true, data: { id: brand._id.toString(), ...brand.toObject(), productsCount: 0 } });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating brand' });
  }
};

export const updateBrand = async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!brand) return res.status(404).json({ message: 'Brand not found' });
    res.json({ success: true, data: { id: brand._id.toString(), ...brand.toObject(), productsCount: 0 } });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating brand' });
  }
};

export const deleteBrand = async (req: Request, res: Response) => {
  try {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Brand deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting brand' });
  }
};

// --- Units ---
export const getUnits = async (req: Request, res: Response) => {
  try {
    const units = await Unit.find().sort({ createdAt: -1 });
    const formatted = units.map(u => ({
      id: u._id.toString(),
      _id: u._id,
      name: u.name,
      code: u.code,
      description: u.description || ''
    }));
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching units' });
  }
};

export const createUnit = async (req: Request, res: Response) => {
  try {
    const { name, code, description } = req.body;
    const unitCode = code || name.substring(0, 3).toUpperCase();
    const unit = await Unit.create({ name, code: unitCode, description });
    res.status(201).json({ success: true, data: { id: unit._id.toString(), ...unit.toObject() } });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating unit' });
  }
};

export const updateUnit = async (req: Request, res: Response) => {
  try {
    const unit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    res.json({ success: true, data: { id: unit._id.toString(), ...unit.toObject() } });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating unit' });
  }
};

export const deleteUnit = async (req: Request, res: Response) => {
  try {
    await Unit.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Unit deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting unit' });
  }
};

// --- Taxes ---
export const getTaxes = async (req: Request, res: Response) => {
  try {
    const taxes = await Tax.find().sort({ createdAt: -1 });
    const formatted = taxes.map(t => ({
      id: t._id.toString(),
      _id: t._id,
      name: t.name,
      percentage: t.percentage,
      status: t.status || 'ACTIVE',
      description: t.description || ''
    }));
    res.json({ success: true, data: formatted });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching taxes' });
  }
};

export const createTax = async (req: Request, res: Response) => {
  try {
    const { name, percentage, status = 'ACTIVE', description } = req.body;
    const tax = await Tax.create({ name, percentage: Number(percentage), status, description });
    res.status(201).json({ success: true, data: { id: tax._id.toString(), ...tax.toObject() } });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating tax' });
  }
};

export const updateTax = async (req: Request, res: Response) => {
  try {
    const tax = await Tax.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tax) return res.status(404).json({ message: 'Tax not found' });
    res.json({ success: true, data: { id: tax._id.toString(), ...tax.toObject() } });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error updating tax' });
  }
};

export const deleteTax = async (req: Request, res: Response) => {
  try {
    await Tax.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Tax deleted' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting tax' });
  }
};
