import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
export let lenis: Lenis | null = null;

/** Smooth scroll (skipped under reduced motion) wired into ScrollTrigger. */
export function initScroll() {
  if (!reduced && !lenis) {
    lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.65, touchMultiplier: 0.8 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis!.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    // in-page anchors glide instead of jumping
    document.addEventListener("click", (e) => {
      const a = (e.target as HTMLElement).closest("a[href^='#']") as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("href")!.slice(1);
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      lenis!.scrollTo(el, { offset: 0, duration: 1.4 });
      history.replaceState(null, "", `#${id}`);
    });
  }
  return { gsap, ScrollTrigger };
}

export { gsap, ScrollTrigger };
