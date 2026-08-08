import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Mounts once, for the lifetime of the app. Drives Lenis inertia-smoothed scrolling,
// keeps GSAP's ScrollTrigger in sync with it, recomputes the existing --scroll-progress
// CSS var (used to crossfade the hero into the shader gradient), and batches a fade/slide-up
// reveal for any [data-reveal] element as it enters the viewport - re-run on every route
// change since HashRouter swaps page content without a real navigation/reload.
export default function ScrollExperience() {
  const location = useLocation();
  const lenisRef = useRef(null);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    const updateScrollProgress = () => {
      const heroEl = document.querySelector('.hero-video-stage');
      const root = document.documentElement;

      if (!heroEl) {
        root.style.setProperty('--scroll-progress', '1');
        return;
      }

      const heroHeight = heroEl.offsetHeight || window.innerHeight;
      const progress = Math.min(window.scrollY / (heroHeight * 0.85), 1);
      root.style.setProperty('--scroll-progress', String(Math.max(0, progress)));
    };

    lenis.on('scroll', () => {
      ScrollTrigger.update();
      updateScrollProgress();
    });

    const tickerCallback = (time) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tickerCallback);
    gsap.ticker.lagSmoothing(0);

    updateScrollProgress();
    window.addEventListener('resize', updateScrollProgress);

    return () => {
      gsap.ticker.remove(tickerCallback);
      window.removeEventListener('resize', updateScrollProgress);
      lenis.destroy();
    };
  }, []);

  // Runs before paint so hidden-state elements never flash visible first
  useLayoutEffect(() => {
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    lenisRef.current?.scrollTo(0, { immediate: true });

    const targets = gsap.utils.toArray('[data-reveal]');
    if (targets.length === 0) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(targets, { opacity: 0, y: 28 });

    ScrollTrigger.batch(targets, {
      start: 'top 88%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          stagger: 0.12,
          overwrite: true,
        }),
    });

    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  return null;
}
