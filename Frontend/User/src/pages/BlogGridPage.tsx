import React from 'react';
import { Link } from 'react-router-dom';

export const BlogGridPage: React.FC = () => {
  const blogs = [
    {
      id: 1,
      title: 'Free advertising for your online business',
      image: '/images/blog-01.png',
      author: 'Musharof Chy',
      date: '25 Dec, 2025',
    },
    {
      id: 2,
      title: '9 simple ways to improve your design skills',
      image: '/images/blog-02.png',
      author: 'Musharof Chy',
      date: '25 Dec, 2025',
    },
    {
      id: 3,
      title: 'Tips to quickly improve your coding speed.',
      image: '/images/blog-03.png',
      author: 'Musharof Chy',
      date: '25 Dec, 2025',
    },
    {
      id: 4,
      title: 'Free advertising for your online business',
      image: '/images/blog-01.png',
      author: 'Musharof Chy',
      date: '25 Dec, 2025',
    },
    {
      id: 5,
      title: '9 simple ways to improve your design skills',
      image: '/images/blog-02.png',
      author: 'Musharof Chy',
      date: '25 Dec, 2025',
    },
    {
      id: 6,
      title: 'Tips to quickly improve your coding speed.',
      image: '/images/blog-03.png',
      author: 'Musharof Chy',
      date: '25 Dec, 2025',
    },
  ];

  return (
    <main>
      <section className="ji gp uq">
        <div className="bb ye ki xn vq jb jo">
          <div className="wc qf pn xo zf iq">
            {blogs.map((blog) => (
              <div key={blog.id} className="animate_top sg vk rm xm">
                <div className="c rc i z-1 pg">
                  <img className="w-full" src={blog.image} alt="Blog" />
                  <div className="im h r s df vd yc wg tc wf xf al hh/20 nl il z-10">
                    <Link to="/blog-single" className="vc ek rg lk gh sl ml il gi hi">
                      Read More
                    </Link>
                  </div>
                </div>

                <div className="yh">
                  <div className="tc uf wf ag jq">
                    <div className="tc wf ag">
                      <img src="/images/icon-man.svg" alt="User" />
                      <p>{blog.author}</p>
                    </div>
                    <div className="tc wf ag">
                      <img src="/images/icon-calender.svg" alt="Calender" />
                      <p>{blog.date}</p>
                    </div>
                  </div>
                  <h4 className="ek tj ml il kk wm xl eq lb">
                    <Link to="/blog-single">{blog.title}</Link>
                  </h4>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mb lo bq i ua">
            <nav>
              <ul className="tc wf xf bg">
                <li>
                  <a className="c tc wf xf wd in zc hn rg uj fo wk xm ml il hh rm tl zm yl an" href="#!">
                    <svg className="th lm ml il" width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2.93884 6.99999L7.88884 11.95L6.47484 13.364L0.11084 6.99999L6.47484 0.635986L7.88884 2.04999L2.93884 6.99999Z" fill="currentColor" />
                    </svg>
                  </a>
                </li>
                <li><a className="c tc wf xf wd in zc hn rg uj fo wk xm ml il hh rm tl zm yl an" href="#!">1</a></li>
                <li><a className="c tc wf xf wd in zc hn rg uj fo wk xm ml il hh rm tl zm yl an" href="#!">2</a></li>
                <li><a className="c tc wf xf wd in zc hn rg uj fo wk xm ml il hh rm tl zm yl an" href="#!">3</a></li>
              </ul>
            </nav>
          </div>
        </div>
      </section>
    </main>
  );
};
