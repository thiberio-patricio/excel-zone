import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { useGsapReveal } from "@/hooks/useGsapReveal";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({ icon: Icon, title, description, actions, eyebrow }: PageHeaderProps) {
  const ref = useGsapReveal<HTMLDivElement>({ y: 22, duration: 0.7 });

  return (
    <div ref={ref} className="relative overflow-hidden rounded-card border border-white/5 p-6 sm:p-7 mb-6"
      style={{
        background:
          "linear-gradient(135deg, hsl(0 42% 11% / 0.9), hsl(0 39% 15% / 0.7))",
        backdropFilter: "blur(14px) saturate(140%)",
        WebkitBackdropFilter: "blur(14px) saturate(140%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Subtle inner glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full opacity-40"
        style={{ background: "radial-gradient(closest-side, hsl(0 100% 52% / 0.25), transparent 70%)" }}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-2xl bg-gradient-primary blur-md opacity-60" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Icon className="h-6 w-6" />
            </div>
          </div>
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80 mb-1">
                {eyebrow}
              </div>
            )}
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground leading-tight tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
