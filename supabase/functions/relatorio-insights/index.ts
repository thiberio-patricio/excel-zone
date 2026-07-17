// Executive-level AI insights for the Relatórios module.
// Uses Lovable AI Gateway (OpenAI-compatible). Returns natural language analysis.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MODEL = "google/gemini-2.5-flash";

interface LojaResumo {
  nome: string;
  meta: number;
  venda: number;
  percentual: number;
  crescimento?: number;
  participacao?: number;
}

interface Payload {
  periodo: string;
  totalVendido: number;
  metaTotal: number;
  percentualAtingido: number;
  crescimento: number;
  melhorLoja?: LojaResumo;
  maiorCrescimento?: LojaResumo;
  lojas: LojaResumo[];
  section?:
    | "executivo"
    | "comparativo"
    | "evolucao"
    | "participacao"
    | "crescimento"
    | "ranking"
    | "conclusao";
}

const fmt = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function systemPrompt(section: string) {
  return `Você é um Diretor Comercial e Consultor Estratégico Executivo, escrevendo para o board de uma empresa de varejo com múltiplas lojas.

Regras rígidas:
- Escreva em português do Brasil, em tom corporativo, direto e analítico.
- Nunca repita apenas os números: interprete-os, identifique padrões, riscos e oportunidades.
- Cite lojas por nome quando relevante.
- Traga sempre uma recomendação prática ao final.
- Use no máximo 2 parágrafos curtos (3-5 linhas cada). Sem títulos, sem listas, sem markdown.
- Seção alvo desta análise: ${section}.`;
}

function userPrompt(p: Payload) {
  const linhas = p.lojas
    .slice(0, 20)
    .map(
      (l) =>
        `- ${l.nome}: venda ${fmt(l.venda)}, meta ${fmt(l.meta)}, atingimento ${l.percentual.toFixed(1)}%${
          l.crescimento !== undefined ? `, crescimento ${l.crescimento.toFixed(1)}%` : ""
        }${l.participacao !== undefined ? `, participação ${l.participacao.toFixed(1)}%` : ""}`
    )
    .join("\n");

  return `Período analisado: ${p.periodo}
Total vendido consolidado: ${fmt(p.totalVendido)}
Meta consolidada: ${fmt(p.metaTotal)}
Atingimento consolidado: ${p.percentualAtingido.toFixed(1)}%
Crescimento vs período anterior: ${p.crescimento.toFixed(1)}%
${p.melhorLoja ? `Melhor loja: ${p.melhorLoja.nome} (${p.melhorLoja.percentual.toFixed(1)}% da meta)` : ""}
${p.maiorCrescimento ? `Maior crescimento: ${p.maiorCrescimento.nome} (+${p.maiorCrescimento.crescimento?.toFixed(1)}%)` : ""}

Detalhamento por loja:
${linhas}

Gere a análise executiva conforme as regras.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI key missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json()) as Payload;
    const section = payload.section ?? "executivo";

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt(section) },
          { role: "user", content: userPrompt(payload) },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limit" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "credits_exhausted" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: "ai_error", detail: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const insight = data?.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ insight }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
