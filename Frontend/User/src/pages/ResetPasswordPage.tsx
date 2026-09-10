import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const { resetPassword, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (token) {
      const res = await resetPassword(token, password);
      if (res.success) {
        setSuccessMsg('Password has been reset successfully. Redirecting to login...');
        setTimeout(() => navigate('/signin'), 3000);
      }
    }
  };

  return (
    <main>
      <section className="i pg fh rm ki xn vq gj qp gr hj rp hr">
        <div className="animate_top bb af i va sg hh sm vk xm yi _n jp hi ao kp max-w-lg mx-auto">
          <div className="rj text-center">
            <h2 className="ek ck kk wm xb mb-4">Set New Password</h2>
            <p className="mb-6">Please enter your new password below.</p>
          </div>

          <form className="sb" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 mb-4 text-center">{error}</div>}
            {formError && <div className="text-red-500 mb-4 text-center">{formError}</div>}
            {successMsg && <div className="text-green-600 mb-4 text-center font-semibold bg-green-50 py-2 rounded">{successMsg}</div>}

            <div className="wb">
              <label className="rc kk wm vb" htmlFor="password">New Password</label>
              <input
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="**************"
                className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40"
                required
                minLength={6}
              />
            </div>

            <div className="wb">
              <label className="rc kk wm vb" htmlFor="confirmPassword">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="**************"
                className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40"
                required
                minLength={6}
              />
            </div>

            <button type="submit" disabled={loading || !!successMsg} className="vd rj ek rc rg gh lk ml il _l gi hi mt-4">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <div className="text-center mt-6">
              <Link to="/signin" className="text-primary underline">Back to Sign In</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};
