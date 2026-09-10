import express from 'express';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct, getCategories, createCategory } from '../controllers/productController';

const router = express.Router();

router.get('/categories', getCategories);
router.post('/categories', createCategory);

router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

export default router;
