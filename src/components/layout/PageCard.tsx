import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useGsapReveal } from "@/hooks/useGsapReveal";

interface PageCardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

/**
 * Standardized premium container used across every module.
 * Glass surface + subtle depth. Replaces default flat Card look.
 */
export function PageCard({ children, className, padded = true }: PageCardProps) {
  const ref = useGsapReveal<HTMLDivElement>({ y: 18, duration: 0.6, scale: 0.99 });

  return (
    <div
      ref={ref}
      className={cn(
        "relative rounded-card border border-white/5 overflow-hidden transition-shadow duration-300 hover:shadow-lg",
        padded && "p-5 sm:p-6",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, hsl(0 39% 15% / 0.85), hsl(0 42% 11% / 0.75))",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {children}
    </div>
  );
}
