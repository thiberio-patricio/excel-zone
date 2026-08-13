import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Gauge,
  Lightbulb,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { PageCard } from "@/components/layout/PageCard";
import { ScoreComercialBadge } from "@/components/ia/ScoreComercialBadge";
import { useAIExecutiveEngine } from "@/hooks/useAIExecutiveEngine";
import {
  SCORE_CORES,
  type Comparativo,
  type EngineInsight,
  type EngineScope,
  type RankingItem,
} from "@/services/aiExecutiveEngine";
import { cn } from "@/lib/utils";

const fmtBRL = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

function Delta({ valor }: { valor: number }) {
  const positivo = valor >= 0;
  const Icon = positivo ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", positivo ? "text-emerald-400" : "text-red-400")}>
      <Icon className="h-3.5 w-3.5" />
      {valor.toFixed(1)}%
    </span>
  );
}

function ComparativoCard({ c }: { c: Comparativo }) {
  return (
    <PageCard className="p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{c.label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-display text-xl font-bold text-foreground">{fmtBRL(c.atual.faturamento)}</p>
        <Delta valor={c.variacaoFaturamento} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Anterior: {fmtBRL(c.anterior.faturamento)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
        <span>
          Ticket <b className="text-foreground">{fmtBRL(c.atual.ticketMedio)}</b> <Delta valor={c.variacaoTicket} />
        </span>
        <span>
          Vendas <b className="text-foreground">{c.atual.quantidadeVendas}</b> <Delta valor={c.variacaoQuantidade} />
        </span>
      </div>
    </PageCard>
  );
}

function ListaInsights({
  titulo,
  icone: Icone,
  itens,
  vazio,
}: {
  titulo: string;
  icone: typeof Lightbulb;
  itens: EngineInsight[];
  vazio: string;
}) {
  return (
    <PageCard className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icone className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-foreground">{titulo}</h3>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">{vazio}</p>
      ) : (
        <ul className="space-y-3">
          {itens.map((i, idx) => (
            <li key={idx} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{i.titulo}</p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest",
                    SCORE_CORES[i.severidade].bg,
                    SCORE_CORES[i.severidade].border,
                    SCORE_CORES[i.severidade].text
                  )}
                >
                  {i.severidade}
                </span>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{i.texto}</p>
            </li>
          ))}
        </ul>
      )}
    </PageCard>
  );
}

function RankingLista({ titulo, itens }: { titulo: string; itens: RankingItem[] }) {
  return (
    <PageCard className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-foreground">{titulo}</h3>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem dados no período.</p>
      ) : (
        <ul className="space-y-2">
          {itens.slice(0, 8).map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
              <span className="w-5 text-xs font-bold text-muted-foreground">{i + 1}º</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{r.nome}</p>
                <p className="text-[11px] text-muted-foreground">
                  {fmtBRL(r.faturamento)} • {r.atingimento.toFixed(1)}% da meta • ticket {fmtBRL(r.ticketMedio)}
                </p>
              </div>
              <ScoreComercialBadge score={r.score} size="sm" showPontos={false} />
            </li>
          ))}
        </ul>
      )}
    </PageCard>
  );
}

interface Props {
  scope?: EngineScope;
  /** Oculta rankings (ex.: escopo de um único vendedor) */
  mostrarRankings?: boolean;
}

