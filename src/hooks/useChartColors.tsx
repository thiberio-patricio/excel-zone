import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ChartThemeId = "vermelho-preto" | "azul-ambar" | "verde-roxo";

export interface ChartTheme {
  id: ChartThemeId;
  label: string;
  vendidoStart: string;
  vendidoEnd: string;
  metaStart: string;
  metaEnd: string;
  // Cores sólidas (para gráficos que não usam gradiente)
  vendido: string;
  meta: string;
  percentual: string;
}

export const CHART_THEMES: Record<ChartThemeId, ChartTheme> = {
  "vermelho-preto": {
    id: "vermelho-preto",
    label: "Vermelho & Preto",
    vendidoStart: "hsl(0 85% 45%)",
    vendidoEnd: "hsl(0 85% 55%)",
    metaStart: "hsl(0 0% 20%)",
    metaEnd: "hsl(0 0% 35%)",
    vendido: "hsl(0 85% 50%)",
    meta: "hsl(0 0% 25%)",
    percentual: "hsl(45 90% 50%)",
  },
  "azul-ambar": {
    id: "azul-ambar",
    label: "Azul & Âmbar",
    vendidoStart: "hsl(215 90% 45%)",
    vendidoEnd: "hsl(215 90% 60%)",
    metaStart: "hsl(38 92% 45%)",
    metaEnd: "hsl(38 92% 58%)",
    vendido: "hsl(215 90% 50%)",
    meta: "hsl(38 92% 50%)",
  },
  "verde-roxo": {
    id: "verde-roxo",
    label: "Verde & Roxo",
    vendidoStart: "hsl(160 75% 38%)",
    vendidoEnd: "hsl(160 75% 50%)",
    metaStart: "hsl(265 70% 45%)",
    metaEnd: "hsl(265 70% 60%)",
    vendido: "hsl(160 75% 42%)",
    meta: "hsl(265 70% 52%)",
  },
};

const STORAGE_PREFIX = "chart-theme:";

function getStorageKey(userId?: string) {
  return `${STORAGE_PREFIX}${userId ?? "anon"}`;
}

export function useChartColors() {
  const [themeId, setThemeIdState] = useState<ChartThemeId>("vermelho-preto");
  const [userId, setUserId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      setUserId(uid);
      const saved = localStorage.getItem(getStorageKey(uid));
      if (saved && saved in CHART_THEMES) {
        setThemeIdState(saved as ChartThemeId);
      }
    });
  }, []);

  const setThemeId = (id: ChartThemeId) => {
    setThemeIdState(id);
    localStorage.setItem(getStorageKey(userId), id);
  };

  return { theme: CHART_THEMES[themeId], themeId, setThemeId };
}

export function ChartThemePicker({
  themeId,
  onChange,
}: {
  themeId: ChartThemeId;
  onChange: (id: ChartThemeId) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="w-4 h-4" />
          Cores
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Tema do gráfico</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.values(CHART_THEMES).map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => onChange(t.id)}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <div className="flex">
                <span
                  className="w-3 h-3 rounded-l-sm"
                  style={{ backgroundColor: t.vendido }}
                />
                <span
                  className="w-3 h-3 rounded-r-sm"
                  style={{ backgroundColor: t.meta }}
                />
              </div>
              <span>{t.label}</span>
            </div>
            {themeId === t.id && (
              <span className="text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
