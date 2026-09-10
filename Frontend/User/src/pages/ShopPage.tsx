import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProductStore } from '../store/productStore';

export const ShopPage: React.FC = () => {
  const { products, loading, error, fetchProducts } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <main>
      <section className="pt-35 pb-20">
        <div className="bb ze ki xn 2xl:ud-px-0">
          <div className="text-center mb-10">
            <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">Our Products</h2>
            <p className="hq">Browse our catalog of high-quality products.</p>
          </div>

          {loading ? (
            <div className="text-center py-20">Loading products...</div>
          ) : error ? (
            <div className="text-center py-20 text-red-500">{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {products.map((product) => (
                <div key={product._id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
                  <Link to={`/product/${product._id}`} className="block h-64 overflow-hidden relative">
                    {product.image_url ? (
                      <img src={`http://localhost:5000${product.image_url}`} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 hover:scale-110" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">No Image</div>
                    )}
                    {product.stock_status === 'OUT_OF_STOCK' && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Out of Stock</div>
                    )}
                  </Link>
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="text-sm text-gray-500 mb-1">{product.category?.name || 'Uncategorized'}</div>
                    <h3 className="text-lg font-semibold mb-2">
                      <Link to={`/product/${product._id}`} className="hover:text-primary transition-colors">{product.name}</Link>
                    </h3>
                    <div className="mt-auto pt-4 flex items-center justify-between">
                      <div className="text-xl font-bold text-primary">${product.price.toFixed(2)}</div>
                      <Link to={`/product/${product._id}`} className="text-sm font-medium bg-primary text-white px-3 py-1.5 rounded hover:bg-primary/90 transition-colors">
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
