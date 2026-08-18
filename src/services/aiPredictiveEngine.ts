// AIPredictiveEngine
// Previsão automática de fechamento do mês por loja e para a rede.
// Calcula probabilidade de atingir meta, projeção de faturamento, ticket médio,
// conversão, percentual de confiança e recomendações preventivas.

import { supabase } from "@/integrations/supabase/client";
import { toLocalISO } from "@/utils/dateISO";

export const META_TICKET_PADRAO = 500;

export type NivelPrevisao = "provavel" | "possivel" | "improvavel";

export interface PrevisaoLoja {
  id: string;
  nome: string;
  /** Faturamento realizado no mês até hoje */
  realizado: number;
  meta: number;
  /** Projeção de faturamento no fechamento do mês */
  projecaoFaturamento: number;
  atingimentoProjetado: number;
  /** 0 a 100 — probabilidade estatística de bater a meta */
  probabilidadeMeta: number;
  nivel: NivelPrevisao;
  /** 0 a 100 — confiança do modelo, baseada no volume e estabilidade dos dados */
  confianca: number;
  mediaDiaria: number;
  ritmoRecente: number;
  necessarioPorDia: number;
  diasUteisDecorridos: number;
  diasUteisRestantes: number;
  ticketAtual: number;
  ticketProjetado: number;
  metaTicket: number;
  conversaoAtual: number;
  conversaoProjetada: number;
  quantidadeVendas: number;
  quantidadeProjetada: number;
  /** Intervalo de projeção (pessimista / otimista) */
  faixaMin: number;
  faixaMax: number;
  recomendacoes: string[];
}

export interface PrevisaoMensal {
  geradoEm: string;
  mesLabel: string;
  diasUteisDecorridos: number;
  diasUteisRestantes: number;
  rede: PrevisaoLoja;
  lojas: PrevisaoLoja[];
  /** Séries para o gráfico de projeção acumulada */
  serie: { dia: number; realizado: number | null; projetado: number; meta: number }[];
  recomendacoesGerais: string[];
}

/* ------------------------------------------------------------- utilitários */

const fmtBRL = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const clamp = (v: number, min = 0, max = 100) => Math.min(max, Math.max(min, v));

/** Aproximação da função de distribuição normal acumulada. */
function normalCdf(z: number) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z >= 0 ? 1 - p : p;
}

function desvioPadrao(valores: number[]) {
  if (valores.length < 2) return 0;
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  const variancia = valores.reduce((s, v) => s + (v - media) ** 2, 0) / (valores.length - 1);
  return Math.sqrt(variancia);
}

interface DiaAgg {
  data: string;
  valor: number;
  quantidade: number;
}

interface Bruto {
  vendas: { vendedor_id: string; data: string; valor: number; devolucao: number; quantidade_vendas: number }[];
  metaPorVendedor: Map<string, number>;
  filialDe: Map<string, string | null>;
  vendedoresDaFilial: Map<string, string[]>;
  filiais: { id: string; nome: string }[];
  feriados: Map<string, Set<string>>; // filialId|'rede' -> datas
}

/* --------------------------------------------------------------- núcleo */