/** Painel completo do motor AIExecutiveEngine: score, comparativos, rankings, insights e projeções. */
export default function ScoreComercialPanel({ scope = {}, mostrarRankings = true }: Props) {
  const { analise, carregando, erro, recarregar } = useAIExecutiveEngine(scope);
  const [aba, setAba] = useState<"insights" | "alertas" | "recomendacoes">("insights");

  if (carregando && !analise) {
    return (
      <PageCard className="flex items-center justify-center gap-3 p-10 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Executando motor de análise...
      </PageCard>
    );
  }
  if (erro || !analise) {
    return (
      <PageCard className="p-6 text-sm text-muted-foreground">
        {erro ?? "Não foi possível executar a análise."}
      </PageCard>
    );
  }

  const { score, comparativos, projecoes, tendencia } = analise;
  const cor = SCORE_CORES[score.nivel];

  return (
    <div className="space-y-6">
      {/* Score Comercial */}
      <PageCard className={cn("p-6", cor.border)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Score Comercial — Motor AIExecutiveEngine
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div
                className={cn("flex h-16 w-16 items-center justify-center rounded-2xl border", cor.bg, cor.border)}
              >
                <span className={cn("font-display text-2xl font-bold", cor.text)}>{score.pontos}</span>
              </div>
              <div>
                <p className={cn("font-display text-2xl font-bold", cor.text)}>{score.rotulo}</p>
                <p className="text-sm text-muted-foreground">{score.descricao}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1 text-[12px] text-muted-foreground">
              {score.motivos.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          </div>
          <Button variant="outline" size="sm" onClick={recarregar} disabled={carregando}>
            {carregando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recalcular
          </Button>
        </div>
      </PageCard>

      {/* Comparativos automáticos */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ComparativoCard c={comparativos.hojeVsOntem} />
        <ComparativoCard c={comparativos.semanaVsAnterior} />
        <ComparativoCard c={comparativos.mesVsAnterior} />
        <ComparativoCard c={comparativos.mesmoPeriodoMesAnterior} />
      </div>

      {/* Projeções */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: TrendingUp, label: "Projeção do mês", value: fmtBRL(projecoes.faturamentoMes) },
          { icon: Target, label: "Atingimento projetado", value: `${projecoes.atingimentoProjetado.toFixed(1)}%` },
          { icon: Gauge, label: "Média diária", value: fmtBRL(projecoes.mediaDiaria) },
          {
            icon: Activity,
            label: "Necessário por dia útil",
            value: `${fmtBRL(projecoes.necessarioPorDia)} · ${projecoes.diasUteisRestantes}d`,
          },
        ].map((k) => (
          <PageCard key={k.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{k.label}</p>
                <p className="mt-2 truncate font-display text-xl font-bold text-foreground">{k.value}</p>
              </div>
              <k.icon className="h-5 w-5 flex-shrink-0 text-primary" />
            </div>
          </PageCard>
        ))}
      </div>

      {/* Tendência */}
      <PageCard className="p-5">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
          Tendência do mês (média móvel 7 dias)
        </h3>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tendencia}>
              <defs>
                <linearGradient id="scoreTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={`hsl(${cor.hsl})`} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={`hsl(${cor.hsl})`} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" />
              <XAxis dataKey="dia" stroke="hsl(0 0% 65%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 65%)" fontSize={11} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(240 10% 8%)", border: "1px solid hsl(0 0% 100% / 0.1)", borderRadius: 12 }}
                formatter={(v: number) => fmtBRL(v)}
              />
              <Area type="monotone" dataKey="faturamento" stroke={`hsl(${cor.hsl})`} fill="url(#scoreTrend)" strokeWidth={2} />
              <Area type="monotone" dataKey="mediaMovel" stroke="hsl(199 89% 55%)" fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </PageCard>

      {/* Insights / alertas / recomendações */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["insights", "Insights", analise.insights.length],
            ["alertas", "Alertas", analise.alertas.length],
            ["recomendacoes", "Recomendações", analise.recomendacoes.length],
          ] as const
        ).map(([id, label, total]) => (
          <Button key={id} variant={aba === id ? "default" : "outline"} size="sm" onClick={() => setAba(id)}>
            {label} ({total})
          </Button>
        ))}
      </div>

      {aba === "insights" && (
        <ListaInsights titulo="Insights" icone={Lightbulb} itens={analise.insights} vazio="Sem insights no período." />
      )}
      {aba === "alertas" && (
        <ListaInsights titulo="Alertas" icone={AlertTriangle} itens={analise.alertas} vazio="Nenhum alerta ativo." />
      )}
      {aba === "recomendacoes" && (
        <ListaInsights
          titulo="Recomendações"
          icone={Activity}
          itens={analise.recomendacoes}
          vazio="Sem recomendações no momento."
        />
      )}

      {mostrarRankings && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RankingLista titulo="Ranking de vendedores" itens={analise.rankingVendedores} />
          <RankingLista titulo="Ranking de lojas" itens={analise.rankingLojas} />
        </div>
      )}
    </div>
  );
}
