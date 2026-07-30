import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

type RevealOptions = {
  y?: number;
  delay?: number;
  duration?: number;
  /** Stagger direct children instead of animating the element itself */
  stagger?: number;
  scale?: number;
};

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * GSAP entrance reveal. Returns a ref to attach to the target element.
 */
export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {},
  deps: unknown[] = []
) {
  const ref = useRef<T>(null);
  const { y = 24, delay = 0, duration = 0.7, stagger, scale } = options;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      gsap.set(el, { clearProps: "all" });
      return;
    }

    const ctx = gsap.context(() => {
      const targets = stagger ? Array.from(el.children) : el;
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y, ...(scale ? { scale } : {}) },
        {
          autoAlpha: 1,
          y: 0,
          ...(scale ? { scale: 1 } : {}),
          duration,
          delay,
          ease: "power3.out",
          stagger: stagger ?? 0,
          clearProps: "transform",
        }
      );
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/** Animate a number from 0 to `value` — great for KPI counters. */
export function useGsapCounter(
  value: number,
  format: (n: number) => string,
  duration = 1.1
) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedMotion()) {
      el.textContent = format(value);
      return;
    }
    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: value,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = format(obj.n);
      },
    });
    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return ref;
}

export default useGsapReveal;
