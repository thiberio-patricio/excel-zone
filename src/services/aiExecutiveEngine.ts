// AIExecutiveEngine
// Motor de análise comercial da IA Executiva (ANA).
// Analisa faturamento, meta, ticket médio, quantidade de vendas, conversão,
// clientes atendidos, rankings (vendedores e lojas), crescimento, queda e
// tendências; compara períodos automaticamente e gera insights, alertas,
// recomendações, projeções e o Score Comercial de risco.

import { supabase } from "@/integrations/supabase/client";
import { toLocalISO } from "@/utils/dateISO";
import { criarMetaResolver } from "@/utils/metaResolver";


export const META_TICKET_PADRAO = 500;

/* ------------------------------------------------------------------ tipos */

export type ScoreNivel = "VERDE" | "AMARELO" | "LARANJA" | "VERMELHO";

export interface ScoreComercial {
  nivel: ScoreNivel;
  /** 0 a 100 — quanto maior, mais saudável */
  pontos: number;
  rotulo: string;
  descricao: string;
  motivos: string[];
}

export interface PeriodoMetrics {
  label: string;
  inicio: string;
  fim: string;
  faturamento: number;
  meta: number;
  atingimento: number;
  quantidadeVendas: number;
  clientesAtendidos: number;
  ticketMedio: number;
  metaTicket: number;
  /** Vendas por dia com movimento — usado como proxy de conversão */
  conversao: number;
  diasComVenda: number;
}

export interface Comparativo {
  label: string;
  atual: PeriodoMetrics;
  anterior: PeriodoMetrics;
  variacaoFaturamento: number;
  variacaoTicket: number;
  variacaoQuantidade: number;
  variacaoConversao: number;
}

export interface RankingItem {
  id: string;
  nome: string;
  faturamento: number;
  meta: number;
  atingimento: number;
  ticketMedio: number;
  quantidadeVendas: number;
  crescimento: number;
  score: ScoreComercial;
}

export interface TendenciaPonto {
  data: string;
  dia: number;
  faturamento: number;
  mediaMovel: number;
}

export interface EngineInsight {
  tipo: "insight" | "alerta" | "recomendacao";
  severidade: ScoreNivel;
  titulo: string;
  texto: string;
}

export interface Projecoes {
  /** Projeção de faturamento no fim do mês pelo ritmo atual */
  faturamentoMes: number;
  metaMes: number;
  atingimentoProjetado: number;
  mediaDiaria: number;
  diasUteisRestantes: number;
  necessarioPorDia: number;
  ticketProjetado: number;
}

export interface AIExecutiveAnalysis {
  geradoEm: string;
  escopo: { tipo: "empresa" | "filial" | "vendedor"; nome: string };
  score: ScoreComercial;
  hoje: PeriodoMetrics;
  mes: PeriodoMetrics;
  comparativos: {
    hojeVsOntem: Comparativo;
    semanaVsAnterior: Comparativo;
    mesVsAnterior: Comparativo;
    mesmoPeriodoMesAnterior: Comparativo;
  };
  rankingVendedores: RankingItem[];
  rankingLojas: RankingItem[];
  tendencia: TendenciaPonto[];
  insights: EngineInsight[];
  alertas: EngineInsight[];
  recomendacoes: EngineInsight[];
  projecoes: Projecoes;
}

export interface EngineScope {
  /** Limita a análise a uma filial */
  filialId?: string | null;
  /** Limita a análise a um vendedor */
  vendedorId?: string | null;
  /** Nome exibido do escopo */
  nome?: string;
}

/* --------------------------------------------------------------- utilitários */

const NIVEL_META: Record<ScoreNivel, { rotulo: string; descricao: string }> = {
  VERDE: { rotulo: "Verde", descricao: "Situação saudável." },
  AMARELO: { rotulo: "Amarelo", descricao: "Atenção." },
  LARANJA: { rotulo: "Laranja", descricao: "Risco moderado." },
  VERMELHO: { rotulo: "Vermelho", descricao: "Risco elevado." },
};

