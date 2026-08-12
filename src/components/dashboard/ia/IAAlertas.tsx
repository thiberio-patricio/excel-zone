import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Loader2, BellRing, TrendingDown, Target, Receipt, Percent, Package, Trophy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { toLocalISO } from "@/utils/dateISO";
import { useIASettings } from "./useIASettings";

const META_TICKET = 500;

interface AlertaLoja {
  loja: string;
  tipo: string;
  detalhe: string;
  severidade: "critico" | "atencao";
}

const ALERTAS = [
  { key: "sales_drop_alert" as const, label: "Queda de vendas", desc: "Aviso quando a loja cai frente ao período anterior", icon: TrendingDown },
  { key: "goal_risk_alert" as const, label: "Risco de meta", desc: "Aviso quando o ritmo não sustenta a meta do mês", icon: Target },
  { key: "ticket_average_alert" as const, label: "Ticket médio", desc: "Aviso quando o ticket fica abaixo da meta", icon: Receipt },
  { key: "conversion_alert" as const, label: "Conversão", desc: "Aviso sobre queda no volume de vendas fechadas", icon: Percent },
  { key: "stock_alert" as const, label: "Estoque", desc: "Aviso sobre rupturas e itens críticos", icon: Package },
  { key: "ranking_alert" as const, label: "Ranking", desc: "Movimentações relevantes no ranking de lojas", icon: Trophy },
];

export default function IAAlertas() {
  const { settings, carregando: carregandoSettings, atualizar } = useIASettings();
  const [alertas, setAlertas] = useState<AlertaLoja[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const calcular = async () => {
      setCarregando(true);
      const hoje = new Date();
      const hojeISO = toLocalISO(hoje);
      const inicioMes = toLocalISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
      const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();

      const [filiais, profiles, vendas, metas] = await Promise.all([
        supabase.from("filiais").select("id, nome"),
        supabase.from("profiles").select("id, filial_id"),
        supabase
          .from("vendas")
          .select("vendedor_id, valor, devolucao, quantidade_vendas")
          .gte("data", inicioMes)
          .lte("data", hojeISO),
        supabase
          .from("metas")
          .select("vendedor_id, valor_meta")
          .eq("mes", hoje.getMonth() + 1)
          .eq("ano", hoje.getFullYear()),
      ]);

      const filialDe = new Map<string, string>();
      (profiles.data ?? []).forEach((p) => p.filial_id && filialDe.set(p.id, p.filial_id));

      const agg = new Map<string, { vendido: number; meta: number; qtd: number }>();
      const get = (id: string) => {
        if (!agg.has(id)) agg.set(id, { vendido: 0, meta: 0, qtd: 0 });
        return agg.get(id)!;
      };
      (vendas.data ?? []).forEach((v) => {
        const f = filialDe.get(v.vendedor_id);
        if (!f) return;
        const a = get(f);
        a.vendido += (Number(v.valor) || 0) - (Number(v.devolucao) || 0);
        a.qtd += Number(v.quantidade_vendas) || 0;
      });
      (metas.data ?? []).forEach((m) => {
        const f = filialDe.get(m.vendedor_id);
        if (!f) return;
        get(f).meta += Number(m.valor_meta) || 0;
      });

      const ritmoEsperado = hoje.getDate() / diasNoMes;
      const lista: AlertaLoja[] = [];

      (filiais.data ?? []).forEach((f) => {
        const a = agg.get(f.id);
        if (!a) return;
        const pct = a.meta > 0 ? a.vendido / a.meta : 0;
        if (a.meta > 0 && pct < ritmoEsperado * 0.85) {
          lista.push({
            loja: f.nome,
            tipo: "Risco de meta",
            detalhe: `Atingimento de ${(pct * 100).toFixed(1)}% com ${(ritmoEsperado * 100).toFixed(0)}% do mês decorrido.`,
            severidade: pct < ritmoEsperado * 0.6 ? "critico" : "atencao",
          });
        }
        const ticket = a.qtd > 0 ? a.vendido / a.qtd : 0;
        if (a.qtd > 0 && ticket < META_TICKET) {
          lista.push({
            loja: f.nome,
            tipo: "Ticket médio",
            detalhe: `Ticket de R$ ${ticket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} contra meta de R$ ${META_TICKET.toFixed(2)}.`,
            severidade: ticket < META_TICKET * 0.7 ? "critico" : "atencao",
          });
        }
      });

      setAlertas(lista);
      setCarregando(false);
    };
    calcular();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BellRing}
        eyebrow="IA Executiva · ANA"
        title="Alertas Inteligentes"
        description="Configure os gatilhos monitorados pela ANA e acompanhe os alertas identificados no mês corrente."
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
            title="Nenhum alerta ativo"
            description="Todas as lojas estão dentro dos parâmetros monitorados neste momento."
          />
        ) : (
          <>
            <h3 className="mb-4 font-display text-base font-semibold text-foreground">
              Alertas identificados ({alertas.length})
            </h3>
            <div className="space-y-3">
              {alertas.map((a, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-white/5 p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{a.loja}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {a.tipo}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.detalhe}</p>
                  </div>
                  <Badge
                    className={
                      a.severidade === "critico"
                        ? "bg-destructive/20 text-destructive border border-destructive/30"
                        : "bg-warning/20 text-warning border border-warning/30"
                    }
                  >
                    {a.severidade === "critico" ? "Crítico" : "Atenção"}
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
