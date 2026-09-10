import { useEffect, useRef } from 'react';

/**
 * Hook that observes elements with animate_top, animate_left, animate_right
 * classes and reveals them on scroll (replicating the Alpine.js x-intersect
 * behavior from the original Base Tailwind template).
 */
export function useScrollAnimations() {
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const root = containerRef.current || document;

    const elements = root.querySelectorAll(
      '.animate_top, .animate_left, .animate_right'
    );

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate_visible');
            observer.unobserve(entry.target); // only animate once
          }
        });
      },
      {
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.15,
      }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return containerRef;
}

/**
 * Standalone initializer – call once from a top-level useEffect to observe
 * the whole document (useful when elements mount after first render).
 */
export function initScrollAnimations() {
  const elements = document.querySelectorAll(
    '.animate_top, .animate_left, .animate_right'
  );

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate_visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.15,
    }
  );

  elements.forEach((el) => observer.observe(el));

  return () => observer.disconnect();
}
