import { CalendarClock, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { useIASettings } from "./useIASettings";

export default function IAAgendamentos() {
  const { settings, carregando, atualizar } = useIASettings();

  const DIAS = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
  ];

  const ultima = (v?: string | null) =>
    v ? new Date(v).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "nunca";

  const agendas = settings
    ? [
        {
          key: "daily_report_enabled" as const,
          label: "Relatório diário",
          quando: "Todos os dias",
          ultimaExecucao: ultima(settings.last_daily_run_at),
        },
        {
          key: "weekly_report_enabled" as const,
          label: "Relatório semanal",
          quando: `Toda ${DIAS[Number(settings.weekly_weekday ?? 1)] ?? "segunda-feira"}`,
          ultimaExecucao: ultima(settings.last_weekly_run_at),
        },
        {
          key: "monthly_report_enabled" as const,
          label: "Relatório mensal",
          quando: `No dia ${settings.monthly_day ?? 1} de cada mês`,
          ultimaExecucao: ultima(settings.last_monthly_run_at),
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={CalendarClock}
        eyebrow="IA Executiva · ANA"
        title="Agendamentos"
        description="Defina o horário de envio e a periodicidade das análises enviadas aos gestores."
      />

      {carregando || !settings ? (
        <PageCard>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </PageCard>
      ) : (
        <>
          <PageCard>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Horário de envio</Label>
                <Input
                  type="time"
                  value={(settings.send_time ?? "08:00").slice(0, 5)}
                  onChange={(e) => atualizar({ send_time: `${e.target.value}:00` })}
                />
                <p className="text-xs text-muted-foreground">
                  Horário de referência (fuso de Brasília) para o disparo das análises.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status dos envios</Label>
                <div className="flex h-10 items-center justify-between rounded-btn border border-white/10 px-3">
                  <span className="text-sm text-muted-foreground">
                    {settings.active ? "Envios ativos" : "Envios pausados"}
                  </span>
                  <Switch
                    checked={settings.active}
                    onCheckedChange={(v) => atualizar({ active: v })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dia do envio semanal</Label>
                <select
                  className="h-10 w-full rounded-btn border border-white/10 bg-transparent px-3 text-sm text-foreground"
                  value={Number(settings.weekly_weekday ?? 1)}
                  onChange={(e) => atualizar({ weekly_weekday: Number(e.target.value) })}
                >
                  {DIAS.map((d, i) => (
                    <option key={d} value={i} className="bg-background">
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Dia do envio mensal</Label>
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={Number(settings.monthly_day ?? 1)}
                  onChange={(e) =>
                    atualizar({ monthly_day: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })
                  }
                />
              </div>
            </div>
          </PageCard>

          <PageCard>
            <h3 className="mb-4 font-display text-base font-semibold text-foreground">
              Periodicidade das análises
            </h3>
            <div className="space-y-3">
              {agendas.map((a) => (
                <div
                  key={a.key}
                  className="flex items-center justify-between rounded-card border border-white/5 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.label}</p>
                      <p className="text-xs text-muted-foreground">{a.quando}</p>
                      <p className="text-[11px] text-muted-foreground/70">
                        Última execução: {a.ultimaExecucao}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {(settings.send_time ?? "08:00").slice(0, 5)}
                    </Badge>
                  </div>
                  <Switch
                    checked={settings[a.key]}
                    onCheckedChange={(v) => atualizar({ [a.key]: v })}
                  />
                </div>
              ))}
            </div>
          </PageCard>
        </>
      )}
    </div>
  );
}
