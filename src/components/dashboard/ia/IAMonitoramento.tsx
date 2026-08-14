import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";

interface LogExecucao {
  id: string;
  run_type: string;
  trigger_source: string;
  status: string;
  message: string | null;
  analyses_generated: number;
  notifications_created: number;
  duration_ms: number;
  details: Record<string, unknown> | null;
  executed_at: string;
}

const TIPOS = [
  { value: "diario", label: "Diário" },
  { value: "semanal", label: "Semanal" },
  { value: "mensal", label: "Mensal" },
];

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function IAMonitoramento() {
  const [logs, setLogs] = useState<LogExecucao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [executando, setExecutando] = useState(false);
  const [tipo, setTipo] = useState("diario");

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("ai_scheduler_logs")
      .select("*")
      .order("executed_at", { ascending: false })
      .limit(100);
    if (error) toast.error("Não foi possível carregar os logs do agendador");
    setLogs((data ?? []) as unknown as LogExecucao[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const executarAgora = async () => {
    setExecutando(true);
    const { data, error } = await supabase.functions.invoke("ana-scheduler", {
      body: { manual: true, tipo },
    });
    setExecutando(false);
    if (error) {
      toast.error("Falha ao executar o agendador");
    } else if ((data as any)?.error) {
      toast.error((data as any).error);
    } else {
      toast.success(`Execução concluída (${(data as any)?.executados ?? 0} rotina(s))`);
    }
    carregar();
  };

  const sucessos = logs.filter((l) => l.status === "sucesso").length;
  const erros = logs.filter((l) => l.status === "erro").length;
  const mediaMs = logs.length
    ? Math.round(logs.reduce((s, l) => s + (l.duration_ms || 0), 0) / logs.length)
    : 0;

  const kpis = [
    { label: "Execuções registradas", valor: String(logs.length), icon: Activity },
    { label: "Concluídas com sucesso", valor: String(sucessos), icon: CheckCircle2 },
    { label: "Com erro", valor: String(erros), icon: AlertTriangle },
    { label: "Duração média", valor: `${(mediaMs / 1000).toFixed(1)}s`, icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Activity}
        eyebrow="IA Executiva · ANA"
        title="Monitoramento do Agendador"
        description="Acompanhe cada execução automática do Scheduler Engine, com status, duração e volume de análises."
        actions={
          <div className="flex items-center gap-2">
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={executarAgora} disabled={executando}>
              {executando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Executar agora
            </Button>
            <Button variant="outline" onClick={carregar} disabled={carregando}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <PageCard key={k.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {k.label}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground">{k.valor}</p>
              </div>
              <k.icon className="h-5 w-5 text-primary" />
            </div>
          </PageCard>
        ))}
      </div>

      {carregando ? (
        <PageCard>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </PageCard>
      ) : logs.length === 0 ? (
        <PageCard padded={false}>
          <EmptyState
            icon={Clock}
            title="Nenhuma execução registrada"
            description="As execuções automáticas da ANA aparecerão aqui com logs completos."
          />
        </PageCard>
      ) : (
        <PageCard>
          <div className="space-y-3">
            {logs.map((l) => (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-white/5 p-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={l.status === "sucesso" ? "outline" : "destructive"}
                      className="capitalize"
                    >
                      {l.status}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {l.run_type}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {l.trigger_source === "cron" ? "automático" : "manual"}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {l.message ?? "—"}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{dataHora(l.executed_at)}</p>
                  <p>
                    {l.analyses_generated} análise(s) · {l.notifications_created} envio(s) ·{" "}
                    {(l.duration_ms / 1000).toFixed(1)}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        </PageCard>
      )}
    </div>
  );
}
