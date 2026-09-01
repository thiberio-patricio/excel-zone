import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KpiTone = "default" | "positive" | "negative" | "warn" | "premium";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: KpiTone;
  /** 0-100 — renders a progress bar at the bottom of the card. */
  progress?: number;
  children?: ReactNode;
  className?: string;
}

const GLOWS: Record<KpiTone, string> = {
  default: "from-primary/25",
  positive: "from-emerald-500/25",
  negative: "from-rose-500/25",
  warn: "from-amber-500/25",
  premium: "from-violet-500/25",
};

const ICON_TONES: Record<KpiTone, string> = {
  default: "bg-primary/15 text-primary",
  positive: "bg-emerald-500/15 text-emerald-400",
  negative: "bg-rose-500/15 text-rose-400",
  warn: "bg-amber-500/15 text-amber-400",
  premium: "bg-violet-500/15 text-violet-300",
};

/**
 * Standard premium KPI card used across the system (glass surface, glow,
 * icon chip, optional progress bar and hover lift).
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  progress,
  children,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "group relative flex h-full min-h-[150px] flex-col overflow-hidden rounded-card border border-white/5 p-5",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-glow",
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
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br to-transparent opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100",
          GLOWS[tone]
        )}
      />

      <div className="relative mb-3 flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase leading-snug tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10",
            ICON_TONES[tone]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="relative font-display text-xl font-bold tracking-tight text-foreground xl:text-2xl">
        {value}
      </div>

      {children}

      {typeof progress === "number" && (
        <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary via-primary-glow to-premium transition-all duration-700"
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}

      {hint && (
        <div className="relative mt-auto pt-3 text-[11px] leading-snug text-muted-foreground">
          {hint}
        </div>
      )}
    </div>
  );
}

export default KpiCard;
