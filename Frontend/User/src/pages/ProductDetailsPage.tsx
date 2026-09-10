import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { productDetails, loading, error, fetchProductDetails } = useProductStore();
  const { addToCart } = useCartStore();
  const { user } = useAuthStore();
  
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProductDetails(id);
    }
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (id) {
      setAdding(true);
      await addToCart(id, qty);
      setAdding(false);
      navigate('/cart');
    }
  };

  if (loading) return <div className="text-center py-40">Loading...</div>;
  if (error) return <div className="text-center py-40 text-red-500">{error}</div>;
  if (!productDetails) return <div className="text-center py-40">Product not found.</div>;

  const inStock = productDetails.stock_status === 'IN_STOCK';

  return (
    <main>
      <section className="pt-35 pb-20">
        <div className="bb ze ki xn 2xl:ud-px-0">
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Product Image */}
            <div className="lg:w-1/2">
              <div className="bg-gray-100 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
                {productDetails.image_url ? (
                  <img src={`http://localhost:5000${productDetails.image_url}`} alt={productDetails.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400">No Image Available</span>
                )}
              </div>
            </div>

            {/* Product Info */}
            <div className="lg:w-1/2 flex flex-col justify-center">
              <div className="text-sm text-primary font-semibold tracking-wide uppercase mb-2">
                {productDetails.category?.name || 'Uncategorized'}
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{productDetails.name}</h1>
              
              <div className="text-3xl font-bold text-gray-900 mb-6">
                ${productDetails.price.toFixed(2)}
              </div>
              
              <p className="text-gray-600 mb-8 leading-relaxed">
                {productDetails.description}
              </p>

              <div className="mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {inStock ? 'In Stock' : 'Out of Stock'}
                </span>
                <span className="ml-4 text-sm text-gray-500">SKU: {productDetails.sku}</span>
              </div>

              {inStock && (
                <div className="flex items-center gap-4 mb-8">
                  <div className="flex items-center border border-gray-300 rounded-md">
                    <button 
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                      onClick={() => setQty(Math.max(1, qty - 1))}
                    >
                      -
                    </button>
                    <span className="px-4 py-2 font-semibold border-l border-r border-gray-300">{qty}</span>
                    <button 
                      className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                      onClick={() => setQty(qty + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={handleAddToCart}
                    disabled={adding}
                    className="flex-1 bg-primary text-white px-8 py-3 rounded-md font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {adding ? 'Adding to Cart...' : 'Add to Cart'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
