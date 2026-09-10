import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { Category } from '../models/Category';
import { logAudit } from '../utils/auditLogger';

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).populate('category_id');
    const inventories = await Inventory.find({});
    const invMap = new Map<string, number>();
    inventories.forEach((inv: any) => {
      if (inv.product_id) {
        invMap.set(inv.product_id.toString(), inv.reserved_stock || 0);
      }
    });

    const productsWithReserved = products.map((p: any) => {
      const pObj = p.toObject();
      const pIdStr = pObj._id.toString();
      pObj.reserved_stock = invMap.get(pIdStr) || 0;
      return pObj;
    });

    res.json(productsWithReserved);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching products' });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id).populate('category_id');
    if (product) {
      const pObj: any = product.toObject();
      const inv = await Inventory.findOne({ product_id: product._id });
      pObj.reserved_stock = inv ? inv.reserved_stock : 0;
      res.json(pObj);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching product' });
  }
};

// @desc    Create a product (Admin)
// @route   POST /api/products
// @access  Public/Admin
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      sku,
      barcode,
      price,
      cost_price,
      category,
      brand,
      unit,
      tax_rate,
      category_id,
      brand_id,
      unit_id,
      stock,
      status,
      visibility,
      variants
    } = req.body;

    const product = new Product({
      name,
      description: description || '',
      sku: sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
      barcode: barcode || '',
      price: Number(price) || 0,
      cost_price: Number(cost_price) || 0,
      category: category || '',
      brand: brand || '',
      unit: unit || '',
      tax_rate: Number(tax_rate) || 0,
      category_id: category_id || undefined,
      brand_id: brand_id || undefined,
      unit_id: unit_id || undefined,
      stock: Number(stock) || 0,
      status: status || 'ACTIVE',
      visibility: visibility !== undefined ? visibility : (status !== 'INACTIVE'),
      variants: variants || []
    });

    const createdProduct = await product.save();
    
    // Create inventory record
    await Inventory.create({
      product_id: createdProduct._id,
      current_stock: Number(stock) || 0,
      reserved_stock: 0
    });

    await logAudit({
      req,
      action: 'PRODUCT_CREATED',
      entity: 'Product',
      entityId: createdProduct._id.toString(),
      desc: `Created new product "${createdProduct.name}" (SKU: ${createdProduct.sku}) with price ₹${createdProduct.price} and stock ${createdProduct.stock}`,
      severity: 'INFO',
      payload: createdProduct
    });

    res.status(201).json(createdProduct);
  } catch (err: any) {
    console.error('Error creating product in DB:', err);
    res.status(400).json({ message: err.message || 'Error creating product' });
  }
};

// @desc    Update a product (Admin)
// @route   PUT /api/products/:id
// @access  Public/Admin
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      if (req.body.name !== undefined) product.name = req.body.name;
      if (req.body.sku !== undefined) product.sku = req.body.sku;
      if (req.body.description !== undefined) product.description = req.body.description;
      if (req.body.price !== undefined) product.price = Number(req.body.price);
      if (req.body.cost_price !== undefined) product.cost_price = Number(req.body.cost_price);
      if (req.body.category !== undefined) product.category = req.body.category;
      if (req.body.brand !== undefined) product.brand = req.body.brand;
      if (req.body.unit !== undefined) product.unit = req.body.unit;
      if (req.body.tax_rate !== undefined) product.tax_rate = Number(req.body.tax_rate);
      if (req.body.stock !== undefined) product.stock = Number(req.body.stock);
      if (req.body.status !== undefined) product.status = req.body.status;
      if (req.body.discount_price !== undefined) product.discount_price = Number(req.body.discount_price);
      if (req.body.visibility !== undefined) product.visibility = req.body.visibility;
      if (req.body.category_id !== undefined) product.category_id = req.body.category_id;
      if (req.body.brand_id !== undefined) product.brand_id = req.body.brand_id;
      if (req.body.unit_id !== undefined) product.unit_id = req.body.unit_id;
      if (req.body.variants !== undefined) product.variants = req.body.variants;

      const updatedProduct = await product.save();

      if (req.body.stock !== undefined) {
        await Inventory.findOneAndUpdate(
          { product_id: product._id },
          { current_stock: Number(req.body.stock) },
          { upsert: true }
        );
      }

      await logAudit({
        req,
        action: 'PRODUCT_UPDATED',
        entity: 'Product',
        entityId: updatedProduct._id.toString(),
        desc: `Updated product details for "${updatedProduct.name}" (SKU: ${updatedProduct.sku})`,
        severity: 'INFO',
        payload: updatedProduct
      });

      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (err: any) {
    console.error('Error updating product in DB:', err);
    res.status(400).json({ message: err.message || 'Error updating product' });
  }
};

// @desc    Delete a product (Admin)
// @route   DELETE /api/products/:id
// @access  Public/Admin
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await Inventory.deleteMany({ product_id: req.params.id });

    await logAudit({
      req,
      action: 'PRODUCT_DELETED',
      entity: 'Product',
      entityId: req.params.id,
      desc: `Deleted product "${product.name}" (SKU: ${product.sku}) from catalog`,
      severity: 'WARNING',
      payload: { name: product.name, sku: product.sku }
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error deleting product' });
  }
};


// Categories
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({});
    res.json(categories);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Error fetching categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const category = await Category.create({ name: req.body.name, description: req.body.description });
    res.status(201).json(category);
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error creating category' });
  }
};
