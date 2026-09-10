import { Request, Response } from 'express';
import { Cart } from '../models/Cart';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req: AuthRequest, res: Response) => {
  let cart = await Cart.findOne({ user_id: req.user?._id }).populate('items.product_id');
  
  if (!cart) {
    cart = await Cart.create({ user_id: req.user?._id, items: [] });
  }
  
  res.json(cart);
};

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
export const addToCart = async (req: AuthRequest, res: Response) => {
  const { product_id, variant_id, qty } = req.body;
  
  let cart = await Cart.findOne({ user_id: req.user?._id });
  
  if (!cart) {
    cart = await Cart.create({ user_id: req.user?._id, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    item => item.product_id.toString() === product_id && 
    (item.variant_id?.toString() === variant_id || (!item.variant_id && !variant_id))
  );

  if (existingItemIndex > -1) {
    cart.items[existingItemIndex].qty += Number(qty);
  } else {
    cart.items.push({ product_id, variant_id, qty: Number(qty) } as any);
  }

  await cart.save();
  const populatedCart = await Cart.findById(cart._id).populate('items.product_id');
  res.json(populatedCart);
};

// @desc    Update item quantity
// @route   PUT /api/cart/update
// @access  Private
export const updateCartItem = async (req: AuthRequest, res: Response) => {
  const { product_id, variant_id, qty } = req.body;
  
  let cart = await Cart.findOne({ user_id: req.user?._id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });

  const existingItemIndex = cart.items.findIndex(
    item => item.product_id.toString() === product_id && 
    (item.variant_id?.toString() === variant_id || (!item.variant_id && !variant_id))
  );

  if (existingItemIndex > -1) {
    if (Number(qty) <= 0) {
      cart.items.splice(existingItemIndex, 1);
    } else {
      cart.items[existingItemIndex].qty = Number(qty);
    }
    await cart.save();
  }

  const populatedCart = await Cart.findById(cart._id).populate('items.product_id');
  res.json(populatedCart);
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req: AuthRequest, res: Response) => {
  await Cart.findOneAndUpdate({ user_id: req.user?._id }, { items: [] });
  res.json({ message: 'Cart cleared' });
};