export const SCORE_CORES: Record<ScoreNivel, { hsl: string; text: string; bg: string; border: string }> = {
  VERDE: { hsl: "160 84% 45%", text: "text-emerald-400", bg: "bg-emerald-500/12", border: "border-emerald-500/35" },
  AMARELO: { hsl: "45 96% 56%", text: "text-yellow-400", bg: "bg-yellow-500/12", border: "border-yellow-500/35" },
  LARANJA: { hsl: "28 96% 56%", text: "text-orange-400", bg: "bg-orange-500/12", border: "border-orange-500/35" },
  VERMELHO: { hsl: "0 100% 60%", text: "text-red-400", bg: "bg-red-500/12", border: "border-red-500/35" },
};

const NIVEL_ORDEM: ScoreNivel[] = ["VERDE", "AMARELO", "LARANJA", "VERMELHO"];

const piorNivel = (a: ScoreNivel, b: ScoreNivel): ScoreNivel =>
  NIVEL_ORDEM.indexOf(a) >= NIVEL_ORDEM.indexOf(b) ? a : b;

/** Aumenta o risco em N degraus */
const escalar = (n: ScoreNivel, degraus = 1): ScoreNivel =>
  NIVEL_ORDEM[Math.min(NIVEL_ORDEM.length - 1, NIVEL_ORDEM.indexOf(n) + degraus)];

const variacao = (atual: number, anterior: number) => {
  if (!anterior) return atual > 0 ? 100 : 0;
  return ((atual - anterior) / anterior) * 100;
};

const isDomingo = (iso: string) => new Date(`${iso}T12:00:00`).getDay() === 0;

