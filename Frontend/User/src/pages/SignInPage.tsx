import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const SignInPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();
  const { login, loading, error } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
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
            <h2 className="ek ck kk wm xb">Sign in to your Account</h2>
            <p>Lorem ipsum dolor sit amet, consectetur</p>

            <h3 className="hk yj kk wm ob mc">Sign in with Social Media</h3>
            <ul className="tc wf xf mg ec">
              <li>
                <a className="tc wf xf be dd di sg _g ch qm ml il bm rl/40 ym/40" href="#!">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_50_914)">
                      <path
                        d="M22.0001 11.2439C22.0134 10.4877 21.9338 9.73268 21.7629 8.99512H11.2246V13.0773H17.4105C17.2933 13.793 17.0296 14.4782 16.6352 15.0915C16.2409 15.7048 15.724 16.2336 15.1158 16.6461L15.0942 16.7828L18.4264 19.3125L18.6571 19.3351C20.7772 17.4162 21.9997 14.5928 21.9997 11.2439"
                        fill="#4285F4"
                      />
                      <path
                        d="M11.2245 22C14.255 22 16.7992 21.0222 18.6577 19.3355L15.1156 16.6465C14.1679 17.2945 12.8958 17.7467 11.2245 17.7467C9.80508 17.7386 8.42433 17.2926 7.27814 16.4721C6.13195 15.6516 5.27851 14.4982 4.83892 13.1755L4.70737 13.1865L1.24255 15.8143L1.19727 15.9377C2.13043 17.7603 3.56252 19.2925 5.33341 20.3631C7.10429 21.4338 9.14416 22.0005 11.2249 22"
                        fill="#34A853"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_50_914">
                        <rect width="22" height="22" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </a>
              </li>
            </ul>

            <span className="i rc sj hk xj">
              <span className="rc h s z/2 nd oe rh tm"></span>
              <span className="rc h q z/2 nd oe rh tm"></span>
              Or, sign in with your email
            </span>
          </div>

          <form className="sb" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 mb-4">{error}</div>}
            <div className="wb">
              <label className="rc kk wm vb" htmlFor="username">
                Username or Email
              </label>
              <input
                type="text"
                name="username"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="example@gmail.com"
                className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40"
                required
              />
            </div>

            <div className="wb">
              <label className="rc kk wm vb" htmlFor="password">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="**************"
                className="vd hh rg zk _g ch hm dm fm pl/50 xi mi sm xm pm dn/40"
                required
              />
              <Link to="/forgot-password" className="text-sm text-primary hover:underline mt-2 inline-block">Forgot Password?</Link>
            </div>

            <button type="submit" disabled={loading} className="vd rj ek rc rg gh lk ml il _l gi hi">
              {loading ? 'Signing In...' : 'Sign In'}
            </button>

            <div className="text-center mt-6">
              <p>
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary underline">
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
};