function calcularPrevisao(
  id: string,
  nome: string,
  dias: DiaAgg[],
  meta: number,
  metaTicket: number,
  diasUteisTotais: string[],
  hojeISO: string
): PrevisaoLoja {
  const decorridos = diasUteisTotais.filter((d) => d <= hojeISO);
  const restantesLista = diasUteisTotais.filter((d) => d > hojeISO);
  const diasUteisDecorridos = decorridos.length;
  const diasUteisRestantes = restantesLista.length;

  const porDia = new Map(dias.map((d) => [d.data, d]));
  const serieDiaria = decorridos.map((d) => porDia.get(d)?.valor ?? 0);
  const realizado = serieDiaria.reduce((s, v) => s + v, 0);
  const quantidadeVendas = decorridos.reduce((s, d) => s + (porDia.get(d)?.quantidade ?? 0), 0);

  const mediaDiaria = diasUteisDecorridos > 0 ? realizado / diasUteisDecorridos : 0;

  // Ritmo recente: média ponderada dos últimos 7 dias úteis (peso 2) com a média do mês (peso 1).
  const ultimos = serieDiaria.slice(-7);
  const mediaRecente = ultimos.length ? ultimos.reduce((s, v) => s + v, 0) / ultimos.length : 0;
  const ritmoRecente = mediaRecente;
  const ritmoPrevisto = ultimos.length >= 3 ? (mediaRecente * 2 + mediaDiaria) / 3 : mediaDiaria;

  const projecaoFaturamento = realizado + ritmoPrevisto * diasUteisRestantes;
  const atingimentoProjetado = meta > 0 ? (projecaoFaturamento / meta) * 100 : 0;
  const faltante = Math.max(0, meta - realizado);
  const necessarioPorDia = diasUteisRestantes > 0 ? faltante / diasUteisRestantes : faltante;

  // Probabilidade de atingir a meta (distribuição normal da soma dos dias restantes).
  const sigmaDia = desvioPadrao(serieDiaria);
  const sigmaRestante = sigmaDia * Math.sqrt(Math.max(1, diasUteisRestantes));
  let probabilidadeMeta: number;
  if (meta <= 0) probabilidadeMeta = 0;
  else if (realizado >= meta) probabilidadeMeta = 100;
  else if (diasUteisRestantes === 0) probabilidadeMeta = 0;
  else if (sigmaRestante <= 0) probabilidadeMeta = projecaoFaturamento >= meta ? 90 : 10;
  else {
    const esperado = ritmoPrevisto * diasUteisRestantes;
    probabilidadeMeta = clamp(normalCdf((esperado - faltante) / sigmaRestante) * 100, 1, 99);
  }

  // Confiança: volume de dias observados + estabilidade (coeficiente de variação).
  const cv = mediaDiaria > 0 ? sigmaDia / mediaDiaria : 1.5;
  const pesoAmostra = clamp((diasUteisDecorridos / 12) * 100, 20, 100);
  const pesoEstabilidade = clamp(100 - cv * 55, 15, 100);
  const confianca = clamp(Math.round(pesoAmostra * 0.5 + pesoEstabilidade * 0.5), 15, 97);

  const margem = sigmaRestante * 1.28; // ~80% de intervalo
  const faixaMin = Math.max(realizado, projecaoFaturamento - margem);
  const faixaMax = projecaoFaturamento + margem;

  const ticketAtual = quantidadeVendas > 0 ? realizado / quantidadeVendas : 0;
  const conversaoAtual = diasUteisDecorridos > 0 ? quantidadeVendas / diasUteisDecorridos : 0;
  const quantidadeProjetada = Math.round(quantidadeVendas + conversaoAtual * diasUteisRestantes);
  const ticketProjetado = quantidadeProjetada > 0 ? projecaoFaturamento / quantidadeProjetada : ticketAtual;
  const conversaoProjetada =
    diasUteisTotais.length > 0 ? quantidadeProjetada / diasUteisTotais.length : conversaoAtual;

  const nivel: NivelPrevisao =
    probabilidadeMeta >= 70 ? "provavel" : probabilidadeMeta >= 40 ? "possivel" : "improvavel";

  /* --------------------------------------------- recomendações preventivas */

  const recomendacoes: string[] = [];
  if (meta > 0 && probabilidadeMeta < 70 && diasUteisRestantes > 0) {
    recomendacoes.push(
      `Elevar o ritmo diário de ${fmtBRL(ritmoPrevisto)} para ${fmtBRL(
        necessarioPorDia
      )} nos ${diasUteisRestantes} dia(s) úteis restantes.`
    );
  }
  if (probabilidadeMeta < 40 && meta > 0) {
    recomendacoes.push(
      "Acionar plano de contingência: campanha relâmpago, reativação de clientes da base e reforço da equipe nos dias de maior fluxo."
    );
  }
  if (ticketProjetado < metaTicket * 0.95 && metaTicket > 0) {
    const gap = metaTicket - ticketProjetado;
    recomendacoes.push(
      `Ticket projetado ${fmtBRL(ticketProjetado)} abaixo da meta de ${fmtBRL(
        metaTicket
      )}. Trabalhar venda adicional e combos para recuperar ${fmtBRL(gap)} por atendimento.`
    );
  }
  if (mediaDiaria > 0 && mediaRecente < mediaDiaria * 0.85) {
    recomendacoes.push(
      `Ritmo dos últimos dias (${fmtBRL(mediaRecente)}/dia) está abaixo da média do mês (${fmtBRL(
        mediaDiaria
      )}/dia). Revisar agenda de atendimento e prospecção ativa imediatamente.`
    );
  }
  if (conversaoAtual > 0 && conversaoProjetada < conversaoAtual * 0.95) {
    recomendacoes.push(
      "Conversão projetada em queda: reforçar abordagem, follow-up de orçamentos abertos e acompanhamento diário por vendedor."
    );
  }
  if (confianca < 50) {
    recomendacoes.push(
      "Confiança do modelo reduzida pelo baixo volume ou oscilação dos lançamentos. Garantir o registro diário das vendas para previsões mais precisas."
    );
  }
  if (!recomendacoes.length) {
    recomendacoes.push(
      "Cenário favorável. Manter a rotina atual, reconhecer os destaques e proteger o ticket médio até o fechamento."
    );
  }

  return {
    id,
    nome,
    realizado,
    meta,
    projecaoFaturamento,
    atingimentoProjetado,
    probabilidadeMeta,
    nivel,
    confianca,
    mediaDiaria,
    ritmoRecente,
    necessarioPorDia,
    diasUteisDecorridos,
    diasUteisRestantes,
    ticketAtual,
    ticketProjetado,
    metaTicket,
    conversaoAtual,
    conversaoProjetada,
    quantidadeVendas,
    quantidadeProjetada,
    faixaMin,
    faixaMax,
    recomendacoes,
  };
}

