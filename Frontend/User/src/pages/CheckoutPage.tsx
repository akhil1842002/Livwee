import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, fetchCart } = useCartStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({ street: '', city: '', state: '', zipCode: '', country: '' });

  useEffect(() => {
    fetchCart();
    // Pre-fill address if we had an endpoint for it, but for now just leave blank
  }, []);

  const items = cart?.items || [];
  const total = items.reduce((sum, item) => sum + ((item.product_id?.price || 0) * item.qty), 0);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    try {
      // Create Razorpay Order
      const res = await axios.post('/api/checkout/create-order', {
        shippingAddress: address
      });

      const { order, key } = res.data;

      // Initialize Razorpay
      const options = {
        key: key,
        amount: order.amount,
        currency: order.currency,
        name: "Medikit",
        description: "Test Transaction",
        order_id: order.id,
        handler: async function (response: any) {
          try {
            await axios.post('/api/checkout/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              local_order_id: order.receipt
            });
            alert("Payment Successful!");
            navigate('/dashboard');
          } catch (err) {
            alert("Payment Verification Failed!");
          }
        },
        prefill: {
          name: user?.email.split('@')[0],
          email: user?.email,
          contact: ""
        },
        theme: {
          color: "#007bff"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert("Payment Failed");
      });
      rzp.open();

    } catch (error) {
      console.error(error);
      alert("Failed to initiate checkout");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="text-center py-40">Please <a href="/signin" className="text-primary underline">Sign In</a> to checkout.</div>;
  }

  return (
    <main>
      <section className="pt-35 pb-20 bg-gray-50">
        <div className="bb ze ki xn 2xl:ud-px-0 max-w-6xl mx-auto">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b mb-10">Checkout</h2>

          <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-2/3">
              <form onSubmit={handleCheckout} className="bg-white shadow-md rounded-lg p-8">
                <h3 className="text-xl font-bold mb-6 border-b pb-2">Shipping Details</h3>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-semibold mb-2">Street Address</label>
                  <input type="text" required value={address.street} onChange={(e) => setAddress({...address, street: e.target.value})} className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">City</label>
                    <input type="text" required value={address.city} onChange={(e) => setAddress({...address, city: e.target.value})} className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">State</label>
                    <input type="text" required value={address.state} onChange={(e) => setAddress({...address, state: e.target.value})} className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">ZIP Code</label>
                    <input type="text" required value={address.zipCode} onChange={(e) => setAddress({...address, zipCode: e.target.value})} className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">Country</label>
                    <input type="text" required value={address.country} onChange={(e) => setAddress({...address, country: e.target.value})} className="w-full px-4 py-2 border rounded focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading || items.length === 0}
                  className="w-full bg-primary text-white font-bold py-3 rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                </button>
              </form>
            </div>

            <div className="lg:w-1/3">
              <div className="bg-white shadow-md rounded-lg p-6">
                <h3 className="text-xl font-bold mb-6 border-b pb-2">Order Summary</h3>
                <div className="divide-y">
                  {items.map(item => (
                    <div key={item._id} className="py-4 flex justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">{item.qty}x</span>
                        <span className="text-gray-700">{item.product_id?.name}</span>
                      </div>
                      <span className="font-bold">${((item.product_id?.price || 0) * item.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-6 pt-4 border-t border-black text-xl font-bold">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
