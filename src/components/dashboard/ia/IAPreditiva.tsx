import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BrainCircuit,
  Loader2,
  RefreshCw,
  Send,
  Target,
  TrendingUp,
  Receipt,
  Percent,
  Gauge,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import AIPredictiveEngine, { type PrevisaoLoja, type PrevisaoMensal } from "@/services/aiPredictiveEngine";

const fmtBRL = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const NIVEL: Record<PrevisaoLoja["nivel"], { label: string; classe: string }> = {
  provavel: { label: "Meta provável", classe: "bg-success/20 text-success border border-success/30" },
  possivel: { label: "Meta possível", classe: "bg-warning/20 text-warning border border-warning/30" },
  improvavel: {
    label: "Meta improvável",
    classe: "bg-destructive/20 text-destructive border border-destructive/30",
  },
};

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <PageCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-xl font-bold text-foreground sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Icon className="h-5 w-5 flex-shrink-0 text-primary" />
      </div>
    </PageCard>
  );
}

export default function IAPreditiva() {
  const [previsao, setPrevisao] = useState<PrevisaoMensal | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setPrevisao(await AIPredictiveEngine.prever());
    } catch {
      toast.error("Não foi possível gerar a previsão");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const enviarWhatsApp = async () => {
    if (!previsao) return;
    setEnviando(true);
    const { data: destinatarios } = await supabase
      .from("ai_recipients")
      .select("nome, telefone, alert_types")
      .eq("active", true);

    const destinos = (destinatarios ?? [])
      .filter((d: any) =>
        (d.alert_types ?? []).some((t: string) => ["previsao", "metas", "alertas", "mensal"].includes(t))
      )
      .map((d: any) => ({ nome: d.nome, telefone: d.telefone }));

    if (!destinos.length) {
      setEnviando(false);
      toast.error("Cadastre destinatários autorizados na Central de Destinatários");
      return;
    }

    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: {
        kind: "relatorio",
        destinos,
        mensagem: AIPredictiveEngine.mensagemWhatsApp(previsao),
      },
    });
    setEnviando(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? "Falha ao enviar a previsão");
      return;
    }
    toast.success(`Previsão enviada para ${destinos.length} destinatário(s)`);
  };

  const rede = previsao?.rede;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BrainCircuit}
        eyebrow="IA Executiva · ANA"
        title="IA Preditiva"
        description="Previsão automática de fechamento do mês: probabilidade de meta, projeções de faturamento, ticket médio e conversão, com nível de confiança e recomendações preventivas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={enviarWhatsApp} disabled={enviando || !previsao}>
              {enviando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar pelo WhatsApp
            </Button>
            <Button variant="outline" onClick={carregar} disabled={carregando}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recalcular
            </Button>
          </div>
        }
      />

      {carregando ? (
        <PageCard>
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </PageCard>
      ) : !previsao || !rede ? (
        <PageCard padded={false}>
          <EmptyState
            icon={BrainCircuit}
            title="Sem dados suficientes"
            description="Cadastre metas e lançamentos de vendas para que a IA gere a previsão de fechamento."
          />
        </PageCard>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              icon={Target}
              label="Probabilidade de meta"
              value={`${rede.probabilidadeMeta.toFixed(0)}%`}
              hint={`${NIVEL[rede.nivel].label} · confiança ${rede.confianca}%`}
            />
            <KpiCard
              icon={TrendingUp}
              label="Projeção de faturamento"
              value={fmtBRL(rede.projecaoFaturamento)}
              hint={`${rede.atingimentoProjetado.toFixed(1)}% da meta de ${fmtBRL(rede.meta)}`}
            />
            <KpiCard
              icon={Gauge}
              label="Faixa de projeção"
              value={`${fmtBRL(rede.faixaMin)} – ${fmtBRL(rede.faixaMax)}`}
              hint="Intervalo estatístico de ~80% de confiança"
            />
            <KpiCard
              icon={Receipt}
              label="Ticket médio projetado"
              value={fmtBRL(rede.ticketProjetado)}
              hint={`Atual ${fmtBRL(rede.ticketAtual)} · meta ${fmtBRL(rede.metaTicket)}`}
            />
            <KpiCard
              icon={Percent}
              label="Conversão projetada"
              value={`${rede.conversaoProjetada.toFixed(1)} vendas/dia`}
              hint={`${rede.quantidadeProjetada} venda(s) previstas no mês`}
            />
            <KpiCard
              icon={ShieldCheck}
              label="Ritmo necessário"
              value={`${fmtBRL(rede.necessarioPorDia)}/dia`}
              hint={`${rede.diasUteisRestantes} dia(s) útil(eis) restantes · ritmo atual ${fmtBRL(
                rede.ritmoRecente
              )}/dia`}
            />
          </div>

          <PageCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-foreground">
                Curva de fechamento — {previsao.mesLabel}
              </h3>
              <Badge className={NIVEL[rede.nivel].classe}>
                {NIVEL[rede.nivel].label} · {rede.probabilidadeMeta.toFixed(0)}%
              </Badge>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={previsao.serie} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradProjetado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 100% 52%)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(0 100% 52%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" />
                  <XAxis dataKey="dia" stroke="hsl(0 0% 70%)" fontSize={11} />
                  <YAxis
                    stroke="hsl(0 0% 70%)"
                    fontSize={11}
                    tickFormatter={(v: number) => `R$\u00A0${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0 42% 11% / 0.95)",
                      border: "1px solid hsl(0 0% 100% / 0.08)",
                      borderRadius: 12,
                    }}
                    formatter={(v: any, n: any) => [fmtBRL(Number(v)), n]}
                    labelFormatter={(l) => `Dia ${l}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="projetado"
                    name="Projeção acumulada"
                    stroke="hsl(0 100% 52%)"
                    strokeDasharray="5 4"
                    fill="url(#gradProjetado)"
                  />
                  <Line
                    type="monotone"
                    dataKey="realizado"
                    name="Realizado"
                    stroke="hsl(160 84% 45%)"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="meta"
                    name="Meta acumulada"
                    stroke="hsl(199 89% 55%)"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </PageCard>

          <PageCard>
            <h3 className="mb-4 font-display text-base font-semibold text-foreground">
              Previsão por loja
            </h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {previsao.lojas.map((l) => (
                <div key={l.id} className="rounded-card border border-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{l.nome}</p>
                    <Badge className={NIVEL[l.nivel].classe}>
                      {l.probabilidadeMeta.toFixed(0)}% de chance
                    </Badge>
                  </div>
                  <Progress value={Math.min(100, l.atingimentoProjetado)} className="mt-3 h-2" />
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <p>
                      Projeção<br />
                      <span className="text-foreground">{fmtBRL(l.projecaoFaturamento)}</span>
                    </p>
                    <p>
                      Meta<br />
                      <span className="text-foreground">{fmtBRL(l.meta)}</span>
                    </p>
                    <p>
                      Atingimento<br />
                      <span className="text-foreground">{l.atingimentoProjetado.toFixed(1)}%</span>
                    </p>
                    <p>
                      Ticket projetado<br />
                      <span className="text-foreground">{fmtBRL(l.ticketProjetado)}</span>
                    </p>
                    <p>
                      Conversão projetada<br />
                      <span className="text-foreground">{l.conversaoProjetada.toFixed(1)}/dia</span>
                    </p>
                    <p>
                      Confiança<br />
                      <span className="text-foreground">{l.confianca}%</span>
                    </p>
                  </div>
                  <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {l.recomendacoes.slice(0, 2).map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </PageCard>

          <PageCard>
            <h3 className="mb-4 font-display text-base font-semibold text-foreground">
              Recomendações preventivas da ANA
            </h3>
            <ul className="space-y-2">
              {previsao.recomendacoesGerais.map((r, i) => (
                <li
                  key={i}
                  className="rounded-card border border-white/5 p-3 text-sm text-muted-foreground"
                >
                  {r}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Previsão gerada em {new Date(previsao.geradoEm).toLocaleString("pt-BR")} · modelo estatístico
              sobre {rede.diasUteisDecorridos} dia(s) útil(eis) já realizados.
            </p>
          </PageCard>
        </>
      )}
    </div>
  );
}
