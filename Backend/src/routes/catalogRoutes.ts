import { Router } from 'express';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getBrands, createBrand, updateBrand, deleteBrand,
  getUnits, createUnit, updateUnit, deleteUnit,
  getTaxes, createTax, updateTax, deleteTax
} from '../controllers/catalogController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Categories
router.route('/categories')
  .get(protect, getCategories)
  .post(protect, createCategory);

router.route('/categories/:id')
  .put(protect, updateCategory)
  .delete(protect, deleteCategory);

// Brands
router.route('/brands')
  .get(protect, getBrands)
  .post(protect, createBrand);

router.route('/brands/:id')
  .put(protect, updateBrand)
  .delete(protect, deleteBrand);

// Units
router.route('/units')
  .get(protect, getUnits)
  .post(protect, createUnit);

router.route('/units/:id')
  .put(protect, updateUnit)
  .delete(protect, deleteUnit);

// Taxes
router.route('/taxes')
  .get(protect, getTaxes)
  .post(protect, createTax);

router.route('/taxes/:id')
  .put(protect, updateTax)
  .delete(protect, deleteTax);

export default router;
