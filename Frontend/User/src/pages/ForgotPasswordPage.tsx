import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const { forgotPassword, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const res = await forgotPassword(email);
    if (res.success) {
      setMessage(res.message);
    }
  };

  return (
    <main>
      <section className="i pg fh rm ki xn vq gj qp gr hj rp hr">
        <div className="animate_top bb af i va sg hh sm vk xm yi _n jp hi ao kp max-w-lg mx-auto">
          <div className="rj text-center">
            <h2 className="ek ck kk wm xb mb-4">Reset Your Password</h2>
            <p className="mb-6">Enter your email address and we will send you a link to reset your password.</p>
          </div>

          <form className="sb" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
            {message && <div className="text-green-600 mb-4 text-center font-semibold bg-green-50 py-2 rounded">{message}</div>}

            <div className="wb">
              <label className="rc kk wm vb" htmlFor="email">Email Address</label>
              <input
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="vd rj ek rc rg gh lk ml il _l gi hi mt-4">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="text-center mt-6">
              <p>
                Remembered your password?{' '}
                <Link to="/signin" className="text-primary underline">Sign In</Link>
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};
