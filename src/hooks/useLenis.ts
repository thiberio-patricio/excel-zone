import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Smooth inertial scrolling (Lenis).
 * Pass a scroll container ref; defaults to the window.
 */
export function useLenis(wrapper?: React.RefObject<HTMLElement>) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = wrapper?.current ?? undefined;
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      ...(el ? { wrapper: el, content: (el.firstElementChild as HTMLElement) ?? el } : {}),
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [wrapper]);
}

export default useLenis;
