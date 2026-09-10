import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules';
import Isotope from 'isotope-layout';

export const HomePage: React.FC = () => {
  const [billPlan, setBillPlan] = useState<'monthly' | 'annually'>('monthly');
  const [filterTab, setFilterTab] = useState<number>(1);

  useEffect(() => {
    let iso: Isotope | null = null;
    const elem = document.querySelector('.projects-wrapper');
    if (elem) {
      // Small timeout to ensure DOM & images are ready for Isotope sizing calculation
      const timer = setTimeout(() => {
        iso = new Isotope(elem as HTMLElement, {
          itemSelector: '.project-item',
          percentPosition: true,
          masonry: {
            columnWidth: '.project-sizer',
          },
        });
      }, 100);

      return () => {
        clearTimeout(timer);
        if (iso) {
          iso.destroy();
        }
      };
    }
  }, [filterTab]);

  const plans = [
    { name: 'Starter', price: { monthly: 29, annually: 29 * 12 - 199 }, features: ['400 GB Storage', 'Unlimited Photos & Videos', 'Exclusive Support'] },
    { name: 'Growth Plan', price: { monthly: 59, annually: 59 * 12 - 100 }, features: ['400 GB Storage', 'Unlimited Photos & Videos', 'Exclusive Support'] },
    { name: 'Business', price: { monthly: 139, annually: 139 * 12 - 100 }, features: ['400 GB Storage', 'Unlimited Photos & Videos', 'Exclusive Support'] },
  ];

  return (
    <main>
      {/* ===== Hero Start ===== */}
      <section className="gj do ir hj sp jr i pg">
        {/* Hero Images */}
        <div className="xc fn zd/2 2xl:ud-w-187.5 bd 2xl:ud-h-171.5 h q r">
          <img src="/images/shape-01.svg" alt="shape" className="xc 2xl:ud-block h t -ud-left-[10%] ua" />
          <img src="/images/shape-02.svg" alt="shape" className="xc 2xl:ud-block h u p va" />
          <img src="/images/shape-03.svg" alt="shape" className="xc 2xl:ud-block h v w va" />
          <img src="/images/shape-04.svg" alt="shape" className="h q r" />
          <img src="/images/hero.png" alt="Woman" className="h q r ua" />
        </div>

        {/* Hero Content */}
        <div className="bb ze ki xn 2xl:ud-px-0">
          <div className="tc _o">
            <div className="animate_left jn/2">
              <h1 className="fk vj zp or kk wm wb">We specialize in UI/UX, Web Development, Digital Marketing.</h1>
              <p className="fq">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque fringilla magna mauris. Nulla fermentum
                viverra sem eu rhoncus consequat varius nisi quis, posuere magna.
              </p>

              <div className="tc tf yo zf mb">
                <a href="#!" className="ek jk lk gh gi hi rg ml il vc _d _l">Get Started Now</a>

                <span className="tc sf">
                  <a href="#!" className="inline-block ek xj kk wm"> Call us (0123) 456 – 789 </a>
                  <span className="inline-block">For any question or concern</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ===== Hero End ===== */}

      {/* ===== Small Features Start ===== */}
      <section id="features">
        <div className="bb ze ki yn 2xl:ud-px-12.5">
          <div className="tc uf zo xf ap zf bp mq">
            <div className="animate_top kn to/3 tc cg oq">
              <div className="tc wf xf cf ae cd rg mh">
                <img src="/images/icon-01.svg" alt="Icon" />
              </div>
              <div>
                <h4 className="ek yj go kk wm xb">24/7 Support</h4>
                <p>Lorem ipsum dolor sit amet conse adipiscing elit.</p>
              </div>
            </div>

            <div className="animate_top kn to/3 tc cg oq">
              <div className="tc wf xf cf ae cd rg nh">
                <img src="/images/icon-02.svg" alt="Icon" />
              </div>
              <div>
                <h4 className="ek yj go kk wm xb">Take Ownership</h4>
                <p>Lorem ipsum dolor sit amet conse adipiscing elit.</p>
              </div>
            </div>

            <div className="animate_top kn to/3 tc cg oq">
              <div className="tc wf xf cf ae cd rg oh">
                <img src="/images/icon-03.svg" alt="Icon" />
              </div>
              <div>
                <h4 className="ek yj go kk wm xb">Team Work</h4>
                <p>Lorem ipsum dolor sit amet conse adipiscing elit.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ===== Small Features End ===== */}

      {/* ===== About Start ===== */}
      <section className="ji gp uq 2xl:ud-py-35 pg">
        <div className="bb ze ki xn wq">
          <div className="tc wf gg qq">
            {/* About Images */}
            <div className="animate_left xc gn gg jn/2 i">
              <div>
                <img src="/images/shape-05.svg" alt="Shape" className="h -ud-left-5 x" />
                <img src="/images/about-01.png" alt="About" className="ib" />
                <img src="/images/about-02.png" alt="About" />
              </div>
              <div>
                <img src="/images/shape-06.svg" alt="Shape" />
                <img src="/images/about-03.png" alt="About" className="ob gb" />
                <img src="/images/shape-07.svg" alt="Shape" className="bb" />
              </div>
            </div>

            {/* About Content */}
            <div className="animate_right jn/2">
              <h4 className="ek yj mk gb">Why Choose Us</h4>
              <h2 className="fk vj zp pr kk wm qb">We Make Our customers happy by giving Best services.</h2>
              <p className="uo">It is a long established fact that a reader will be distracted by the readable content of a
                page when looking at its layout. The point of using Lorem Ipsum.</p>

              <a href="#!" className="vc wf hg mb">
                <span className="tc wf xf be dd rg i gh ua">
                  <span className="nf h vc yc vd rg gh qk -ud-z-1"></span>
                  <img src="/images/icon-play.svg" alt="Play" />
                </span>
                <span className="kk">SEE HOW WE WORK</span>
              </a>
            </div>
          </div>
        </div>
      </section>
      {/* ===== About End ===== */}

      {/* ===== Team Start ===== */}
      <section className="i pg ji gp uq">
        {/* Bg Shapes */}
        <span className="rc h s r vd fd/5 fh rm"></span>
        <img src="/images/shape-08.svg" alt="Shape Bg" className="h q r" />
        <img src="/images/shape-09.svg" alt="Shape" className="of h y z/2" />
        <img src="/images/shape-10.svg" alt="Shape" className="h _ aa" />
        <img src="/images/shape-11.svg" alt="Shape" className="of h m ba" />

        {/* Section Title */}
        <div className="animate_top bb ze rj ki xn vq">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">Meet With Our Creative Dedicated Team</h2>
          <p className="bb on/5 wo/5 hq">Lorem ipsum dolor sit amet, consectetur adipiscing elit. In convallis tortor eros. Donec vitae tortor lacus. Phasellus aliquam ante in maximus.</p>
        </div>

        <div className="bb ze i va ki xn xq jb jo">
          <div className="wc qf pn xo gg cp">
            {/* Team Item 1 */}
            <div className="animate_top rj">
              <div className="c i pg z-1">
                <img className="vd" src="/images/team-01.png" alt="Team" />
                <div className="ef im nl il">
                  <span className="h -ud-left-5 -ud-bottom-21 rc de gd gh if wa"></span>
                  <span className="h s p rc vd hd mh va"></span>
                  <div className="h s p vd ij jj xa">
                    <ul className="tc xf wf gg">
                      <li><a href="#!"><svg className="uh vl ml il" width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.66634 10.25H8.74968L9.58301 6.91669H6.66634V5.25002C6.66634 4.39169 6.66634 3.58335 8.33301 3.58335H9.58301V0.783354C9.31134 0.74752 8.28551 0.666687 7.20218 0.666687C4.93968 0.666687 3.33301 2.04752 3.33301 4.58335V6.91669H0.833008V10.25H3.33301V17.3334H6.66634V10.25Z" fill="currentColor" /></svg></a></li>
                      <li><a href="#!"><svg className="uh vl ml il" width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.4683 1.71333C16.8321 1.99475 16.1574 2.17956 15.4666 2.26167C16.1947 1.82619 16.7397 1.14085 16.9999 0.333333C16.3166 0.74 15.5674 1.025 14.7866 1.17917C14.2621 0.617982 13.5669 0.245803 12.809 0.120487C12.0512 -0.00482822 11.2732 0.123742 10.596 0.486211C9.91875 0.848679 9.38024 1.42474 9.06418 2.12483C8.74812 2.82492 8.67221 3.60982 8.84825 4.3575C7.46251 4.28805 6.10686 3.92794 4.86933 3.30055C3.63179 2.67317 2.54003 1.79254 1.66492 0.715833C1.35516 1.24788 1.19238 1.85269 1.19326 2.46833C1.19326 3.67667 1.80826 4.74417 2.74326 5.36917C2.18993 5.35175 1.64878 5.20232 1.16492 4.93333V4.97667C1.16509 5.78142 1.44356 6.56135 1.95313 7.18422C2.46269 7.80709 3.17199 8.23456 3.96075 8.39417C3.4471 8.53337 2.90851 8.55388 2.38576 8.45417C2.60814 9.14686 3.04159 9.75267 3.62541 10.1868C4.20924 10.6209 4.9142 10.8615 5.64159 10.875C4.91866 11.4428 4.0909 11.8625 3.20566 12.1101C2.32041 12.3578 1.39503 12.4285 0.482422 12.3183C2.0755 13.3429 3.93 13.8868 5.82409 13.885C12.2349 13.885 15.7408 8.57417 15.7408 3.96833C15.7408 3.81833 15.7366 3.66667 15.7299 3.51833C16.4123 3.02514 17.0013 2.41418 17.4691 1.71417L17.4683 1.71333Z" fill="currentColor" /></svg></a></li>
                      <li><a href="#!"><svg className="uh vl ml il" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.78353 2.16665C3.78331 2.60867 3.6075 3.03251 3.29478 3.34491C2.98207 3.65732 2.55806 3.8327 2.11603 3.83248C1.674 3.83226 1.25017 3.65645 0.937761 3.34373C0.625357 3.03102 0.449975 2.60701 0.450196 2.16498C0.450417 1.72295 0.626223 1.29912 0.93894 0.986712C1.25166 0.674307 1.67567 0.498925 2.1177 0.499146C2.55972 0.499367 2.98356 0.675173 3.29596 0.98789C3.60837 1.30061 3.78375 1.72462 3.78353 2.16665V2.16665ZM3.83353 5.06665H0.500195V15.5H3.83353V5.06665ZM9.1002 5.06665H5.78353V15.5H9.06686V10.025C9.06686 6.97498 13.0419 6.69165 13.0419 10.025V15.5H16.3335V8.89165C16.3335 3.74998 10.4502 3.94165 9.06686 6.46665L9.1002 5.06665V5.06665Z" fill="currentColor" /></svg></a></li>
                    </ul>
                  </div>
                </div>
              </div>
              <h4 className="yj go kk wm ob zb">Olivia Andrium</h4>
              <p>Product Manager</p>
            </div>

            {/* Team Item 2 */}
            <div className="animate_top rj">
              <div className="c i pg z-1">
                <img className="vd" src="/images/team-02.png" alt="Team" />
                <div className="ef im nl il">
                  <span className="h -ud-left-5 -ud-bottom-21 rc de gd gh if wa"></span>
                  <span className="h s p rc vd hd mh va"></span>
                  <div className="h s p vd ij jj xa">
                    <ul className="tc xf wf gg">
                      <li><a href="#!"><svg className="uh vl ml il" width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.66634 10.25H8.74968L9.58301 6.91669H6.66634V5.25002C6.66634 4.39169 6.66634 3.58335 8.33301 3.58335H9.58301V0.783354C9.31134 0.74752 8.28551 0.666687 7.20218 0.666687C4.93968 0.666687 3.33301 2.04752 3.33301 4.58335V6.91669H0.833008V10.25H3.33301V17.3334H6.66634V10.25Z" fill="currentColor" /></svg></a></li>
                      <li><a href="#!"><svg className="uh vl ml il" width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.4683 1.71333C16.8321 1.99475 16.1574 2.17956 15.4666 2.26167C16.1947 1.82619 16.7397 1.14085 16.9999 0.333333C16.3166 0.74 15.5674 1.025 14.7866 1.17917C14.2621 0.617982 13.5669 0.245803 12.809 0.120487C12.0512 -0.00482822 11.2732 0.123742 10.596 0.486211C9.91875 0.848679 9.38024 1.42474 9.06418 2.12483C8.74812 2.82492 8.67221 3.60982 8.84825 4.3575C7.46251 4.28805 6.10686 3.92794 4.86933 3.30055C3.63179 2.67317 2.54003 1.79254 1.66492 0.715833C1.35516 1.24788 1.19238 1.85269 1.19326 2.46833C1.19326 3.67667 1.80826 4.74417 2.74326 5.36917C2.18993 5.35175 1.64878 5.20232 1.16492 4.93333V4.97667C1.16509 5.78142 1.44356 6.56135 1.95313 7.18422C2.46269 7.80709 3.17199 8.23456 3.96075 8.39417C3.4471 8.53337 2.90851 8.55388 2.38576 8.45417C2.60814 9.14686 3.04159 9.75267 3.62541 10.1868C4.20924 10.6209 4.9142 10.8615 5.64159 10.875C4.91866 11.4428 4.0909 11.8625 3.20566 12.1101C2.32041 12.3578 1.39503 12.4285 0.482422 12.3183C2.0755 13.3429 3.93 13.8868 5.82409 13.885C12.2349 13.885 15.7408 8.57417 15.7408 3.96833C15.7408 3.81833 15.7366 3.66667 15.7299 3.51833C16.4123 3.02514 17.0013 2.41418 17.4691 1.71417L17.4683 1.71333Z" fill="currentColor" /></svg></a></li>
                      <li><a href="#!"><svg className="uh vl ml il" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.78353 2.16665C3.78331 2.60867 3.6075 3.03251 3.29478 3.34491C2.98207 3.65732 2.55806 3.8327 2.11603 3.83248C1.674 3.83226 1.25017 3.65645 0.937761 3.34373C0.625357 3.03102 0.449975 2.60701 0.450196 2.16498C0.450417 1.72295 0.626223 1.29912 0.93894 0.986712C1.25166 0.674307 1.67567 0.498925 2.1177 0.499146C2.55972 0.499367 2.98356 0.675173 3.29596 0.98789C3.60837 1.30061 3.78375 1.72462 3.78353 2.16665V2.16665ZM3.83353 5.06665H0.500195V15.5H3.83353V5.06665ZM9.1002 5.06665H5.78353V15.5H9.06686V10.025C9.06686 6.97498 13.0419 6.69165 13.0419 10.025V15.5H16.3335V8.89165C16.3335 3.74998 10.4502 3.94165 9.06686 6.46665L9.1002 5.06665V5.06665Z" fill="currentColor" /></svg></a></li>
                    </ul>
                  </div>
                </div>
              </div>
              <h4 className="yj go kk wm ob zb">Jemse Kemorun</h4>
              <p>Product Designer</p>
            </div>

            {/* Team Item 3 */}
            <div className="animate_top rj">
              <div className="c i pg z-1">
                <img className="vd" src="/images/team-03.png" alt="Team" />
                <div className="ef im nl il">
                  <span className="h -ud-left-5 -ud-bottom-21 rc de gd gh if wa"></span>
                  <span className="h s p rc vd hd mh va"></span>
                  <div className="h s p vd ij jj xa">
                    <ul className="tc xf wf gg">
                      <li><a href="#!"><svg className="uh vl ml il" width="10" height="18" viewBox="0 0 10 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.66634 10.25H8.74968L9.58301 6.91669H6.66634V5.25002C6.66634 4.39169 6.66634 3.58335 8.33301 3.58335H9.58301V0.783354C9.31134 0.74752 8.28551 0.666687 7.20218 0.666687C4.93968 0.666687 3.33301 2.04752 3.33301 4.58335V6.91669H0.833008V10.25H3.33301V17.3334H6.66634V10.25Z" fill="currentColor" /></svg></a></li>
                      <li><a href="#!"><svg className="uh vl ml il" width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.4683 1.71333C16.8321 1.99475 16.1574 2.17956 15.4666 2.26167C16.1947 1.82619 16.7397 1.14085 16.9999 0.333333C16.3166 0.74 15.5674 1.025 14.7866 1.17917C14.2621 0.617982 13.5669 0.245803 12.809 0.120487C12.0512 -0.00482822 11.2732 0.123742 10.596 0.486211C9.91875 0.848679 9.38024 1.42474 9.06418 2.12483C8.74812 2.82492 8.67221 3.60982 8.84825 4.3575C7.46251 4.28805 6.10686 3.92794 4.86933 3.30055C3.63179 2.67317 2.54003 1.79254 1.66492 0.715833C1.35516 1.24788 1.19238 1.85269 1.19326 2.46833C1.19326 3.67667 1.80826 4.74417 2.74326 5.36917C2.18993 5.35175 1.64878 5.20232 1.16492 4.93333V4.97667C1.16509 5.78142 1.44356 6.56135 1.95313 7.18422C2.46269 7.80709 3.17199 8.23456 3.96075 8.39417C3.4471 8.53337 2.90851 8.55388 2.38576 8.45417C2.60814 9.14686 3.04159 9.75267 3.62541 10.1868C4.20924 10.6209 4.9142 10.8615 5.64159 10.875C4.91866 11.4428 4.0909 11.8625 3.20566 12.1101C2.32041 12.3578 1.39503 12.4285 0.482422 12.3183C2.0755 13.3429 3.93 13.8868 5.82409 13.885C12.2349 13.885 15.7408 8.57417 15.7408 3.96833C15.7408 3.81833 15.7366 3.66667 15.7299 3.51833C16.4123 3.02514 17.0013 2.41418 17.4691 1.71417L17.4683 1.71333Z" fill="currentColor" /></svg></a></li>
                      <li><a href="#!"><svg className="uh vl ml il" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.78353 2.16665C3.78331 2.60867 3.6075 3.03251 3.29478 3.34491C2.98207 3.65732 2.55806 3.8327 2.11603 3.83248C1.674 3.83226 1.25017 3.65645 0.937761 3.34373C0.625357 3.03102 0.449975 2.60701 0.450196 2.16498C0.450417 1.72295 0.626223 1.29912 0.93894 0.986712C1.25166 0.674307 1.67567 0.498925 2.1177 0.499146C2.55972 0.499367 2.98356 0.675173 3.29596 0.98789C3.60837 1.30061 3.78375 1.72462 3.78353 2.16665V2.16665ZM3.83353 5.06665H0.500195V15.5H3.83353V5.06665ZM9.1002 5.06665H5.78353V15.5H9.06686V10.025C9.06686 6.97498 13.0419 6.69165 13.0419 10.025V15.5H16.3335V8.89165C16.3335 3.74998 10.4502 3.94165 9.06686 6.46665L9.1002 5.06665V5.06665Z" fill="currentColor" /></svg></a></li>
                    </ul>
                  </div>
                </div>
              </div>
              <h4 className="yj go kk wm ob zb">Avi Pestarica</h4>
              <p>Web Designer</p>
            </div>
          </div>
        </div>
      </section>
      {/* ===== Team End ===== */}

      {/* ===== Services Start ===== */}
      <section className="lj tp kr">
        {/* Section Title */}
        <div className="animate_top bb ze rj ki xn vq">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">We Offer The Best Quality Service for You</h2>
          <p className="bb on/5 wo/5 hq">Lorem ipsum dolor sit amet, consectetur adipiscing elit. In convallis tortor eros. Donec vitae tortor lacus. Phasellus aliquam ante in maximus.</p>
        </div>

        <div className="bb ze ki xn yq mb en">
          <div className="wc qf pn xo ng">
            <div className="animate_top sg oi pi zq ml il am cn _m">
              <img src="/images/icon-04.svg" alt="Icon" />
              <h4 className="ek zj kk wm nb _b">Crafted for Startups</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In convallis tortor.</p>
            </div>

            <div className="animate_top sg oi pi zq ml il am cn _m">
              <img src="/images/icon-05.svg" alt="Icon" />
              <h4 className="ek zj kk wm nb _b">High-quality Design</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In convallis tortor.</p>
            </div>

            <div className="animate_top sg oi pi zq ml il am cn _m">
              <img src="/images/icon-06.svg" alt="Icon" />
              <h4 className="ek zj kk wm nb _b">All Essential Sections</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In convallis tortor.</p>
            </div>

            <div className="animate_top sg oi pi zq ml il am cn _m">
              <img src="/images/icon-07.svg" alt="Icon" />
              <h4 className="ek zj kk wm nb _b">Speed Optimized</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In convallis tortor.</p>
            </div>

            <div className="animate_top sg oi pi zq ml il am cn _m">
              <img src="/images/icon-05.svg" alt="Icon" />
              <h4 className="ek zj kk wm nb _b">Fully Customizable</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In convallis tortor.</p>
            </div>

            <div className="animate_top sg oi pi zq ml il am cn _m">
              <img src="/images/icon-06.svg" alt="Icon" />
              <h4 className="ek zj kk wm nb _b">Regular Updates</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. In convallis tortor.</p>
            </div>
          </div>
        </div>
      </section>
      {/* ===== Services End ===== */}

      {/* ===== Pricing Table Start ===== */}
      <section className="i pg fh rm ji gp uq">
        {/* Bg Shapes */}
        <img src="/images/shape-06.svg" alt="Shape" className="h aa y" />
        <img src="/images/shape-03.svg" alt="Shape" className="h ca u" />
        <img src="/images/shape-07.svg" alt="Shape" className="h w da ee" />
        <img src="/images/shape-12.svg" alt="Shape" className="h p s" />
        <img src="/images/shape-13.svg" alt="Shape" className="h r q" />

        {/* Section Title */}
        <div className="animate_top bb ze rj ki xn vq">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">We Offer Great Affordable Premium Prices.</h2>
          <p className="bb on/5 wo/5 hq">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using.</p>
        </div>

        {/* Pricing switcher */}
        <div className="tc wf xf jb og">
          <span className="ek kk wm">Bill Monthly</span>
          <button className="i rg gm" onClick={() => setBillPlan(billPlan === 'monthly' ? 'annually' : 'monthly')}>
            <div className="fe id bl gh rg xk outline-none"></div>
            <div className={`h vc wf xf ge jd cl jl ml mf hh rg yk ea fa ${billPlan === 'monthly' ? 'ff' : 'gf'}`}></div>
          </button>
          <span className="ek kk wm">Bill Annually</span>
        </div>

        {/* Pricing Table */}
        <div className="bb ze i va ki xn yq bc">
          <div className="wc qf pn xo jg">
            {plans.map((plan, i) => (
              <div key={i} className="animate_top rj sg hh sm vk xm hi nj oj">
                <h4 className="wj kk wm fb">{plan.name}</h4>
                <div className="tc wf xf kg cc">
                  <h2 className={`fk _j kk wm ${plan.name === 'Basic' ? 'text-green-500' : ''}`}>
                    ${billPlan === 'monthly' ? plan.price.monthly : plan.price.annually}
                  </h2>
                  <span className="sc ak kk wm">{billPlan === 'monthly' ? '/per month' : '/per year'}</span>
                </div>
                <p className="ur dc">No credit card required</p>
                <a href="#!" className={`ek rg lk ml il gi ri ${plan.name === 'Growth Plan' ? 'gh sl' : 'mh tl'}`}>
                  Try for free
                </a>
                <ul className="tc sf bg ob fb">
                  {plan.features.map((feature, j) => (
                    <li key={j}>{feature}</li>
                  ))}
                </ul>
                <p className="kk wm">7-day free trial</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* ===== Pricing Table End ===== */}

      {/* ===== Projects Start ===== */}
      <section className="pg pj vp mr oj wp nr">
        {/* Section Title */}
        <div className="animate_top bb ze rj ki xn vq">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">We Offer Great Affordable Premium Prices.</h2>
          <p className="bb on/5 wo/5 hq">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using.</p>
        </div>

        <div className="bb ze ki xn 2xl:ud-px-0 jb">
          {/* Porject Tab */}
          <div className="projects-tab _e bb tc uf wf xf cg rg hh rm vk xm si ti fc">
            <button onClick={() => setFilterTab(1)} className={`project-tab-btn ek rg ml il vi mi ${filterTab === 1 ? 'gh lk' : ''}`}>All</button>
            <button onClick={() => setFilterTab(2)} className={`project-tab-btn ek rg ml il vi mi ${filterTab === 2 ? 'gh lk' : ''}`}>Branding Strategy</button>
            <button onClick={() => setFilterTab(3)} className={`project-tab-btn ek rg ml il vi mi ${filterTab === 3 ? 'gh lk' : ''}`}>Digital Experiences</button>
            <button onClick={() => setFilterTab(4)} className={`project-tab-btn ek rg ml il vi mi ${filterTab === 4 ? 'gh lk' : ''}`}>Ecommerce</button>
          </div>

          {/* Projects item wrapper */}
          <div className="projects-wrapper tc -ud-mx-5 mt-10">
            <div className="project-sizer"></div>

            {/* Project Item 1 */}
            {(filterTab === 1 || filterTab === 2 || filterTab === 4) && (
              <div className="project-item wi fb vd jn/2 to/3 branding ecommerce">
                <div className="c i pg sg z-1">
                  <img src="/images/project-01.png" alt="Project" />

                  <div className="h s r df nl kl im tc sf wf xf vd yc sg al hh/20 z-10">
                    <h4 className="ek tj kk hc">Photo Retouching</h4>
                    <p>Branded Ecommerce</p>
                    <a className="c tc wf xf ie ld rg _g dh ml il ph jm km jc" href="#!">
                      <svg className="th lm ml il" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.4763 6.16664L6.00634 1.69664L7.18467 0.518311L13.6663 6.99998L7.18467 13.4816L6.00634 12.3033L10.4763 7.83331H0.333008V6.16664H10.4763Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Project Item 2 */}
            {(filterTab === 1 || filterTab === 3) && (
              <div className="project-item wi fb vd jn/2 to/3 digital">
                <div className="c i pg sg z-1">
                  <img src="/images/project-02.png" alt="Project" />

                  <div className="h s r df nl kl im tc sf wf xf vd yc sg al hh/20 z-10">
                    <h4 className="ek tj kk hc">Photo Retouching</h4>
                    <p>Branded Ecommerce</p>
                    <a className="c tc wf xf ie ld rg _g dh ml il ph jm km jc" href="#!">
                      <svg className="th lm ml il" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.4763 6.16664L6.00634 1.69664L7.18467 0.518311L13.6663 6.99998L7.18467 13.4816L6.00634 12.3033L10.4763 7.83331H0.333008V6.16664H10.4763Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Project Item 4 */}
            {(filterTab === 1 || filterTab === 2 || filterTab === 4) && (
              <div className="project-item wi fb vd jn/2 to/3 branding ecommerce">
                <div className="c i pg sg z-1">
                  <img src="/images/project-04.png" alt="Project" />

                  <div className="h s r df nl kl im tc sf wf xf vd yc sg al hh/20 z-10">
                    <h4 className="ek tj kk hc">Photo Retouching</h4>
                    <p>Branded Ecommerce</p>
                    <a className="c tc wf xf ie ld rg _g dh ml il ph jm km jc" href="#!">
                      <svg className="th lm ml il" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.4763 6.16664L6.00634 1.69664L7.18467 0.518311L13.6663 6.99998L7.18467 13.4816L6.00634 12.3033L10.4763 7.83331H0.333008V6.16664H10.4763Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Project Item 3 */}
            {(filterTab === 1 || filterTab === 3 || filterTab === 4) && (
              <div className="project-item wi fb vd vo/3 digital ecommerce">
                <div className="c i pg sg z-1">
                  <img src="/images/project-03.png" alt="Project" />

                  <div className="h s r df nl kl im tc sf wf xf vd yc sg al hh/20 z-10">
                    <h4 className="ek tj kk hc">Photo Retouching</h4>
                    <p>Branded Ecommerce</p>
                    <a className="c tc wf xf ie ld rg _g dh ml il ph jm km jc" href="#!">
                      <svg className="th lm ml il" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.4763 6.16664L6.00634 1.69664L7.18467 0.518311L13.6663 6.99998L7.18467 13.4816L6.00634 12.3033L10.4763 7.83331H0.333008V6.16664H10.4763Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
      {/* ===== Projects End ===== */}

      {/* ===== Testimonials Start ===== */}
      <section className="hj rp hr">
        <div className="animate_top bb ze rj ki xn vq">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">Client’s Testimonials</h2>
          <p className="bb on/5 wo/5 hq">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using.</p>
        </div>

        <div className="bb ze ki xn ar">
          <div className="animate_top jb cq">
            <Swiper
              modules={[Navigation]}
              navigation={{
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
              }}
              loop={true}
              className="testimonial-01"
            >
              <SwiperSlide>
                <div className="i hh rm sg vk xm bi qj">
                  <span className="rc je md/2 gh xg h q r"></span>
                  <span className="rc je md/2 mh yg h q p"></span>

                  <div className="tc sf rn tn un zf dp">
                    <img className="bf" src="/images/testimonial.png" alt="User" />
                    <div>
                      <img src="/images/icon-quote.svg" alt="Quote" />
                      <p className="ek ik xj _p kc fb">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. In dolor diam, feugiat quis enim sed, ullamcorper semper ligula. Mauris consequat justo volutpat.
                      </p>
                      <div className="tc yf vf">
                        <div>
                          <span className="rc ek xj kk wm zb">Devid Smith</span>
                          <span className="rc">Founder @democompany</span>
                        </div>
                        <img className="rk" src="/images/brand-light-02.svg" alt="Brand" />
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
              
              <SwiperSlide>
                <div className="i hh rm sg vk xm bi qj">
                  <span className="rc je md/2 gh xg h q r"></span>
                  <span className="rc je md/2 mh yg h q p"></span>

                  <div className="tc sf rn tn un zf dp">
                    <img className="bf" src="/images/testimonial.png" alt="User" />
                    <div>
                      <img src="/images/icon-quote.svg" alt="Quote" />
                      <p className="ek ik xj _p kc fb">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. In dolor diam, feugiat quis enim sed, ullamcorper semper ligula. Mauris consequat justo volutpat.
                      </p>
                      <div className="tc yf vf">
                        <div>
                          <span className="rc ek xj kk wm zb">Jhon Abraham</span>
                          <span className="rc">Founder @democompany</span>
                        </div>
                        <img className="rk" src="/images/brand-light-02.svg" alt="Brand" />
                      </div>
                    </div>
                  </div>
                </div>
              </SwiperSlide>

              <div className="tc wf xf fg jb">
                <div className="swiper-button-prev c tc wf xf ie ld rg _g dh pf ml vr hh rm tl zm rl ym cursor-pointer">
                  <svg className="th lm" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3.52366 7.83336L7.99366 12.3034L6.81533 13.4817L0.333663 7.00002L6.81533 0.518357L7.99366 1.69669L3.52366 6.16669L13.667 6.16669L13.667 7.83336L3.52366 7.83336Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="swiper-button-next c tc wf xf ie ld rg _g dh pf ml vr hh rm tl zm rl ym cursor-pointer">
                  <svg className="th lm" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.4763 6.16664L6.00634 1.69664L7.18467 0.518311L13.6663 6.99998L7.18467 13.4816L6.00634 12.3033L10.4763 7.83331H0.333008V6.16664H10.4763Z" fill="currentColor" />
                  </svg>
                </div>
              </div>
            </Swiper>
          </div>
        </div>
      </section>
      {/* ===== Testimonials End ===== */}

      {/* ===== Counter Start ===== */}
      <section className="i pg qh rm ji hp">
        <img src="/images/shape-11.svg" alt="Shape" className="of h ga ha ke" />
        <img src="/images/shape-07.svg" alt="Shape" className="h ia o ae jf" />
        <img src="/images/shape-14.svg" alt="Shape" className="h ja ka" />
        <img src="/images/shape-15.svg" alt="Shape" className="h q p" />

        <div className="bb ze i va ki xn br">
          <div className="tc uf sn tn xf un gg">
            <div className="animate_top me/5 ln rj">
              <h2 className="gk vj zp or kk wm hc">785</h2>
              <p className="ek bk aq">Global Brands</p>
            </div>
            <div className="animate_top me/5 ln rj">
              <h2 className="gk vj zp or kk wm hc">533</h2>
              <p className="ek bk aq">Happy Clients</p>
            </div>
            <div className="animate_top me/5 ln rj">
              <h2 className="gk vj zp or kk wm hc">865</h2>
              <p className="ek bk aq">Winning Award</p>
            </div>
            <div className="animate_top me/5 ln rj">
              <h2 className="gk vj zp or kk wm hc">346</h2>
              <p className="ek bk aq">Happy Clients</p>
            </div>
          </div>
        </div>
      </section>
      {/* ===== Counter End ===== */}

      {/* ===== Clients Start ===== */}
      <section className="pj vp mr">
        {/* Section Title */}
        <div className="animate_top bb ze rj ki xn vq">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">Trusted by Global Brands</h2>
          <p className="bb on/5 wo/5 hq">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using.</p>
        </div>

        <div className="bb ze ah ch pm hj xp ki xn 2xl:ud-px-49 bc">
          <div className="wc rf qn zf cp kq xf wf">
            <a href="#!" className="rc animate_top">
              <img className="th wl ml il zl om" src="/images/brand-light-01.svg" alt="Clients" />
              <img className="xc sk ml il zl nm" src="/images/brand-dark-01.svg" alt="Clients" />
            </a>
            <a href="#!" className="rc animate_top">
              <img className="tk ml il zl om" src="/images/brand-light-02.svg" alt="Clients" />
              <img className="xc sk ml il zl nm" src="/images/brand-dark-02.svg" alt="Clients" />
            </a>
            <a href="#!" className="rc animate_top">
              <img className="tk ml il zl om" src="/images/brand-light-03.svg" alt="Clients" />
              <img className="xc sk ml il zl nm" src="/images/brand-dark-03.svg" alt="Clients" />
            </a>
            <a href="#!" className="rc animate_top">
              <img className="tk ml il zl om" src="/images/brand-light-04.svg" alt="Clients" />
              <img className="xc sk ml il zl nm" src="/images/brand-dark-04.svg" alt="Clients" />
            </a>
            <a href="#!" className="rc animate_top">
              <img className="tk ml il zl om" src="/images/brand-light-05.svg" alt="Clients" />
              <img className="xc sk ml il zl nm" src="/images/brand-dark-05.svg" alt="Clients" />
            </a>
            <a href="#!" className="rc animate_top">
              <img className="tk ml il zl om" src="/images/brand-light-06.svg" alt="Clients" />
              <img className="xc sk ml il zl nm" src="/images/brand-dark-06.svg" alt="Clients" />
            </a>
          </div>
        </div>
      </section>
      {/* ===== Clients End ===== */}

      {/* ===== Blog Start ===== */}
      <section className="ji gp uq">
        {/* Section Title */}
        <div className="animate_top bb ze rj ki xn vq">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">Latest Blogs &amp; News</h2>
          <p className="bb on/5 wo/5 hq">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using.</p>
        </div>

        <div className="bb ye ki xn vq jb jo">
          <div className="wc qf pn xo zf iq">
            <div className="animate_top sg vk rm xm">
              <div className="c rc i z-1 pg">
                <img className="w-full" src="/images/blog-01.png" alt="Blog" />
                <div className="im h r s df vd yc wg tc wf xf al hh/20 nl il z-10">
                  <Link to="/blog-single" className="vc ek rg lk gh sl ml il gi hi">Read More</Link>
                </div>
              </div>
              <div className="yh">
                <div className="tc uf wf ag jq">
                  <div className="tc wf ag">
                    <img src="/images/icon-man.svg" alt="User" />
                    <p>Musharof Chy</p>
                  </div>
                  <div className="tc wf ag">
                    <img src="/images/icon-calender.svg" alt="Calender" />
                    <p>25 Dec, 2025</p>
                  </div>
                </div>
                <h4 className="ek tj ml il kk wm xl eq lb">
                  <Link to="/blog-single">Free advertising for your online business</Link>
                </h4>
              </div>
            </div>

            <div className="animate_top sg vk rm xm">
              <div className="c rc i z-1 pg">
                <img className="w-full" src="/images/blog-02.png" alt="Blog" />
                <div className="im h r s df vd yc wg tc wf xf al hh/20 nl il z-10">
                  <Link to="/blog-single" className="vc ek rg lk gh sl ml il gi hi">Read More</Link>
                </div>
              </div>
              <div className="yh">
                <div className="tc uf wf ag jq">
                  <div className="tc wf ag">
                    <img src="/images/icon-man.svg" alt="User" />
                    <p>Musharof Chy</p>
                  </div>
                  <div className="tc wf ag">
                    <img src="/images/icon-calender.svg" alt="Calender" />
                    <p>25 Dec, 2025</p>
                  </div>
                </div>
                <h4 className="ek tj ml il kk wm xl eq lb">
                  <Link to="/blog-single">9 simple ways to improve your design skills</Link>
                </h4>
              </div>
            </div>

            <div className="animate_top sg vk rm xm">
              <div className="c rc i z-1 pg">
                <img className="w-full" src="/images/blog-03.png" alt="Blog" />
                <div className="im h r s df vd yc wg tc wf xf al hh/20 nl il z-10">
                  <Link to="/blog-single" className="vc ek rg lk gh sl ml il gi hi">Read More</Link>
                </div>
              </div>
              <div className="yh">
                <div className="tc uf wf ag jq">
                  <div className="tc wf ag">
                    <img src="/images/icon-man.svg" alt="User" />
                    <p>Musharof Chy</p>
                  </div>
                  <div className="tc wf ag">
                    <img src="/images/icon-calender.svg" alt="Calender" />
                    <p>25 Dec, 2025</p>
                  </div>
                </div>
                <h4 className="ek tj ml il kk wm xl eq lb">
                  <Link to="/blog-single">Tips to quickly improve your coding speed.</Link>
                </h4>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ===== Blog End ===== */}

      {/* ===== Contact Start ===== */}
      <section id="support" className="i pg fh rm ji gp uq">
        {/* Bg Shapes */}
        <img src="/images/shape-06.svg" alt="Shape" className="h aa y" />
        <img src="/images/shape-03.svg" alt="Shape" className="h ca u" />
        <img src="/images/shape-07.svg" alt="Shape" className="h w da ee" />
        <img src="/images/shape-12.svg" alt="Shape" className="h p s" />
        <img src="/images/shape-13.svg" alt="Shape" className="h r q" />

        {/* Section Title */}
        <div className="animate_top bb ze rj ki xn vq">
          <h2 className="fk vj pr kk wm on/5 gq/2 bb _b">Let's Stay Connected</h2>
          <p className="bb on/5 wo/5 hq">It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using.</p>
        </div>

        <div className="i va bb ye ki xn wq jb mo">
          <div className="tc uf sn tf rn un zf xl:gap-10">
            <div className="animate_top w-full mn/5 to/3 vk sg hh sm yh rq i pg">
              {/* Bg Shapes */}
              <img src="/images/shape-03.svg" alt="Shape" className="h la x wd" />
              <img src="/images/shape-06.svg" alt="Shape" className="h la ma ne kf" />

              <div className="fb">
                <h4 className="wj kk wm cc">Email Address</h4>
                <p><a href="#!">support@startup.com</a></p>
              </div>
              <div className="fb">
                <h4 className="wj kk wm cc">Office Location</h4>
                <p>76/A, Green valle, Califonia USA.</p>
              </div>
              <div className="fb">
                <h4 className="wj kk wm cc">Phone Number</h4>
                <p><a href="#!">+009 8754 3433 223</a></p>
              </div>
              <div className="fb">
                <h4 className="wj kk wm cc">Skype Email</h4>
                <p><a href="#!">example@yourmail.com</a></p>
              </div>

              <span className="rc nd rh tm lc fb"></span>

              <div>
                <h4 className="wj kk wm qb">Social Media</h4>
                <ul className="tc wf fg">
                  <li><a href="#!" className="c tc wf xf ie ld rg ml il tl"><svg className="th lm ml il" width="11" height="20" viewBox="0 0 11 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.83366 11.3752H9.12533L10.042 7.7085H6.83366V5.87516C6.83366 4.931 6.83366 4.04183 8.667 4.04183H10.042V0.96183C9.74316 0.922413 8.61475 0.833496 7.42308 0.833496C4.93433 0.833496 3.16699 2.35241 3.16699 5.14183V7.7085H0.416992V11.3752H3.16699V19.1668H6.83366V11.3752Z" fill="currentColor" /></svg></a></li>
                  <li><a href="#!" className="c tc wf xf ie ld rg ml il tl"><svg className="th lm ml il" width="20" height="16" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19.3153 2.18484C18.6155 2.4944 17.8733 2.6977 17.1134 2.78801C17.9144 2.30899 18.5138 1.55511 18.8001 0.666844C18.0484 1.11418 17.2244 1.42768 16.3654 1.59726C15.7885 0.979958 15.0238 0.57056 14.1901 0.432713C13.3565 0.294866 12.5007 0.436294 11.7558 0.835009C11.0108 1.23372 10.4185 1.86739 10.0708 2.63749C9.72313 3.40759 9.63963 4.27098 9.83327 5.09343C8.30896 5.01703 6.81775 4.62091 5.45645 3.93079C4.09516 3.24067 2.89423 2.27197 1.93161 1.08759C1.59088 1.67284 1.41182 2.33814 1.41278 3.01534C1.41278 4.34451 2.08928 5.51876 3.11778 6.20626C2.50912 6.1871 1.91386 6.02273 1.38161 5.72685V5.77451C1.38179 6.65974 1.68811 7.51766 2.24864 8.20282C2.80916 8.88797 3.58938 9.3582 4.45703 9.53376C3.89201 9.68688 3.29956 9.70945 2.72453 9.59976C2.96915 10.3617 3.44595 11.0281 4.08815 11.5056C4.73035 11.9831 5.50581 12.2478 6.30594 12.2627C5.51072 12.8872 4.60019 13.3489 3.62642 13.6213C2.65264 13.8938 1.63473 13.9716 0.630859 13.8503C2.38325 14.9773 4.4232 15.5756 6.50669 15.5737C13.5586 15.5737 17.415 9.73176 17.415 4.66535C17.415 4.50035 17.4104 4.33351 17.4031 4.17035C18.1537 3.62783 18.8016 2.95578 19.3162 2.18576L19.3153 2.18484Z" fill="currentColor" /></svg></a></li>
                  <li><a href="#!" className="c tc wf xf ie ld rg ml il tl"><svg className="th lm ml il" width="19" height="18" viewBox="0 0 19 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.36198 2.58327C4.36174 3.0695 4.16835 3.53572 3.82436 3.87937C3.48037 4.22301 3.01396 4.41593 2.52773 4.41569C2.0415 4.41545 1.57528 4.22206 1.23164 3.87807C0.887991 3.53408 0.69507 3.06767 0.695313 2.58144C0.695556 2.09521 0.888943 1.62899 1.23293 1.28535C1.57692 0.941701 2.04333 0.748781 2.52956 0.749024C3.01579 0.749267 3.48201 0.942654 3.82566 1.28664C4.1693 1.63063 4.36222 2.09704 4.36198 2.58327ZM4.41698 5.77327H0.750313V17.2499H4.41698V5.77327ZM10.2103 5.77327H6.56198V17.2499H10.1736V11.2274C10.1736 7.87244 14.5461 7.56077 14.5461 11.2274V17.2499H18.167V9.98077C18.167 4.32494 11.6953 4.53577 10.1736 7.31327L10.2103 5.77327Z" fill="currentColor" /></svg></a></li>
                </ul>
              </div>
            </div>

            <div className="animate_top w-full nn/5 vo/3 vk sg hh sm yh tq">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="tc sf yo ap zf ep qb">
                  <div className="vd to/2">
                    <label className="rc ac" htmlFor="fullname">Full name</label>
                    <input type="text" name="fullname" id="fullname" placeholder="Devid Wonder"
                      className="vd ph sg zk xm _g ch pm hm dm dn em pl/50 xi mi" />
                  </div>

                  <div className="vd to/2">
                    <label className="rc ac" htmlFor="email">Email address</label>
                    <input type="email" name="email" id="email" placeholder="example@gmail.com"
                      className="vd ph sg zk xm _g ch pm hm dm dn em pl/50 xi mi" />
                  </div>
                </div>

                <div className="tc sf yo ap zf ep qb">
                  <div className="vd to/2">
                    <label className="rc ac" htmlFor="phone">Phone number</label>
                    <input type="text" name="phone" id="phone" placeholder="+009 3342 3432"
                      className="vd ph sg zk xm _g ch pm hm dm dn em pl/50 xi mi" />
                  </div>

                  <div className="vd to/2">
                    <label className="rc ac" htmlFor="subject">Subject</label>
                    <input type="text" name="subject" id="subject" placeholder="Type your subject"
                      className="vd ph sg zk xm _g ch pm hm dm dn em pl/50 xi mi" />
                  </div>
                </div>

                <div className="fb">
                  <label className="rc ac" htmlFor="message">Message</label>
                  <textarea placeholder="Message" rows={4} name="message" id="message"
                    className="vd ph sg zk xm _g ch pm hm dm dn em pl/50 ci"></textarea>
                </div>

                <div className="tc xf">
                  <button className="vc rg lk gh ml il hi gi _l">Send Message</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
      {/* ===== Contact End ===== */}

      {/* ===== CTA Start ===== */}
      <section className="i pg gh ji">
        {/* Bg Shape */}
        <img className="h p q" src="/images/shape-16.svg" alt="Bg Shape" />

        <div className="bb ye i z-10 ki xn dr">
          <div className="tc uf sn tn un gg">
            <div className="animate_left to/2">
              <h2 className="fk vj zp pr lk ac">
                Join with 5000+ Startups Growing with Base.
              </h2>
              <p className="lk">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc quis nibh lorem. Duis sed odio lorem. In a
                efficitur leo. Ut venenatis rhoncus.
              </p>
            </div>
            <div className="animate_right bf">
              <a href="#!" className="vc ek kk hh rg ol il cm gi hi">
                Get Started Now
              </a>
            </div>
          </div>
        </div>
      </section>
      {/* ===== CTA End ===== */}
    </main>
  );
};
