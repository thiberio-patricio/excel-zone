import { ReactNode, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

interface PageTransitionProps {
  /** Change this value to replay the transition (route or section id). */
  transitionKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * Barba-style page/section transition for the SPA.
 * Fades and lifts content whenever `transitionKey` changes.
 */
export function PageTransition({ transitionKey, children, className }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 18, filter: "blur(6px)" },
        {
          autoAlpha: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.55,
          ease: "power3.out",
          clearProps: "filter,transform",
        }
      );
    }, el);

    return () => ctx.revert();
  }, [transitionKey]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export default PageTransition;