const rangeDias = (inicio: string, fim: string) => {
  const dias: string[] = [];
  const d = new Date(`${inicio}T12:00:00`);
  const end = new Date(`${fim}T12:00:00`);
  while (d <= end) {
    dias.push(toLocalISO(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
};

const diasUteis = (inicio: string, fim: string, feriados: Set<string>) =>
  rangeDias(inicio, fim).filter((d) => !isDomingo(d) && !feriados.has(d)).length;

/* ------------------------------------------------------- regras de pontuação */

/**
 * Score Comercial — classificação de risco.
 * Regras base (queda de faturamento vs período de comparação):
 *  > 10% = AMARELO | > 20% = LARANJA | > 30% = VERMELHO
 * Agravantes: meta abaixo do esperado, ticket médio em queda, conversão em queda.
 */
export function calcularScore(input: {
  quedaFaturamento: number; // % negativo = queda
  atingimentoMeta: number; // % da meta atingida
  atingimentoEsperado: number; // % esperado até o momento (proporcional)
  variacaoTicket: number;
  variacaoConversao: number;
}): ScoreComercial {
  const { quedaFaturamento, atingimentoMeta, atingimentoEsperado, variacaoTicket, variacaoConversao } = input;
  const motivos: string[] = [];
  let nivel: ScoreNivel = "VERDE";
  let pontos = 100;

  const queda = quedaFaturamento < 0 ? Math.abs(quedaFaturamento) : 0;
  if (queda > 30) {
    nivel = "VERMELHO";
    pontos -= 45;
    motivos.push(`Queda de faturamento de ${queda.toFixed(1)}% (acima de 30%)`);
  } else if (queda > 20) {
    nivel = "LARANJA";
    pontos -= 30;
    motivos.push(`Queda de faturamento de ${queda.toFixed(1)}% (acima de 20%)`);
  } else if (queda > 10) {
    nivel = "AMARELO";
    pontos -= 18;
    motivos.push(`Queda de faturamento de ${queda.toFixed(1)}% (acima de 10%)`);
  }

  const gapMeta = atingimentoEsperado - atingimentoMeta;
  if (gapMeta > 20) {
    nivel = escalar(nivel, 2);
    pontos -= 25;
    motivos.push(
      `Meta muito abaixo do esperado: ${atingimentoMeta.toFixed(1)}% realizado x ${atingimentoEsperado.toFixed(1)}% esperado`
    );
  } else if (gapMeta > 8) {
    nivel = escalar(nivel, 1);
    pontos -= 14;
    motivos.push(
      `Meta abaixo do esperado: ${atingimentoMeta.toFixed(1)}% realizado x ${atingimentoEsperado.toFixed(1)}% esperado`
    );
  }

  if (variacaoTicket < -5) {
    nivel = escalar(nivel, variacaoTicket < -15 ? 2 : 1);
    pontos -= variacaoTicket < -15 ? 18 : 10;
    motivos.push(`Ticket médio em queda de ${Math.abs(variacaoTicket).toFixed(1)}%`);
  }

  if (variacaoConversao < -5) {
    nivel = escalar(nivel, variacaoConversao < -15 ? 2 : 1);
    pontos -= variacaoConversao < -15 ? 15 : 8;
    motivos.push(`Conversão em queda de ${Math.abs(variacaoConversao).toFixed(1)}%`);
  }

  if (!motivos.length) {
    motivos.push(
      atingimentoMeta >= atingimentoEsperado
        ? "Faturamento estável e meta em ritmo adequado"
        : "Indicadores sem desvios relevantes"
    );
  }

  return {
    nivel,
    pontos: Math.max(0, Math.min(100, Math.round(pontos))),
    rotulo: NIVEL_META[nivel].rotulo,
    descricao: NIVEL_META[nivel].descricao,
    motivos,
  };
}

/* -------------------------------------------------------------- dados brutos */

interface VendaRow {
  vendedor_id: string;
  data: string;
  valor: number;
  devolucao: number;
  quantidade_vendas: number;
}

interface MetaRow {
  vendedor_id: string;
  mes: number;
  ano: number;
  valor_meta: number;
  meta_ticket: number | null;
}

const somaVenda = (v: VendaRow) => (Number(v.valor) || 0) - (Number(v.devolucao) || 0);

function metricsDe(
  label: string,
  inicio: string,
  fim: string,
  vendas: VendaRow[],
  metaPeriodo: number,
  metaTicket: number
): PeriodoMetrics {
  const dentro = vendas.filter((v) => v.data >= inicio && v.data <= fim);
  const faturamento = dentro.reduce((a, v) => a + somaVenda(v), 0);
  const quantidadeVendas = dentro.reduce((a, v) => a + (Number(v.quantidade_vendas) || 0), 0);
  const diasComVenda = new Set(dentro.filter((v) => somaVenda(v) > 0).map((v) => v.data)).size;
  return {
    label,
    inicio,
    fim,
    faturamento,
    meta: metaPeriodo,
    atingimento: metaPeriodo > 0 ? (faturamento / metaPeriodo) * 100 : 0,
    quantidadeVendas,
    clientesAtendidos: quantidadeVendas,
    ticketMedio: quantidadeVendas > 0 ? faturamento / quantidadeVendas : 0,
    metaTicket,
    conversao: diasComVenda > 0 ? quantidadeVendas / diasComVenda : 0,
    diasComVenda,
  };
}

function comparar(label: string, atual: PeriodoMetrics, anterior: PeriodoMetrics): Comparativo {
  return {
    label,
    atual,
    anterior,
    variacaoFaturamento: variacao(atual.faturamento, anterior.faturamento),
    variacaoTicket: variacao(atual.ticketMedio, anterior.ticketMedio),
    variacaoQuantidade: variacao(atual.quantidadeVendas, anterior.quantidadeVendas),
    variacaoConversao: variacao(atual.conversao, anterior.conversao),
  };
}

const fmtBRL = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/* ------------------------------------------------------------------- engine */

export const AIExecutiveEngine = {
  calcularScore,

  /** Executa a análise completa para o escopo informado. */
  async analisar(scope: EngineScope = {}, referencia = new Date()): Promise<AIExecutiveAnalysis> {
    const hojeISO = toLocalISO(referencia);
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth() + 1;

    const inicioMes = toLocalISO(new Date(ano, mes - 1, 1));
    const fimMes = toLocalISO(new Date(ano, mes, 0));
    const inicioMesAnterior = toLocalISO(new Date(ano, mes - 2, 1));
    const fimMesAnterior = toLocalISO(new Date(ano, mes - 1, 0));

    const ontem = new Date(referencia);
    ontem.setDate(ontem.getDate() - 1);
    const ontemISO = toLocalISO(ontem);

    // Semana atual (segunda a hoje) x semana anterior (mesmo intervalo)
    const diaSemana = referencia.getDay();
    const offsetSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
    const segundaAtual = new Date(referencia);
    segundaAtual.setDate(segundaAtual.getDate() - offsetSegunda);
    const segundaAnterior = new Date(segundaAtual);
    segundaAnterior.setDate(segundaAnterior.getDate() - 7);
    const fimSemanaAnterior = new Date(referencia);
    fimSemanaAnterior.setDate(fimSemanaAnterior.getDate() - 7);

    // Mesmo período do mês anterior (dia 1 até o mesmo dia)
    const diaHoje = referencia.getDate();
    const ultimoDiaMesAnterior = new Date(ano, mes - 1, 0).getDate();
    const mesmoPeriodoFim = toLocalISO(
      new Date(ano, mes - 2, Math.min(diaHoje, ultimoDiaMesAnterior))
    );

    // Perfis do escopo
    let perfilQuery = supabase.from("profiles").select("id, nome, filial_id");
    if (scope.vendedorId) perfilQuery = perfilQuery.eq("id", scope.vendedorId);
    else if (scope.filialId) perfilQuery = perfilQuery.eq("filial_id", scope.filialId);

    const [perfisRes, rolesRes, filiaisRes, feriadosRes, feriasRes] = await Promise.all([
      perfilQuery,
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("filiais").select("id, nome"),
      supabase
        .from("feriados")
        .select("data, filial_id")
        .gte("data", inicioMesAnterior)
        .lte("data", fimMes),
      supabase
        .from("ferias")
        .select("vendedor_id, data_inicio, data_fim")
        .lte("data_inicio", fimMes)
        .gte("data_fim", inicioMes),
    ]);


    const vendedoresIds = new Set(
      ((rolesRes.data ?? []) as { user_id: string; role: string }[])
        .filter((r) => r.role === "vendedor")
        .map((r) => String(r.user_id))
    );
    const perfis = ((perfisRes.data ?? []) as { id: string; nome: string; filial_id: string | null }[]).filter((p) =>
      vendedoresIds.has(String(p.id))
    );
    const filiais = (filiaisRes.data ?? []) as { id: string; nome: string }[];
    const ids = perfis.map((p) => p.id);

    const feriados = new Set(
      ((feriadosRes.data ?? []) as { data: string; filial_id: string | null }[])
        .filter((f) => !f.filial_id || !scope.filialId || f.filial_id === scope.filialId)
        .map((f) => String(f.data))
    );
    const emFerias = new Set(((feriasRes.data ?? []) as { vendedor_id: string }[]).map((f) => f.vendedor_id));

    let vendas: VendaRow[] = [];
    let metas: MetaRow[] = [];

    if (ids.length) {
      const [vendasRes, metasRes] = await Promise.all([
        supabase
          .from("vendas")
          .select("vendedor_id, data, valor, devolucao, quantidade_vendas")
          .in("vendedor_id", ids)
          .gte("data", inicioMesAnterior)
          .lte("data", fimMes),
        // Todas as metas do vendedor: o resolver aplica fallback quando o mês
        // analisado ainda não tem metas lançadas (evita atingimentos irreais).
        supabase.from("metas").select("vendedor_id, mes, ano, valor_meta, meta_ticket").in("vendedor_id", ids),
      ]);
      vendas = ((vendasRes.data ?? []) as any[]).map((v) => ({
        vendedor_id: v.vendedor_id,
        data: String(v.data),
        valor: Number(v.valor) || 0,
        devolucao: Number(v.devolucao) || 0,
        quantidade_vendas: Number(v.quantidade_vendas) || 0,
      }));
      metas = (metasRes.data ?? []) as MetaRow[];
    }

    const metaResolver = criarMetaResolver(metas);
    const metaMesDe = (m: number, a: number) => metaResolver.somaMetas(ids, m, a).valorMeta;

    const metaMesAtual = metaMesDe(mes, ano);
    const metaMesAnt = metaMesDe(mes === 1 ? 12 : mes - 1, mes === 1 ? ano - 1 : ano);
    // Ticket é uma média — comparar com a média das metas de ticket reais.
    const metaTicketTotal = metaResolver.somaMetas(ids, mes, ano).metaTicketMedia;


    const uteisMes = diasUteis(inicioMes, fimMes, feriados);
    const uteisAteHoje = diasUteis(inicioMes, hojeISO, feriados);
    const uteisRestantes = Math.max(0, diasUteis(hojeISO, fimMes, feriados) - (isDomingo(hojeISO) ? 0 : 1));
    const metaDia = uteisMes > 0 ? metaMesAtual / uteisMes : 0;

    // proporção de meta por período
    const metaEntre = (ini: string, fim: string, metaTotal: number, uteisRef: number) =>
      uteisRef > 0 ? (metaTotal / uteisRef) * diasUteis(ini, fim, feriados) : 0;

    const mHoje = metricsDe("Hoje", hojeISO, hojeISO, vendas, metaDia, metaTicketTotal);
    const mOntem = metricsDe("Ontem", ontemISO, ontemISO, vendas, metaDia, metaTicketTotal);
    const mSemana = metricsDe(
      "Semana atual",
      toLocalISO(segundaAtual),
      hojeISO,
      vendas,
      metaEntre(toLocalISO(segundaAtual), hojeISO, metaMesAtual, uteisMes),
      metaTicketTotal
    );
    const mSemanaAnt = metricsDe(
      "Semana anterior",
      toLocalISO(segundaAnterior),
      toLocalISO(fimSemanaAnterior),
      vendas,
      metaEntre(toLocalISO(segundaAnterior), toLocalISO(fimSemanaAnterior), metaMesAtual, uteisMes),
      metaTicketTotal
    );
    const mMes = metricsDe("Mês atual", inicioMes, fimMes, vendas, metaMesAtual, metaTicketTotal);
    const mMesAnt = metricsDe("Mês anterior", inicioMesAnterior, fimMesAnterior, vendas, metaMesAnt, metaTicketTotal);
    const mMesmoPeriodo = metricsDe(
      "Mesmo período do mês anterior",
      inicioMesAnterior,
      mesmoPeriodoFim,
      vendas,
      metaEntre(inicioMesAnterior, mesmoPeriodoFim, metaMesAnt, diasUteis(inicioMesAnterior, fimMesAnterior, feriados)),
      metaTicketTotal
    );
    const mMesAteHoje = metricsDe("Mês até hoje", inicioMes, hojeISO, vendas, metaMesAtual, metaTicketTotal);

    const comparativos = {
      hojeVsOntem: comparar("Hoje x Ontem", mHoje, mOntem),
      semanaVsAnterior: comparar("Semana atual x Semana anterior", mSemana, mSemanaAnt),
      mesVsAnterior: comparar("Mês atual x Mês anterior", mMes, mMesAnt),
      mesmoPeriodoMesAnterior: comparar("Mês até hoje x Mesmo período do mês anterior", mMesAteHoje, mMesmoPeriodo),
    };

    // Score consolidado
    const atingimentoEsperado = uteisMes > 0 ? (uteisAteHoje / uteisMes) * 100 : 0;
    const score = calcularScore({
      quedaFaturamento: comparativos.mesmoPeriodoMesAnterior.variacaoFaturamento,
      atingimentoMeta: mMesAteHoje.atingimento,
      atingimentoEsperado,
      variacaoTicket: comparativos.mesmoPeriodoMesAnterior.variacaoTicket,
      variacaoConversao: comparativos.mesmoPeriodoMesAnterior.variacaoConversao,
    });

    /* ---------------------------------------------------------- rankings */

    const rankingVendedores: RankingItem[] = perfis
      .map((p) => {
        const doVendedor = vendas.filter((v) => v.vendedor_id === p.id);
        const atual = metricsDe(
          p.nome,
          inicioMes,
          hojeISO,
          doVendedor,
          metaResolver.resolver(p.id, mes, ano)?.valorMeta ?? 0,
          metaResolver.resolver(p.id, mes, ano)?.metaTicket ?? META_TICKET_PADRAO

        );
        const anterior = metricsDe(p.nome, inicioMesAnterior, mesmoPeriodoFim, doVendedor, 0, META_TICKET_PADRAO);
        const cresc = variacao(atual.faturamento, anterior.faturamento);
        return {
          id: p.id,
          nome: p.nome,
          faturamento: atual.faturamento,
          meta: atual.meta,
          atingimento: atual.atingimento,
          ticketMedio: atual.ticketMedio,
          quantidadeVendas: atual.quantidadeVendas,
          crescimento: cresc,
          score: emFerias.has(p.id)
            ? { ...NIVEL_META.VERDE, nivel: "VERDE" as ScoreNivel, pontos: 100, motivos: ["Vendedor com férias no período"] }
            : calcularScore({
                quedaFaturamento: cresc,
                atingimentoMeta: atual.atingimento,
                atingimentoEsperado,
                variacaoTicket: variacao(atual.ticketMedio, anterior.ticketMedio),
                variacaoConversao: variacao(atual.conversao, anterior.conversao),
              }),
        };
      })
      .sort((a, b) => b.faturamento - a.faturamento);

    const rankingLojas: RankingItem[] = filiais
      .filter((f) => !scope.filialId || f.id === scope.filialId)
      .map((f) => {
        const membros = perfis.filter((p) => p.filial_id === f.id).map((p) => p.id);
        const doGrupo = vendas.filter((v) => membros.includes(v.vendedor_id));
        const metasLoja = metaResolver.somaMetas(membros, mes, ano);
        const atual = metricsDe(f.nome, inicioMes, hojeISO, doGrupo, metasLoja.valorMeta, metasLoja.metaTicketMedia);

        const anterior = metricsDe(f.nome, inicioMesAnterior, mesmoPeriodoFim, doGrupo, 0, 0);
        const cresc = variacao(atual.faturamento, anterior.faturamento);
        return {
          id: f.id,
          nome: f.nome,
          faturamento: atual.faturamento,
          meta: atual.meta,
          atingimento: atual.atingimento,
          ticketMedio: atual.ticketMedio,
          quantidadeVendas: atual.quantidadeVendas,
          crescimento: cresc,
          score: calcularScore({
            quedaFaturamento: cresc,
            atingimentoMeta: atual.atingimento,
            atingimentoEsperado,
            variacaoTicket: variacao(atual.ticketMedio, anterior.ticketMedio),
            variacaoConversao: variacao(atual.conversao, anterior.conversao),
          }),
        };
      })
      .filter((l) => l.faturamento > 0 || l.meta > 0)
      .sort((a, b) => b.atingimento - a.atingimento);

    /* --------------------------------------------------------- tendência */

    const porDia = new Map<string, number>();
    vendas
      .filter((v) => v.data >= inicioMes && v.data <= hojeISO)
      .forEach((v) => porDia.set(v.data, (porDia.get(v.data) ?? 0) + somaVenda(v)));

    const diasDoMes = rangeDias(inicioMes, hojeISO);
    const tendencia: TendenciaPonto[] = diasDoMes.map((d, i) => {
      const janela = diasDoMes.slice(Math.max(0, i - 6), i + 1);
      const media = janela.reduce((s, x) => s + (porDia.get(x) ?? 0), 0) / janela.length;
      return {
        data: d,
        dia: Number(d.slice(8, 10)),
        faturamento: porDia.get(d) ?? 0,
        mediaMovel: media,
      };
    });

    /* --------------------------------------------------------- projeções */

    const mediaDiaria = uteisAteHoje > 0 ? mMesAteHoje.faturamento / uteisAteHoje : 0;
    const faturamentoProjetado = mMesAteHoje.faturamento + mediaDiaria * uteisRestantes;
    const faltante = Math.max(0, metaMesAtual - mMesAteHoje.faturamento);
    const projecoes: Projecoes = {
      faturamentoMes: faturamentoProjetado,
      metaMes: metaMesAtual,
      atingimentoProjetado: metaMesAtual > 0 ? (faturamentoProjetado / metaMesAtual) * 100 : 0,
      mediaDiaria,
      diasUteisRestantes: uteisRestantes,
      necessarioPorDia: uteisRestantes > 0 ? faltante / uteisRestantes : faltante,
      ticketProjetado: mMesAteHoje.ticketMedio,
    };

    /* ------------------------------------------- insights / alertas / recs */

    const insights: EngineInsight[] = [];
    const alertas: EngineInsight[] = [];
    const recomendacoes: EngineInsight[] = [];

    const push = (
      arr: EngineInsight[],
      tipo: EngineInsight["tipo"],
      severidade: ScoreNivel,
      titulo: string,
      texto: string
    ) => arr.push({ tipo, severidade, titulo, texto });

    push(
      insights,
      "insight",
      score.nivel,
      "Ritmo do mês",
      `Faturamento de ${fmtBRL(mMesAteHoje.faturamento)} (${mMesAteHoje.atingimento.toFixed(1)}% da meta), com ${atingimentoEsperado.toFixed(
        1
      )}% esperado para este ponto do mês. Média diária de ${fmtBRL(mediaDiaria)} em ${uteisAteHoje} dia(s) útil(eis).`
    );
    push(
      insights,
      "insight",
      comparativos.hojeVsOntem.variacaoFaturamento < 0 ? "AMARELO" : "VERDE",
      "Hoje x Ontem",
      `Hoje ${fmtBRL(mHoje.faturamento)} contra ${fmtBRL(mOntem.faturamento)} ontem (${comparativos.hojeVsOntem.variacaoFaturamento.toFixed(
        1
      )}%).`
    );
    push(
      insights,
      "insight",
      comparativos.semanaVsAnterior.variacaoFaturamento < 0 ? "AMARELO" : "VERDE",
      "Semana x Semana anterior",
      `${fmtBRL(mSemana.faturamento)} contra ${fmtBRL(mSemanaAnt.faturamento)} (${comparativos.semanaVsAnterior.variacaoFaturamento.toFixed(
        1
      )}%). Ticket médio ${fmtBRL(mSemana.ticketMedio)}.`
    );
    push(
      insights,
      "insight",
      "VERDE",
      "Comparativo mensal",
      `Mês até hoje ${fmtBRL(mMesAteHoje.faturamento)} x mesmo período do mês anterior ${fmtBRL(
        mMesmoPeriodo.faturamento
      )} (${comparativos.mesmoPeriodoMesAnterior.variacaoFaturamento.toFixed(1)}%).`
    );

    if (rankingLojas.length) {
      const melhor = rankingLojas[0];
      const pior = rankingLojas[rankingLojas.length - 1];
      push(
        insights,
        "insight",
        "VERDE",
        "Ranking de lojas",
        `Liderança: ${melhor.nome} com ${melhor.atingimento.toFixed(1)}% da meta. Última posição: ${pior.nome} com ${pior.atingimento.toFixed(
          1
        )}%.`
      );
    }
    if (rankingVendedores.length) {
      const top = rankingVendedores[0];
      push(
        insights,
        "insight",
        "VERDE",
        "Ranking de vendedores",
        `${top.nome} lidera com ${fmtBRL(top.faturamento)} e ticket médio de ${fmtBRL(top.ticketMedio)}.`
      );
    }

    const quedaMes = comparativos.mesmoPeriodoMesAnterior.variacaoFaturamento;
    if (quedaMes < -10) {
      push(
        alertas,
        "alerta",
        quedaMes < -30 ? "VERMELHO" : quedaMes < -20 ? "LARANJA" : "AMARELO",
        "Queda de faturamento",
        `Retração de ${Math.abs(quedaMes).toFixed(1)}% contra o mesmo período do mês anterior.`
      );
    }
    if (mMesAteHoje.atingimento + 8 < atingimentoEsperado) {
      push(
        alertas,
        "alerta",
        mMesAteHoje.atingimento + 20 < atingimentoEsperado ? "LARANJA" : "AMARELO",
        "Meta abaixo do esperado",
        `Realizado ${mMesAteHoje.atingimento.toFixed(1)}% da meta contra ${atingimentoEsperado.toFixed(
          1
        )}% esperado. Faltam ${fmtBRL(faltante)} em ${uteisRestantes} dia(s) útil(eis).`
      );
    }
    if (comparativos.mesmoPeriodoMesAnterior.variacaoTicket < -5) {
      push(
        alertas,
        "alerta",
        "AMARELO",
        "Ticket médio em queda",
        `Ticket de ${fmtBRL(mMesAteHoje.ticketMedio)}, ${Math.abs(
          comparativos.mesmoPeriodoMesAnterior.variacaoTicket
        ).toFixed(1)}% abaixo do mesmo período anterior.`
      );
    }
    if (comparativos.mesmoPeriodoMesAnterior.variacaoConversao < -5) {
      push(
        alertas,
        "alerta",
        "AMARELO",
        "Conversão em queda",
        `Média de ${mMesAteHoje.conversao.toFixed(1)} venda(s) por dia de movimento, ${Math.abs(
          comparativos.mesmoPeriodoMesAnterior.variacaoConversao
        ).toFixed(1)}% abaixo do período de comparação.`
      );
    }
    rankingVendedores
      .filter((v) => v.score.nivel === "VERMELHO" || v.score.nivel === "LARANJA")
      .slice(0, 5)
      .forEach((v) =>
        push(
          alertas,
          "alerta",
          v.score.nivel,
          `Vendedor em risco: ${v.nome}`,
          `${v.atingimento.toFixed(1)}% da meta, crescimento ${v.crescimento.toFixed(1)}%, ticket ${fmtBRL(v.ticketMedio)}.`
        )
      );
    rankingLojas
      .filter((l) => l.score.nivel === "VERMELHO" || l.score.nivel === "LARANJA")
      .slice(0, 5)
      .forEach((l) =>
        push(
          alertas,
          "alerta",
          l.score.nivel,
          `Loja em risco: ${l.nome}`,
          `${l.atingimento.toFixed(1)}% da meta com variação de ${l.crescimento.toFixed(1)}% no comparativo mensal.`
        )
      );

    if (projecoes.atingimentoProjetado < 100 && metaMesAtual > 0) {
      push(
        recomendacoes,
        "recomendacao",
        "LARANJA",
        "Acelerar ritmo diário",
        `Projeção de ${projecoes.atingimentoProjetado.toFixed(1)}% da meta. É necessário ${fmtBRL(
          projecoes.necessarioPorDia
        )} por dia útil restante — redistribua metas diárias e priorize acompanhamento individual.`
      );
    } else if (metaMesAtual > 0) {
      push(
        recomendacoes,
        "recomendacao",
        "VERDE",
        "Sustentar performance",
        `Projeção de ${projecoes.atingimentoProjetado.toFixed(1)}% da meta. Mantenha a rotina atual e reconheça publicamente os destaques.`
      );
    }
    if (mMesAteHoje.ticketMedio < META_TICKET_PADRAO) {
      push(
        recomendacoes,
        "recomendacao",
        "AMARELO",
        "Elevar ticket médio",
        `Ticket em ${fmtBRL(mMesAteHoje.ticketMedio)} contra meta de ${fmtBRL(
          META_TICKET_PADRAO
        )} por vendedor. Trabalhe venda adicional e combinações de produtos no atendimento.`
      );
    }
    const piores = rankingVendedores.filter((v) => v.score.nivel !== "VERDE").slice(0, 3);
    if (piores.length) {
      push(
        recomendacoes,
        "recomendacao",
        "LARANJA",
        "Plano de recuperação individual",
        `Priorize acompanhamento diário de ${piores.map((v) => v.nome).join(", ")} com metas parciais e feedback estruturado.`
      );
    }

    const escopoTipo: "empresa" | "filial" | "vendedor" = scope.vendedorId
      ? "vendedor"
      : scope.filialId
      ? "filial"
      : "empresa";

    return {
      geradoEm: new Date().toISOString(),
      escopo: { tipo: escopoTipo, nome: scope.nome ?? (escopoTipo === "empresa" ? "Rede" : "") },
      score,
      hoje: mHoje,
      mes: mMesAteHoje,
      comparativos,
      rankingVendedores,
      rankingLojas,
      tendencia,
      insights,
      alertas,
      recomendacoes,
      projecoes,
    };
  },
};

export default AIExecutiveEngine;
