// Núcleo da IA geradora de insights (ANA) — usado pela função on-demand e pelo Scheduler Engine.

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
export const ANA_MODEL = "openai/gpt-5.6-sol";

export const ANA_SYSTEM_PROMPT = `Você é Ana, Assistente Virtual de Gestão Comercial.

Analise os indicadores fornecidos.

Identifique:
- Pontos positivos
- Problemas
- Tendências
- Oportunidades

Forneça recomendações práticas.

Regras obrigatórias:
- Mantenha tom profissional e consultivo, em português do Brasil.
- Limite máximo de 1000 caracteres na resposta final.
- Formato adequado para WhatsApp: linhas curtas, *negrito com asteriscos simples* nos títulos, itens iniciados por "•". Nunca use markdown (#, **, tabelas).
- Nunca invente números.
- Sempre baseie as conclusões nos dados recebidos.
- Se um dado não foi informado, não comente sobre ele.
- Encerre com uma linha assinada "ANA — Gestão Comercial".`;

export const fmtBRL = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface IndicadorLoja {
  nome: string;
  vendido: number;
  meta: number;
  percentual: number;
  crescimento: number;
  ticket: number;
  metaTicket: number;
  quantidade: number;
  diasFerias?: number;
  diasFolgas?: number;
}

export interface IndicadoresAna {
  tipo: "diario" | "semanal" | "mensal";
  periodoLabel: string;
  periodoAnteriorLabel: string;
  totalVendido: number;
  metaPeriodo: number;
  percentualAtingido: number;
  crescimento: number;
  ticketGeral: number;
  metaTicket?: number;
  quantidadeVendas?: number;
  diasUteisRestantes?: number;
  scoreComercial?: string;
  lojas: IndicadorLoja[];
  feriados?: string[];
  observacoes?: string[];
}

const TIPO_LABEL = {
  diario: "análise diária",
  semanal: "análise semanal",
  mensal: "análise mensal",
} as const;

export function anaUserPrompt(d: IndicadoresAna) {
  const lojas = (d.lojas ?? [])
    .slice(0, 30)
    .map(
      (l) =>
        `- ${l.nome}: vendido ${fmtBRL(l.vendido)} | meta ${fmtBRL(l.meta)} | atingimento ${l.percentual.toFixed(1)}% | variação vs período anterior ${l.crescimento.toFixed(1)}% | ticket médio ${fmtBRL(l.ticket)} (meta ${fmtBRL(l.metaTicket)}) | ${l.quantidade} venda(s)${l.diasFerias ? ` | ${l.diasFerias} dia(s) de férias` : ""}${l.diasFolgas ? ` | ${l.diasFolgas} folga(s)` : ""}`
    )
    .join("\n");

  return `Tipo: ${TIPO_LABEL[d.tipo]}
Período analisado: ${d.periodoLabel}
Período de comparação: ${d.periodoAnteriorLabel}

Indicadores consolidados:
- Faturamento: ${fmtBRL(d.totalVendido)}
- Meta do período: ${fmtBRL(d.metaPeriodo)}
- Atingimento: ${d.percentualAtingido.toFixed(1)}%
- Crescimento vs período anterior: ${d.crescimento.toFixed(1)}%
- Ticket médio: ${fmtBRL(d.ticketGeral)}${d.metaTicket ? ` (meta ${fmtBRL(d.metaTicket)})` : ""}
${d.quantidadeVendas !== undefined ? `- Quantidade de vendas: ${d.quantidadeVendas}` : ""}
${d.diasUteisRestantes !== undefined ? `- Dias úteis restantes no mês: ${d.diasUteisRestantes}` : ""}
${d.scoreComercial ? `- Score Comercial: ${d.scoreComercial}` : ""}
${d.feriados?.length ? `- Feriados no período: ${d.feriados.join("; ")}` : ""}
${d.observacoes?.length ? `- Contexto: ${d.observacoes.join("; ")}` : ""}

Desempenho por loja/vendedor:
${lojas || "- Sem dados de vendas no período."}

Gere a análise seguindo rigorosamente as regras.`;
}

/** Chama o gateway em modo streaming e devolve o texto completo (evita timeout). */
export async function gerarInsightsAna(
  apiKey: string,
  indicadores: IndicadoresAna
): Promise<{ ok: true; mensagem: string } | { ok: false; status: number; error: string }> {
  const resp = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: ANA_MODEL,
      stream: true,
      input: [
        { role: "system", content: ANA_SYSTEM_PROMPT },
        { role: "user", content: anaUserPrompt(indicadores) },
      ],
    }),
  });

  if (resp.status === 429) return { ok: false, status: 429, error: "rate_limit" };
  if (resp.status === 402) return { ok: false, status: 402, error: "credits_exhausted" };
  if (!resp.ok || !resp.body) {
    const detail = await resp.text();
    console.error(`ANA insights gateway error [${resp.status}]: ${detail}`);
    return { ok: false, status: 500, error: "Falha ao gerar os insights" };
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let mensagem = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const evt = JSON.parse(data);
        if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
          mensagem += evt.delta;
        } else if (evt.type === "response.completed" && !mensagem) {
          const txt = evt.response?.output
            ?.flatMap((o: any) => o?.content ?? [])
            ?.filter((c: any) => c?.type === "output_text")
            ?.map((c: any) => c.text)
            ?.join("");
          if (txt) mensagem = txt;
        }
      } catch {
        // chunk parcial
      }
    }
  }

  const texto = mensagem.trim();
  if (!texto) return { ok: false, status: 500, error: "A IA não retornou conteúdo" };
  return { ok: true, mensagem: texto.length > 1000 ? `${texto.slice(0, 997)}...` : texto };
}
