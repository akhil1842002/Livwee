import React, { useEffect } from 'react';
import { useOrderStore } from '../store/orderStore';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { orders, loading, fetchMyOrders } = useOrderStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchMyOrders();
  }, []);

  if (!user) return <div className="text-center py-40">Please sign in.</div>;

  return (
    <main>
      <section className="pt-35 pb-20 bg-gray-50 min-h-screen">
        <div className="bb ze ki xn 2xl:ud-px-0 max-w-6xl mx-auto">
          
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar */}
            <div className="md:w-1/4">
              <div className="bg-white shadow-md rounded-lg p-6">
                <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-4">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <h3 className="text-center font-bold text-lg mb-1">{user.email.split('@')[0]}</h3>
                <p className="text-center text-sm text-gray-500 mb-6">{user.email}</p>
                <div className="border-t pt-4">
                  <a href="#!" className="block font-semibold text-primary mb-2">My Orders</a>
                  <a href="#!" className="block text-gray-600 hover:text-primary mb-2">Account Details</a>
                  <a href="#!" className="block text-gray-600 hover:text-primary">Addresses</a>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:w-3/4">
              <div className="bg-white shadow-md rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-6 border-b pb-4">My Orders</h2>
                
                {loading ? (
                  <p>Loading your orders...</p>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                    <Link to="/shop" className="bg-primary text-white px-6 py-2 rounded font-semibold hover:bg-primary/90">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {orders.map((order) => (
                      <div key={order._id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                          <div>
                            <p className="text-sm text-gray-500">Order ID: {order._id}</p>
                            <p className="font-semibold text-gray-800">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                              order.payment_status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.payment_status}
                            </span>
                            <p className="font-bold text-xl mt-2">${order.total_amount.toFixed(2)}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">Items</h4>
                          <ul className="space-y-2">
                            {order.items.map((item: any) => (
                              <li key={item._id} className="flex justify-between text-sm text-gray-700">
                                <span>{item.qty}x {item.product_id?.name || 'Product'}</span>
                                <span>${(item.price * item.qty).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
};
