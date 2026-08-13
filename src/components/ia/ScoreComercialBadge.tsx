import { ShieldAlert, ShieldCheck, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SCORE_CORES, type ScoreComercial } from "@/services/aiExecutiveEngine";
import { useAIExecutiveEngine } from "@/hooks/useAIExecutiveEngine";
import type { EngineScope } from "@/services/aiExecutiveEngine";

interface ScoreBadgeProps {
  score?: ScoreComercial | null;
  /** Quando informado, o badge calcula o próprio score via AIExecutiveEngine. */
  scope?: EngineScope;
  size?: "sm" | "md";
  showPontos?: boolean;
  className?: string;
}

/** Badge do Score Comercial (VERDE / AMARELO / LARANJA / VERMELHO). */
export function ScoreComercialBadge({
  score,
  scope,
  size = "md",
  showPontos = true,
  className,
}: ScoreBadgeProps) {
  const auto = useAIExecutiveEngine(scope ?? {}, !score && !!scope);
  const valor = score ?? auto.analise?.score ?? null;

  if (!valor) {
    if (!scope) return null;
    return (
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        Score
      </span>
    );
  }

  const cor = SCORE_CORES[valor.nivel];
  const Icon = valor.nivel === "VERDE" ? ShieldCheck : ShieldAlert;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border font-semibold uppercase tracking-[0.14em]",
              cor.bg,
              cor.border,
              cor.text,
              size === "sm" ? "px-2.5 py-1 text-[9px]" : "px-3 py-1.5 text-[10px]",
              className
            )}
          >
            <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            <span>Score {valor.rotulo}</span>
            {showPontos && <span className="opacity-70">{valor.pontos}</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[280px]">
          <p className="mb-1 font-semibold">
            Score Comercial: {valor.rotulo} — {valor.descricao}
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {valor.motivos.map((m, i) => (
              <li key={i}>• {m}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ScoreComercialBadge;
