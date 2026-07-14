import { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
  return (
    <div
      className={cn(
        "relative rounded-card border border-white/5 overflow-hidden animate-fade-in",
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
