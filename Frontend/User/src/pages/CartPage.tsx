import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

export const CartPage: React.FC = () => {
  const { cart, loading, error, fetchCart, updateQty } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  if (loading) return <div className="text-center py-40">Loading Cart...</div>;
  if (error) return <div className="text-center py-40 text-red-500">{error}</div>;

  const items = cart?.items || [];
  const subtotal = items.reduce((sum, item) => sum + ((item.product_id?.price || 0) * item.qty), 0);

  return (
    <main>
      <section className="pt-35 pb-20">
        <div className="bb ze ki xn 2xl:ud-px-0">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b mb-10">Your Shopping Cart</h2>

          {items.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-lg">
              <p className="text-lg text-gray-600 mb-6">Your cart is currently empty.</p>
              <Link to="/shop" className="ek rg lk gh sl ml il gi hi px-8 py-3 rounded-md">
                Return to Shop
              </Link>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Cart Items */}
              <div className="lg:w-2/3">
                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-gray-700">Product</th>
                        <th className="px-6 py-4 font-semibold text-gray-700">Price</th>
                        <th className="px-6 py-4 font-semibold text-gray-700">Quantity</th>
                        <th className="px-6 py-4 font-semibold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item._id}>
                          <td className="px-6 py-4 flex items-center gap-4">
                            <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {item.product_id?.image_url ? (
                                <img src={`http://localhost:5000${item.product_id.image_url}`} alt={item.product_id.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs text-gray-400">No Img</span>
                              )}
                            </div>
                            <Link to={`/product/${item.product_id?._id}`} className="font-semibold text-gray-900 hover:text-primary">
                              {item.product_id?.name || 'Unknown Product'}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            ${(item.product_id?.price || 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center border border-gray-300 rounded w-max">
                              <button 
                                className="px-3 py-1 hover:bg-gray-100"
                                onClick={() => updateQty(item.product_id?._id, Math.max(0, item.qty - 1))}
                              >
                                -
                              </button>
                              <span className="px-3 py-1 border-l border-r border-gray-300">{item.qty}</span>
                              <button 
                                className="px-3 py-1 hover:bg-gray-100"
                                onClick={() => updateQty(item.product_id?._id, item.qty + 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-semibold text-gray-900">
                            ${((item.product_id?.price || 0) * item.qty).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cart Summary */}
              <div className="lg:w-1/3">
                <div className="bg-white shadow-md rounded-lg p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Order Summary</h3>
                  <div className="flex justify-between mb-4 text-gray-700">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-4 text-gray-700">
                    <span>Shipping</span>
                    <span>Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between mt-6 pt-6 border-t font-bold text-lg text-gray-900">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => navigate('/checkout')}
                    className="w-full mt-8 bg-primary text-white font-semibold py-3 rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
