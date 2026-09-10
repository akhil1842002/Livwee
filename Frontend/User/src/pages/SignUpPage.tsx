import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const SignUpPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const navigate = useNavigate();
  const { register, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    const success = await register({
      email,
      password,
      name: fullName,
      phone,
      address_line: addressLine,
      city,
      state,
      zip
    });
    if (success) {
      navigate('/');
    }
  };

  return (
    <main>
      <section className="i pg fh rm ki xn vq gj qp gr hj rp hr">
        {/* Bg Shapes */}
        <img src="/images/shape-06.svg" alt="Shape" className="h j k" />
        <img src="/images/shape-03.svg" alt="Shape" className="h l m" />
        <img src="/images/shape-17.svg" alt="Shape" className="h n o" />
        <img src="/images/shape-18.svg" alt="Shape" className="h p q" />

        <div className="animate_top bb af i va sg hh sm vk xm yi _n jp hi ao kp">
          <span className="rc h r s zd/2 od zg gh"></span>
          <span className="rc h r q zd/2 od xg mh"></span>

          <div className="rj">
            <h2 className="ek ck kk wm xb">Create an Account</h2>
            <p>Lorem ipsum dolor sit amet, consectetur</p>

            <span className="i rc sj hk xj">
              <span className="rc h s z/2 nd oe rh tm"></span>
              <span className="rc h q z/2 nd oe rh tm"></span>
              Sign up with your details
            </span>
          </div>

          <form className="sb" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {formError && <div className="text-red-500 mb-4">{formError}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="wb mb-0">
                <label className="rc kk wm vb" htmlFor="fullName">Full Name *</label>
                <input type="text" name="fullName" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" required />
              </div>

              <div className="wb mb-0">
                <label className="rc kk wm vb">Phone Number</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1234567890" className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" />
              </div>

              <div className="wb mb-0 md:col-span-2">
                <label className="rc kk wm vb" htmlFor="email">Email Address *</label>
                <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@gmail.com" className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" required />
              </div>

              <div className="wb mb-0 md:col-span-2">
                <label className="rc kk wm vb">Address Line</label>
                <input type="text" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} placeholder="123 Main St" className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" />
              </div>

              <div className="wb mb-0">
                <label className="rc kk wm vb">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" />
              </div>

              <div className="wb mb-0">
                <label className="rc kk wm vb">State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" />
              </div>

              <div className="wb mb-0 md:col-span-2">
                <label className="rc kk wm vb">ZIP Code</label>
                <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" />
              </div>

              <div className="wb mb-0">
                <label className="rc kk wm vb" htmlFor="password">Password *</label>
                <input type="password" name="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="**************" className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" required minLength={6} />
              </div>

              <div className="wb mb-0">
                <label className="rc kk wm vb" htmlFor="confirmPassword">Confirm Password *</label>
                <input type="password" name="confirmPassword" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="**************" className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40" required minLength={6} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="vd rj ek rc rg gh lk ml il _l gi hi mt-8">
              {loading ? 'Signing Up...' : 'Sign Up'}
            </button>

            <div className="text-center mt-6">
              <p>
                Already have an account?{' '}
                <Link to="/signin" className="text-primary underline">
                  Sign In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};
