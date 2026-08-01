import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  TrendingUp,
  Target,
  Gauge,
  CalendarClock,
  Sparkles,
  Zap,
  AlertTriangle,
  TrendingDown,
  Radar,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface PainelExecutivoProps {
  mes: number;
  ano: number;
  /** When provided, scopes all data (KPIs, heatmap, AI insights) to a single branch. */
  filialId?: string | null;
  /** Optional pre-computed stats (used by Diretor view). Ignored when filialId is set. */
  stats?: {
    totalFiliais: number;
    totalGerentes: number;
    totalVendedores: number;
    vendasMesAtual: number;
    metaGeral: number;
  };
  /** Label used in AI insights to refer to the scope ("empresa" for diretor, filial name for gerente). */
  escopoNome?: string;
}

interface DailyPoint {
  dia: number;
  data: string;
  total: number;
  weekday: number;
}

interface VendedorInsight {
  id: string;
  nome: string;
  hoje: number;
  ontem: number;
  mediaSemana: number;
  totalMes: number;
  meta: number;
  percentual: number;
  variacao: number; // % vs media
}

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const shortBRL = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
};

export default function PainelExecutivo({ mes, ano, filialId, stats: statsProp, escopoNome }: PainelExecutivoProps) {
  const [dailySales, setDailySales] = useState<DailyPoint[]>([]);
  const [vendedores, setVendedores] = useState<VendedorInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialNome, setFilialNome] = useState<string | null>(null);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketMes, setTicketMes] = useState(0);
  const [ticketAnterior, setTicketAnterior] = useState(0);
  /** Ticket médio do mês por loja (usado no escopo Diretor para somar as lojas) */
  const [ticketsPorLoja, setTicketsPorLoja] = useState<number[]>([]);

  const emptyStats = { totalFiliais: 0, totalGerentes: 0, totalVendedores: 0, vendasMesAtual: 0, metaGeral: 0 };
  const [computedStats, setComputedStats] = useState(emptyStats);
  const stats = filialId ? computedStats : (statsProp || emptyStats);
  const scopeLabel = escopoNome ?? (filialId ? (filialNome ?? "sua filial") : "empresa");

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano, filialId]);

  useEffect(() => {
    if (!filialId) { setFilialNome(null); return; }
    supabase.from("filiais").select("nome").eq("id", filialId).maybeSingle()
      .then(({ data }) => setFilialNome((data as any)?.nome ?? null));
  }, [filialId]);


  const carregar = async () => {
    setLoading(true);
    try {
      const ultimoDiaDate = new Date(ano, mes, 0);
      const primeiroStr = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const ultimoStr = `${ano}-${String(mes).padStart(2, "0")}-${String(
        ultimoDiaDate.getDate()
      ).padStart(2, "0")}`;

      const [vendasRes, profilesRes, metasRes, rolesRes] = await Promise.all([
        supabase
          .from("vendas")
          .select("valor, devolucao, data, vendedor_id, quantidade_vendas")
          .gte("data", primeiroStr)
          .lte("data", ultimoStr),
        supabase.from("profiles").select("id, nome, filial_id"),
        supabase
          .from("metas")
          .select("vendedor_id, valor_meta, mes, ano")
          .or(`ano.lt.${ano},and(ano.eq.${ano},mes.lte.${mes})`),
        supabase.from("user_roles").select("user_id, role").eq("role", "vendedor"),
      ]);

      // Determine which vendedores are in scope (role=vendedor, filtered by filial if provided)
      const profilesById = new Map<string, any>();
      (profilesRes.data || []).forEach((p: any) => profilesById.set(p.id, p));

      const roleVendedorIds = new Set((rolesRes.data || []).map((r: any) => r.user_id));
      const allowedVendedorIds = new Set<string>();
      roleVendedorIds.forEach((vid) => {
        const p = profilesById.get(vid);
        if (!p) return;
        if (filialId && p.filial_id !== filialId) return;
        allowedVendedorIds.add(vid);
      });

      // Daily aggregation (scoped)
      const totalDias = ultimoDiaDate.getDate();
      const dailyMap = new Map<number, number>();
      for (let d = 1; d <= totalDias; d++) dailyMap.set(d, 0);

      (vendasRes.data || []).forEach((v: any) => {
        if (!allowedVendedorIds.has(v.vendedor_id)) return;
        const d = new Date(v.data + "T00:00:00");
        const dia = d.getDate();
        const val = Number(v.valor) - Number(v.devolucao);
        dailyMap.set(dia, (dailyMap.get(dia) || 0) + val);
      });

      const daily: DailyPoint[] = Array.from(dailyMap.entries()).map(([dia, total]) => {
        const dt = new Date(ano, mes - 1, dia);
        return {
          dia,
          data: `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`,
          total,
          weekday: dt.getDay(),
        };
      });
      setDailySales(daily);

      // Latest meta per vendedor
      const metaLatestByVendedor = new Map<string, number>();
      const metaRankByVendedor = new Map<string, number>();
      (metasRes.data || []).forEach((m: any) => {
        if (!allowedVendedorIds.has(m.vendedor_id)) return;
        const rank = Number(m.ano) * 12 + Number(m.mes);
        const cur = metaRankByVendedor.get(m.vendedor_id) ?? -1;
        if (rank > cur) {
          metaRankByVendedor.set(m.vendedor_id, rank);
          metaLatestByVendedor.set(m.vendedor_id, Number(m.valor_meta));
        }
      });

      // Group vendas by vendedor (scoped)
      const vendasByVendedor = new Map<string, Array<{ dia: number; total: number; qtd: number }>>();
      (vendasRes.data || []).forEach((v: any) => {
        if (!allowedVendedorIds.has(v.vendedor_id)) return;
        const dia = new Date(v.data + "T00:00:00").getDate();
        const val = Number(v.valor) - Number(v.devolucao);
        const qtd = Number(v.quantidade_vendas) || 0;
        const arr = vendasByVendedor.get(v.vendedor_id) || [];
        arr.push({ dia, total: val, qtd });
        vendasByVendedor.set(v.vendedor_id, arr);
      });

      const today = new Date();
      const mesmoPeriodo =
        today.getMonth() + 1 === mes && today.getFullYear() === ano;
      const diaHoje = mesmoPeriodo ? today.getDate() : totalDias;
      const diaOntem = Math.max(1, diaHoje - 1);

      const insights: VendedorInsight[] = [];
      vendasByVendedor.forEach((rows, vid) => {
        const profile = profilesById.get(vid);
        if (!profile) return;
        const daysMap = new Map<number, number>();
        let totalMes = 0;
        rows.forEach((r) => {
          daysMap.set(r.dia, (daysMap.get(r.dia) || 0) + r.total);
          totalMes += r.total;
        });
        const hoje = daysMap.get(diaHoje) || 0;
        const ontem = daysMap.get(diaOntem) || 0;
        // last 7 days average excluding today
        const start = Math.max(1, diaHoje - 7);
        let soma7 = 0;
        let cnt7 = 0;
        for (let d = start; d < diaHoje; d++) {
          soma7 += daysMap.get(d) || 0;
          cnt7++;
        }
        const media = cnt7 > 0 ? soma7 / cnt7 : 0;
        const meta = metaLatestByVendedor.get(vid) || 0;
        const percentual = meta > 0 ? (totalMes / meta) * 100 : 0;
        const variacao = media > 0 ? ((hoje - media) / media) * 100 : hoje > 0 ? 100 : 0;
        insights.push({
          id: vid,
          nome: profile.nome,
          hoje,
          ontem,
          mediaSemana: media,
          totalMes,
          meta,
          percentual,
          variacao,
        });
      });

      // Also include vendedores with 0 sales (scoped)
      allowedVendedorIds.forEach((vid) => {
        if (vendasByVendedor.has(vid)) return;
        const profile = profilesById.get(vid);
        if (!profile) return;
        const meta = metaLatestByVendedor.get(vid) || 0;
        insights.push({
          id: vid,
          nome: profile.nome,
          hoje: 0,
          ontem: 0,
          mediaSemana: 0,
          totalMes: 0,
          meta,
          percentual: 0,
          variacao: 0,
        });
      });

      setVendedores(insights);

      // Ticket Médio Total: soma do ticket médio de cada vendedor (venda real ÷ qtd)
      let ticketSum = 0;
      let totalValorGeral = 0;
      let totalQtdGeral = 0;
      // Agregação por loja (filial) para o escopo Diretor
      const lojaAtual = new Map<string, { val: number; qtd: number }>();
      vendasByVendedor.forEach((rows, vid) => {
        const totVal = rows.reduce((a, r) => a + r.total, 0);
        const totQtd = rows.reduce((a, r) => a + r.qtd, 0);
        totalValorGeral += totVal;
        totalQtdGeral += totQtd;
        if (totQtd > 0) ticketSum += totVal / totQtd;
        const fid = profilesById.get(vid)?.filial_id;
        if (fid) {
          const cur = lojaAtual.get(fid) || { val: 0, qtd: 0 };
          cur.val += totVal;
          cur.qtd += totQtd;
          lojaAtual.set(fid, cur);
        }
      });
      setTicketTotal(ticketSum);

      // Lojas em escopo: todas as filiais que possuem vendedores
      const lojasEscopo = new Set<string>();
      allowedVendedorIds.forEach((vid) => {
        const fid = profilesById.get(vid)?.filial_id;
        if (fid) lojasEscopo.add(fid);
      });

      const ticketLojas = Array.from(lojasEscopo).map((fid) => {
        const a = lojaAtual.get(fid);
        return a && a.qtd > 0 ? a.val / a.qtd : 0;
      });
      setTicketsPorLoja(ticketLojas);

      const ticketMesGlobal = totalQtdGeral > 0 ? totalValorGeral / totalQtdGeral : 0;
      // Diretor: soma do ticket de todas as lojas. Gerente/filial: ticket da própria loja.
      setTicketMes(
        filialId ? ticketMesGlobal : ticketLojas.reduce((a, b) => a + b, 0)
      );

      // Ticket do mês anterior (mesmo escopo) para a evolução
      const mesAnt = mes === 1 ? 12 : mes - 1;
      const anoAnt = mes === 1 ? ano - 1 : ano;
      const ultimoDiaAnt = new Date(anoAnt, mesAnt, 0).getDate();
      const { data: vendasAnt } = await supabase
        .from("vendas")
        .select("valor, devolucao, vendedor_id, quantidade_vendas")
        .gte("data", `${anoAnt}-${String(mesAnt).padStart(2, "0")}-01`)
        .lte("data", `${anoAnt}-${String(mesAnt).padStart(2, "0")}-${String(ultimoDiaAnt).padStart(2, "0")}`);
      let valAnt = 0;
      let qtdAnt = 0;
      const lojaAnt = new Map<string, { val: number; qtd: number }>();
      (vendasAnt || []).forEach((v: any) => {
        if (!allowedVendedorIds.has(v.vendedor_id)) return;
        const val = Number(v.valor) - Number(v.devolucao);
        const qtd = Number(v.quantidade_vendas) || 0;
        valAnt += val;
        qtdAnt += qtd;
        const fid = profilesById.get(v.vendedor_id)?.filial_id;
        if (fid) {
          const cur = lojaAnt.get(fid) || { val: 0, qtd: 0 };
          cur.val += val;
          cur.qtd += qtd;
          lojaAnt.set(fid, cur);
        }
      });
      if (filialId) {
        setTicketAnterior(qtdAnt > 0 ? valAnt / qtdAnt : 0);
      } else {
        const somaAnt = Array.from(lojasEscopo).reduce((acc, fid) => {
          const a = lojaAnt.get(fid);
          return acc + (a && a.qtd > 0 ? a.val / a.qtd : 0);
        }, 0);
        setTicketAnterior(somaAnt);
      }




      // Compute stats internally when scoped to a filial
      if (filialId) {
        const vendasMesAtual = Array.from(vendasByVendedor.values()).reduce(
          (acc, arr) => acc + arr.reduce((s, r) => s + r.total, 0),
          0
        );
        const metaGeral = Array.from(allowedVendedorIds).reduce(
          (acc, vid) => acc + (metaLatestByVendedor.get(vid) || 0),
          0
        );
        setComputedStats({
          totalFiliais: 1,
          totalGerentes: 0,
          totalVendedores: allowedVendedorIds.size,
          vendasMesAtual,
          metaGeral,
        });
      }
    } catch (e) {
      console.error("PainelExecutivo error", e);
    } finally {
      setLoading(false);
    }
  };

  // Derived metrics
  const derived = useMemo(() => {
    const today = new Date();
    const mesmoPeriodo =
      today.getMonth() + 1 === mes && today.getFullYear() === ano;
    const ultimoDiaDate = new Date(ano, mes, 0).getDate();
    const diaHoje = mesmoPeriodo ? today.getDate() : ultimoDiaDate;

    // Working days remaining (exclude Sundays)
    let restantes = 0;
    for (let d = diaHoje; d <= ultimoDiaDate; d++) {
      const wd = new Date(ano, mes - 1, d).getDay();
      if (wd !== 0) restantes++;
    }
    // Total working days in month and already elapsed (exclude Sundays)
    let uteisTotal = 0;
    let uteisDecorridos = 0;
    for (let d = 1; d <= ultimoDiaDate; d++) {
      const wd = new Date(ano, mes - 1, d).getDay();
      if (wd === 0) continue;
      uteisTotal++;
      if (d < diaHoje) uteisDecorridos++;
    }
    const faltante = Math.max(0, stats.metaGeral - stats.vendasMesAtual);
    const metaDoDia = restantes > 0 ? faltante / restantes : 0;


    const progresso =
      stats.metaGeral > 0 ? (stats.vendasMesAtual / stats.metaGeral) * 100 : 0;

    const vendasHoje =
      dailySales.find((d) => d.dia === diaHoje)?.total || 0;

    // 14-day sparkline (last portion of month up to today)
    const sparkStart = Math.max(1, diaHoje - 13);
    const sparkline = dailySales
      .filter((d) => d.dia >= sparkStart && d.dia <= diaHoje)
      .map((d) => ({ dia: d.dia, total: d.total }));

    // Trend indicator (last 3 vs previous 3)
    const last3 = sparkline.slice(-3).reduce((a, b) => a + b.total, 0);
    const prev3 = sparkline.slice(-6, -3).reduce((a, b) => a + b.total, 0);
    const trend = prev3 > 0 ? ((last3 - prev3) / prev3) * 100 : 0;

    return {
      diaHoje,
      totalDias: ultimoDiaDate,
      restantes,
      uteisTotal,
      uteisDecorridos,
      faltante,
      metaDoDia,


      progresso,
      vendasHoje,
      sparkline,
      trend,
    };
  }, [dailySales, stats, mes, ano]);

  // AI insights (rule-based, natural language)
  const aiCards = useMemo(() => {
    const items: {
      tipo: "sugestao" | "alerta" | "previsao" | "automacao" | "analise";
      titulo: string;
      texto: string;
      icone: any;
      cor: string;
    }[] = [];

    // Previsao: run rate
    const diasCorridos = derived.diaHoje;
    const projetado =
      diasCorridos > 0
        ? (stats.vendasMesAtual / diasCorridos) * derived.totalDias
        : 0;
    const projPerc =
      stats.metaGeral > 0 ? (projetado / stats.metaGeral) * 100 : 0;

    items.push({
      tipo: "previsao",
      titulo: "Projeção de fechamento",
      texto: `No ritmo atual, o mês fecha em ${shortBRL(projetado)} — cerca de ${projPerc.toFixed(
        0
      )}% da meta geral. ${
        projPerc >= 100
          ? "Trajetória saudável, mantenha o ritmo."
          : `Faltam ${shortBRL(Math.max(0, stats.metaGeral - projetado))} para atingir a meta.`
      }`,
      icone: Radar,
      cor: "from-primary/25 to-transparent",
    });

    // Alerta: baixa performance
    const criticos = vendedores
      .filter((v) => v.meta > 0 && v.percentual < 40)
      .sort((a, b) => a.percentual - b.percentual)
      .slice(0, 3);
    if (criticos.length > 0) {
      items.push({
        tipo: "alerta",
        titulo: "Vendedores em risco",
        texto: `${criticos
          .map((c) => `${c.nome} (${c.percentual.toFixed(0)}%)`)
          .join(", ")} estão abaixo de 40% da meta. Recomendo intervenção do gerente.`,
        icone: AlertTriangle,
        cor: "from-warning/25 to-transparent",
      });
    }

    // Sugestao: destaques positivos
    const destaques = vendedores
      .filter((v) => v.variacao > 30 && v.hoje > 0)
      .sort((a, b) => b.variacao - a.variacao)
      .slice(0, 3);
    if (destaques.length > 0) {
      items.push({
        tipo: "sugestao",
        titulo: "Momentum positivo detectado",
        texto: `${destaques
          .map((d) => `${d.nome} (+${d.variacao.toFixed(0)}%)`)
          .join(", ")} vendem hoje acima da média semanal. Reconheça publicamente para manter o embalo.`,
        icone: Sparkles,
        cor: "from-success/25 to-transparent",
      });
    }

    // Automação: quedas
    const quedas = vendedores
      .filter((v) => v.mediaSemana > 0 && v.hoje === 0)
      .slice(0, 3);
    if (quedas.length > 0) {
      items.push({
        tipo: "automacao",
        titulo: "Silêncio operacional",
        texto: `${quedas
          .map((q) => q.nome)
          .join(", ")} não registraram vendas hoje mas vinham vendendo. Considere automação de follow-up e checagem com o gerente.`,
        icone: Bot,
        cor: "from-accent/25 to-transparent",
      });
    }

    // Análise: meta do dia
    items.push({
      tipo: "analise",
      titulo: "Ritmo necessário",
      texto: `Para atingir a meta, ${scopeLabel === "empresa" ? "a empresa" : scopeLabel} precisa vender ${formatBRL(
        derived.metaDoDia
      )} por dia útil nos próximos ${derived.restantes} dias. ${
        derived.trend >= 0
          ? `A tendência dos últimos 3 dias é positiva (+${derived.trend.toFixed(0)}%).`
          : `Atenção: tendência dos últimos 3 dias em queda (${derived.trend.toFixed(0)}%).`
      }`,
      icone: Zap,
      cor: "from-premium/25 to-transparent",
    });

    return items;
  }, [vendedores, stats, derived, scopeLabel]);

  const kpis: any[] = [
    {
      label: "👥 Total Equipe",
      customValue: filialId ? (
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="font-display text-2xl xl:text-3xl font-bold text-foreground leading-none">
            {stats.totalVendedores}
          </span>
          <span className="text-xs font-semibold text-muted-foreground truncate">
            vendedores
          </span>
        </div>
      ) : (
        <div className="flex flex-col leading-tight gap-0.5 min-w-0">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="font-display text-lg xl:text-xl font-bold text-foreground leading-none">
              {stats.totalVendedores}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground truncate">
              vendedores
            </span>
          </div>
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="font-display text-lg xl:text-xl font-bold text-foreground leading-none">
              {stats.totalGerentes}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground truncate">
              gerentes
            </span>
          </div>
        </div>
      ),
      hint: filialId ? "Equipe da sua filial" : `${stats.totalFiliais} filiais ativas`,
      icon: Users,
      gradient: "from-primary/30 via-primary/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(0_100%_52%/0.25)]",
    },
    {
      label: "🎯 Meta Geral",
      value: formatBRL(stats.metaGeral),
      hint: `Faltam ${formatBRL(derived.faltante)}`,
      icon: Target,
      gradient: "from-premium/30 via-premium/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(0_83%_58%/0.25)]",
    },
    {
      label: "💰 Vendas do Mês",
      value: formatBRL(stats.vendasMesAtual),
      hint:
        derived.trend >= 0
          ? `+${derived.trend.toFixed(0)}% vs. 3 dias`
          : `${derived.trend.toFixed(0)}% vs. 3 dias`,
      trendUp: derived.trend >= 0,
      icon: TrendingUp,
      gradient: "from-success/30 via-success/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(168_100%_42%/0.25)]",
      showSpark: true,
    },

    {
      label: "📈 Progresso",
      value: `${derived.progresso.toFixed(0)}%`,
      hint:
        derived.progresso >= 100
          ? "Meta batida"
          : `${(100 - derived.progresso).toFixed(0)}% restante`,
      icon: Gauge,
      gradient: "from-accent/30 via-accent/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(0_100%_42%/0.25)]",
      progress: Math.min(100, derived.progresso),
    },
    {
      label: "📅 Meta do Dia",
      value: formatBRL(derived.metaDoDia),
      hint: `${derived.restantes} dias úteis restantes`,
      icon: CalendarClock,
      gradient: "from-secondary/30 via-secondary/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(0_74%_58%/0.25)]",
    },
  ];


  // ===== KPIs de Ticket Médio (escopo gerente) =====
  const META_TICKET_LOJA = 500;
  // Diretor: meta = soma da meta de ticket de todas as lojas. Gerente: meta da própria loja.
  const numLojasTicket = filialId ? 1 : Math.max(1, ticketsPorLoja.length);
  const META_TICKET = META_TICKET_LOJA * numLojasTicket;
  const progressoTicket = META_TICKET > 0 ? (ticketMes / META_TICKET) * 100 : 0;
  // Meta do dia de ticket: recalcula pelos dias de venda do calendário (exclui domingos).
  // O que não foi atingido nos dias decorridos é redistribuído nos dias restantes.
  const metaDiaTicketLoja = (ticketLoja: number) =>
    Math.max(
      0,
      derived.restantes > 0
        ? (META_TICKET_LOJA * derived.uteisTotal - ticketLoja * derived.uteisDecorridos) /
          derived.restantes
        : META_TICKET_LOJA
    );
  const metaDiaTicket = filialId
    ? metaDiaTicketLoja(ticketMes)
    : ticketsPorLoja.length > 0
    ? ticketsPorLoja.reduce((acc, t) => acc + metaDiaTicketLoja(t), 0)
    : metaDiaTicketLoja(0);

  const evolucaoTicket =
    ticketAnterior > 0
      ? ((ticketMes - ticketAnterior) / ticketAnterior) * 100
      : ticketMes > 0
      ? 100
      : 0;

  const ticketKpis: any[] = [
    {
      label: "🎯 Meta Ticket",
      value: formatBRL(META_TICKET),
      hint: filialId ? "Meta de ticket médio da loja" : "Meta de ticket médio das lojas",
      icon: Target,
      gradient: "from-premium/30 via-premium/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(0_83%_58%/0.25)]",
    },
    {
      label: "💰 Ticket do Mês",
      value: formatBRL(ticketMes),
      hint: "Vendas líquidas ÷ quantidade de vendas",
      icon: TrendingUp,
      gradient: "from-success/30 via-success/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(168_100%_42%/0.25)]",
    },
    {
      label: "📈 Progresso Ticket",
      value: `${progressoTicket.toFixed(0)}%`,
      hint:
        progressoTicket >= 100
          ? "Meta de ticket batida"
          : `${(100 - progressoTicket).toFixed(0)}% restante`,
      icon: Gauge,
      gradient: "from-accent/30 via-accent/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(0_100%_42%/0.25)]",
      progress: Math.min(100, Math.max(0, progressoTicket)),
    },
    {
      label: "📅 Meta do Dia Ticket",
      value: formatBRL(metaDiaTicket),
      hint: `Ticket necessário nos ${derived.restantes} dias úteis`,
      icon: CalendarClock,
      gradient: "from-secondary/30 via-secondary/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(0_74%_58%/0.25)]",
    },
    {
      label: "🚀 Evolução do Ticket",
      value: `${evolucaoTicket >= 0 ? "+" : ""}${evolucaoTicket.toFixed(0)}%`,
      hint: `Mês anterior: ${formatBRL(ticketAnterior)}`,
      trendUp: evolucaoTicket >= 0,
      icon: Radar,
      gradient: "from-primary/30 via-primary/10 to-transparent",
      ring: "shadow-[inset_0_0_0_1px_hsl(0_100%_52%/0.25)]",
    },
  ];


  const valueSizeClass = (v: string) => {
    const len = String(v ?? "").length;
    if (len <= 8) return "text-base xl:text-lg";
    if (len <= 11) return "text-sm xl:text-base";
    if (len <= 14) return "text-xs xl:text-sm";
    if (len <= 17) return "text-[10px] xl:text-xs";
    return "text-[10px]";
  };

  const renderKpi = (k: any, i: number, prefix = "k") => {
    const Icon = k.icon;
    return (
      <div
        key={`${prefix}-${k.label}`}
        className={[
          "group relative overflow-hidden rounded-card p-5 h-full min-h-[170px] flex flex-col",
          "bg-gradient-to-br",
          k.gradient,
          k.ring,
          "backdrop-blur-xl border border-white/5",
          "transition-all duration-300 hover:-translate-y-1 hover:shadow-glow",
        ].join(" ")}
        style={{
          background:
            "linear-gradient(135deg, hsl(0 39% 15% / 0.85), hsl(0 42% 11% / 0.7))",
        }}
      >
        {/* internal glow */}
        <div
          className={`pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${k.gradient} blur-3xl opacity-60`}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold break-words leading-snug">
              {k.label}
            </p>

            {k.customValue ? (
              k.customValue
            ) : (
              <p
                className={`font-display ${valueSizeClass(k.value)} font-bold text-foreground leading-tight whitespace-nowrap overflow-hidden text-ellipsis tracking-tight`}
                title={k.value}
              >
                {k.value}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-white/5 p-2 border border-white/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </div>

        {k.showSpark && derived.sparkline.length > 1 && (
          <div className="relative mt-2 h-10 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={derived.sparkline}>
                <defs>
                  <linearGradient id={`spark-${prefix}-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(168 100% 42%)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="hsl(168 100% 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(168 100% 42%)"
                  strokeWidth={2}
                  fill={`url(#spark-${prefix}-${i})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {typeof k.progress === "number" && (
          <div className="relative mt-3">
            <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary-glow to-premium rounded-full transition-all duration-700"
                style={{ width: `${k.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="relative mt-auto pt-3 flex items-start gap-1.5 text-[11px] text-muted-foreground">
          {k.trendUp === true && <ArrowUpRight className="h-3 w-3 shrink-0 mt-0.5 text-success" />}
          {k.trendUp === false && <ArrowDownRight className="h-3 w-3 shrink-0 mt-0.5 text-warning" />}
          <span className="min-w-0 flex-1 break-words leading-snug">{k.hint}</span>
          <span className="mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-success shadow-[0_0_8px_hsl(168_100%_42%)] animate-pulse" />
        </div>

      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ===== KPI CARDS ===== */}
      <div
        className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-stretch ${
          ticketKpis.length > 0 ? "xl:grid-cols-5" : "xl:grid-cols-6"
        }`}
      >
        {kpis.map((k, i) => renderKpi(k, i))}
      </div>

      {/* ===== KPI CARDS · TICKET MÉDIO ===== */}
      {ticketKpis.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 items-stretch">
          {ticketKpis.map((k, i) => renderKpi(k, i, "t"))}
        </div>
      )}


      {/* ===== CENTRAL: HEATMAP + AI ===== */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Heatmap */}
        <div className="lg:col-span-3 relative overflow-hidden rounded-card border border-white/5 p-6"
          style={{
            background:
              "linear-gradient(135deg, hsl(0 39% 15% / 0.75), hsl(0 42% 11% / 0.6))",
          }}
        >
          <div className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-lg font-bold flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_hsl(0_100%_52%)] animate-pulse" />
                Mapa de Calor Operacional
              </h3>
              <p className="text-xs text-muted-foreground">
                Intensidade de vendas por dia · {derived.totalDias} dias
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>menos</span>
              <div className="flex gap-1">
                {[0.15, 0.3, 0.5, 0.75, 1].map((o) => (
                  <span
                    key={o}
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: `hsl(0 100% 52% / ${o})` }}
                  />
                ))}
              </div>
              <span>mais</span>
            </div>
          </div>

          <Heatmap points={dailySales} loading={loading} />
        </div>

        {/* AI Panel */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-card border border-white/10 p-6"
          style={{
            background:
              "radial-gradient(600px 300px at 100% 0%, hsl(0 100% 52% / 0.18), transparent 60%), linear-gradient(160deg, hsl(0 42% 11% / 0.9), hsl(0 49% 9% / 0.95))",
          }}
        >
          {/* scanline */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, white 0 1px, transparent 1px 3px)",
            }}
          />
          <div className="relative flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl bg-primary blur-lg opacity-60 animate-pulse" />
                <div className="relative rounded-xl bg-gradient-to-br from-primary to-accent p-2">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h3 className="font-display text-lg font-bold leading-tight">
                  Central de IA
                </h3>
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  Command · Live
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2 py-1 text-[10px] font-semibold text-success">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              ATIVO
            </span>
          </div>

          <div className="relative space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {aiCards.map((c, i) => {
              const Icon = c.icone;
              return (
                <div
                  key={i}
                  className={`group relative rounded-2xl border border-white/5 bg-gradient-to-br ${c.cor} p-4 transition-all hover:border-white/15 hover:translate-x-0.5`}
                  style={{
                    background:
                      "linear-gradient(135deg, hsl(0 39% 15% / 0.7), hsl(0 42% 11% / 0.5))",
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-lg bg-white/5 p-2 border border-white/10">
                      <Icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] uppercase tracking-[0.16em] font-bold text-primary">
                          {c.tipo}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-foreground leading-snug">
                        {c.titulo}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {c.texto}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- Heatmap -------- */
function Heatmap({ points, loading }: { points: DailyPoint[]; loading: boolean }) {
  const max = Math.max(1, ...points.map((p) => p.total));

  if (loading) {
    return (
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg skeleton" />
        ))}
      </div>
    );
  }

  // Build 7-col grid (Sun..Sat) with offset for first day
  // Exclude Sundays (weekday 0) from heatmap
  const visiblePoints = points.filter((p) => p.weekday !== 0);
  if (visiblePoints.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados no período.</p>;
  }
  const firstWeekday = visiblePoints[0].weekday; // 1..6
  const cells: (DailyPoint | null)[] = [];
  // Grid is 6 columns: Seg..Sáb (weekday 1..6)
  for (let i = 0; i < firstWeekday - 1; i++) cells.push(null);
  visiblePoints.forEach((p) => cells.push(p));

  const diasSemana = ["S", "T", "Q", "Q", "S", "S"];

  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {diasSemana.map((d, i) => (
          <div key={i} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="aspect-square" />;
          const intensity = c.total / max;
          const opacity = c.total === 0 ? 0.05 : Math.max(0.15, intensity);
          return (
            <div
              key={i}
              className="group relative aspect-square rounded-lg border border-white/5 transition-all hover:scale-110 hover:border-primary/40 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, hsl(0 100% 52% / ${opacity}), hsl(0 83% 58% / ${
                  opacity * 0.6
                }))`,
                boxShadow: intensity > 0.5 ? `0 0 12px hsl(0 100% 52% / ${intensity * 0.4})` : "none",
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground/80">
                {c.dia}
              </span>
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20 hidden group-hover:block whitespace-nowrap rounded-lg bg-surface-3 border border-white/10 px-2 py-1 text-[10px] shadow-lg">
                Dia {c.dia} · {c.total > 0 ? `R$ ${c.total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "sem vendas"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