/* --------------------------------------------------------------- serviço */

export const AIPredictiveEngine = {
  async prever(referencia = new Date()): Promise<PrevisaoMensal> {
    const hojeISO = toLocalISO(referencia);
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth() + 1;
    const inicioMes = toLocalISO(new Date(ano, mes - 1, 1));
    const fimMes = toLocalISO(new Date(ano, mes, 0));

    const [perfisRes, filiaisRes, vendasRes, metasRes, feriadosRes] = await Promise.all([
      supabase.from("profiles").select("id, nome, filial_id"),
      supabase.from("filiais").select("id, nome"),
      supabase
        .from("vendas")
        .select("vendedor_id, data, valor, devolucao, quantidade_vendas")
        .gte("data", inicioMes)
        .lte("data", fimMes),
      // Todas as metas cadastradas: o resolver aplica fallback quando o mês
      // corrente ainda não possui metas lançadas.
      supabase.from("metas").select("vendedor_id, mes, ano, valor_meta, meta_ticket"),
      supabase.from("feriados").select("data, filial_id").gte("data", inicioMes).lte("data", fimMes),
    ]);

    const perfis = (perfisRes.data ?? []) as { id: string; nome: string; filial_id: string | null }[];
    const filiais = (filiaisRes.data ?? []) as { id: string; nome: string }[];
    const vendas = ((vendasRes.data ?? []) as any[]).map((v) => ({
      vendedor_id: String(v.vendedor_id),
      data: String(v.data),
      valor: Number(v.valor) || 0,
      devolucao: Number(v.devolucao) || 0,
      quantidade_vendas: Number(v.quantidade_vendas) || 0,
    }));

    const filialDe = new Map(perfis.map((p) => [p.id, p.filial_id]));
    const metaResolver = criarMetaResolver((metasRes.data ?? []) as any[]);


    const feriadosRede = new Set<string>();
    const feriadosPorFilial = new Map<string, Set<string>>();
    for (const f of (feriadosRes.data ?? []) as any[]) {
      const data = String(f.data);
      if (!f.filial_id) feriadosRede.add(data);
      else {
        const set = feriadosPorFilial.get(f.filial_id) ?? new Set<string>();
        set.add(data);
        feriadosPorFilial.set(f.filial_id, set);
      }
    }

    /** Dias úteis do mês (exclui domingos e feriados aplicáveis). */
    const diasUteisDe = (filialId?: string | null) => {
      const feriados = new Set(feriadosRede);
      if (filialId) feriadosPorFilial.get(filialId)?.forEach((d) => feriados.add(d));
      const lista: string[] = [];
      const ultimo = new Date(ano, mes, 0).getDate();
      for (let d = 1; d <= ultimo; d++) {
        const data = new Date(ano, mes - 1, d);
        const iso = toLocalISO(data);
        if (data.getDay() === 0 || feriados.has(iso)) continue;
        lista.push(iso);
      }
      return lista;
    };

    const agregarDias = (linhas: typeof vendas): DiaAgg[] => {
      const mapa = new Map<string, DiaAgg>();
      for (const v of linhas) {
        const a = mapa.get(v.data) ?? { data: v.data, valor: 0, quantidade: 0 };
        a.valor += v.valor - v.devolucao;
        a.quantidade += v.quantidade_vendas;
        mapa.set(v.data, a);
      }
      return [...mapa.values()].sort((a, b) => a.data.localeCompare(b.data));
    };

    const vendedoresPorFilial = new Map<string, Set<string>>();
    for (const p of perfis) {
      if (!p.filial_id) continue;
      const set = vendedoresPorFilial.get(p.filial_id) ?? new Set<string>();
      set.add(p.id);
      vendedoresPorFilial.set(p.filial_id, set);
    }

    const lojas = filiais
      .map((f) => {
        const ids = vendedoresPorFilial.get(f.id) ?? new Set<string>();
        const linhas = vendas.filter((v) => ids.has(v.vendedor_id));
        return calcularPrevisao(
          f.id,
          f.nome,
          agregarDias(linhas),
          metaPorFilial.get(f.id) ?? 0,
          ids.size * META_TICKET_PADRAO,
          diasUteisDe(f.id),
          hojeISO
        );
      })
      .filter((l) => l.meta > 0 || l.realizado > 0)
      .sort((a, b) => b.probabilidadeMeta - a.probabilidadeMeta);

    const diasRede = diasUteisDe(null);
    const rede = calcularPrevisao(
      "rede",
      "Rede completa",
      agregarDias(vendas),
      metaRede,
      perfis.length * META_TICKET_PADRAO,
      diasRede,
      hojeISO
    );

    /* --------------------------------------------------- série do gráfico */

    const porDiaRede = new Map(agregarDias(vendas).map((d) => [d.data, d.valor]));
    const ritmoPrevisto =
      rede.diasUteisRestantes > 0
        ? (rede.projecaoFaturamento - rede.realizado) / rede.diasUteisRestantes
        : 0;
    let acumulado = 0;
    let acumuladoProjetado = 0;
    const metaDia = diasRede.length > 0 ? rede.meta / diasRede.length : 0;
    const serie = diasRede.map((iso, i) => {
      const passado = iso <= hojeISO;
      if (passado) {
        acumulado += porDiaRede.get(iso) ?? 0;
        acumuladoProjetado = acumulado;
      } else {
        acumuladoProjetado += ritmoPrevisto;
      }
      return {
        dia: Number(iso.slice(8, 10)),
        realizado: passado ? acumulado : null,
        projetado: acumuladoProjetado,
        meta: metaDia * (i + 1),
      };
    });

    /* --------------------------------------------- recomendações da rede */

    const recomendacoesGerais = [...rede.recomendacoes];
    const risco = lojas.filter((l) => l.probabilidadeMeta < 40);
    if (risco.length) {
      recomendacoesGerais.push(
        `Prioridade máxima nas lojas com previsão de não fechar a meta: ${risco
          .map((l) => `${l.nome} (${l.probabilidadeMeta.toFixed(0)}%)`)
          .join(", ")}.`
      );
    }
    const destaque = lojas.find((l) => l.probabilidadeMeta >= 80);
    if (destaque) {
      recomendacoesGerais.push(
        `Replicar as práticas de ${destaque.nome}, com ${destaque.probabilidadeMeta.toFixed(
          0
        )}% de probabilidade de fechamento acima da meta.`
      );
    }

    const mesLabel = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });

    return {
      geradoEm: new Date().toISOString(),
      mesLabel,
      diasUteisDecorridos: rede.diasUteisDecorridos,
      diasUteisRestantes: rede.diasUteisRestantes,
      rede,
      lojas,
      serie,
      recomendacoesGerais,
    };
  },

  /** Mensagem executiva pronta para envio pelo WhatsApp. */
  mensagemWhatsApp(p: PrevisaoMensal) {
    const linhas = [
      `*Previsão de fechamento — ${p.mesLabel}*`,
      "",
      `Realizado: ${fmtBRL(p.rede.realizado)} de ${fmtBRL(p.rede.meta)}`,
      `Projeção: ${fmtBRL(p.rede.projecaoFaturamento)} (${p.rede.atingimentoProjetado.toFixed(1)}% da meta)`,
      `Probabilidade de atingir a meta: ${p.rede.probabilidadeMeta.toFixed(0)}%`,
      `Confiança do modelo: ${p.rede.confianca}%`,
      `Ticket projetado: ${fmtBRL(p.rede.ticketProjetado)} | Conversão projetada: ${p.rede.conversaoProjetada.toFixed(
        1
      )} vendas/dia`,
      `Dias úteis restantes: ${p.rede.diasUteisRestantes} | Necessário por dia: ${fmtBRL(
        p.rede.necessarioPorDia
      )}`,
      "",
      "*Lojas*",
      ...p.lojas.map(
        (l) =>
          `• ${l.nome}: ${l.probabilidadeMeta.toFixed(0)}% de chance | projeção ${fmtBRL(
            l.projecaoFaturamento
          )} (${l.atingimentoProjetado.toFixed(0)}% da meta)`
      ),
      "",
      "*Recomendações preventivas*",
      ...p.recomendacoesGerais.slice(0, 5).map((r) => `• ${r}`),
      "",
      "ANA — Gestão Comercial",
    ];
    return linhas.join("\n");
  },
};

export default AIPredictiveEngine;
