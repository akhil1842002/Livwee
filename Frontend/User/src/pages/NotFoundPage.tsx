import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <main>
      <section className="i pg fh rm ej np er fj op fr">
        {/* Bg Shapes */}
        <img src="/images/shape-06.svg" alt="Shape" className="h j k" />
        <img src="/images/shape-03.svg" alt="Shape" className="h l m" />
        <img src="/images/shape-17.svg" alt="Shape" className="h n o" />
        <img src="/images/shape-18.svg" alt="Shape" className="h p q" />

        <div className="animate_top bb xe rj">
          <img src="/images/404.svg" alt="404" className="bb fb" />

          <h2 className="ek tj eo kk wm gb">Sorry, the page can’t be found</h2>
          <p className="hb">The page you were looking for appears to have been moved, deleted or does not exist.</p>

          <Link to="/" className="ek vc rg gh lk ml il _l gi hi">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
  );
};
