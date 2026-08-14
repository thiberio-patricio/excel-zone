import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Loader2,
  BellRing,
  TrendingDown,
  Target,
  Receipt,
  Percent,
  Package,
  Trophy,
  Play,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { useIASettings } from "./useIASettings";

interface Alerta {
  id: string;
  alert_type: string;
  severity: "positivo" | "atencao" | "moderado" | "elevado";
  store_name: string | null;
  title: string;
  message: string;
  notified: boolean;
  created_at: string;
}

const ALERTAS = [
  { key: "sales_drop_alert" as const, label: "Queda de vendas", desc: "Gatilhos em 10%, 20% e 30% de queda", icon: TrendingDown },
  { key: "goal_risk_alert" as const, label: "Risco de meta", desc: "Aviso quando o ritmo não sustenta a meta do mês", icon: Target },
  { key: "ticket_average_alert" as const, label: "Ticket médio", desc: "Aviso quando o ticket médio cai", icon: Receipt },
  { key: "conversion_alert" as const, label: "Conversão", desc: "Aviso sobre queda no volume de vendas fechadas", icon: Percent },
  { key: "stock_alert" as const, label: "Estoque", desc: "Aviso sobre rupturas e itens críticos", icon: Package },
  { key: "ranking_alert" as const, label: "Ranking / destaque", desc: "Metas atingidas e vendedor destaque", icon: Trophy },
];

const SEVERIDADE: Record<Alerta["severity"], { label: string; classe: string }> = {
  positivo: { label: "Positivo", classe: "bg-success/20 text-success border border-success/30" },
  atencao: { label: "Atenção", classe: "bg-warning/20 text-warning border border-warning/30" },
  moderado: { label: "Risco moderado", classe: "bg-warning/25 text-warning border border-warning/40" },
  elevado: { label: "Risco elevado", classe: "bg-destructive/20 text-destructive border border-destructive/30" },
};

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export default function IAAlertas() {
  const { settings, carregando: carregandoSettings, atualizar } = useIASettings();
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [monitorando, setMonitorando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from("ai_alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) toast.error("Não foi possível carregar os alertas");
    setAlertas((data ?? []) as unknown as Alerta[]);
    setCarregando(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const monitorarAgora = async () => {
    setMonitorando(true);
    const { data, error } = await supabase.functions.invoke("ana-alerts", { body: { manual: true } });
    setMonitorando(false);
    if (error) {
      toast.error("Falha ao executar o monitoramento");
    } else if ((data as any)?.error) {
      toast.error((data as any).error);
    } else {
      const d = data as any;
      toast.success(
        `Monitoramento concluído: ${d.novos ?? 0} novo(s) alerta(s), ${d.enviados ?? 0} envio(s) no WhatsApp`,
      );
      if (d.aviso) toast.warning(d.aviso);
    }
    carregar();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BellRing}
        eyebrow="IA Executiva · ANA"
        title="Alertas Inteligentes"
        description="Monitoramento contínuo dos indicadores, com geração de alertas e envio imediato pelo WhatsApp."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={monitorarAgora} disabled={monitorando}>
              {monitorando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Monitorar agora
            </Button>
            <Button variant="outline" onClick={carregar} disabled={carregando}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        }
      />

      <PageCard>
        <h3 className="mb-4 font-display text-base font-semibold text-foreground">Gatilhos monitorados</h3>
        {carregandoSettings || !settings ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {ALERTAS.map((a) => (
              <div
                key={a.key}
                className="flex items-center justify-between gap-3 rounded-card border border-white/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <a.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                </div>
                <Switch checked={settings[a.key]} onCheckedChange={(v) => atualizar({ [a.key]: v })} />
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <PageCard padded={!carregando && alertas.length > 0}>
        {carregando ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : alertas.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="Nenhum alerta registrado"
            description="Todas as lojas estão dentro dos parâmetros monitorados neste momento."
          />
        ) : (
          <>
            <h3 className="mb-4 font-display text-base font-semibold text-foreground">
              Alertas registrados ({alertas.length})
            </h3>
            <div className="space-y-3">
              {alertas.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-white/5 p-4"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {a.store_name ?? "Rede"}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {a.title}
                      </Badge>
                      {a.notified && (
                        <Badge variant="outline" className="text-[10px]">
                          <MessageCircle className="mr-1 h-3 w-3" />
                          enviado
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                      {a.message.replace(/\*/g, "")}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{dataHora(a.created_at)}</p>
                  </div>
                  <Badge className={SEVERIDADE[a.severity]?.classe}>
                    {SEVERIDADE[a.severity]?.label ?? a.severity}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </PageCard>
    </div>
  );
}
