// ANA — Assistente Virtual de Gestão de Vendas
// Gera análises executivas prontas para envio via WhatsApp.
// Acesso restrito a usuários com role 'admin'.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const MODEL = "openai/gpt-5.6-sol";

interface UnidadeResumo {
  nome: string;
  venda: number;
  meta: number;
  percentual: number;
  crescimento: number;
  ticket: number;
  metaTicket: number;
  quantidade: number;
  diasFerias: number;
  diasFolgas: number;
}

interface Payload {
  tipo: "diario" | "semanal" | "mensal";
  periodoLabel: string;
  periodoAnteriorLabel: string;
  destinatarioNome?: string;
  destinatarioCargo?: string;
  totalVendido: number;
  metaPeriodo: number;
  percentualAtingido: number;
  crescimento: number;
  ticketGeral: number;
  metaTicket: number;
  diasUteisRestantes?: number;
  unidades: UnidadeResumo[];
  feriados: string[];
}

const fmt = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const tipoDescricao = {
  diario: "resumo operacional do dia",
  semanal: "consolidado semanal",
  mensal: "fechamento mensal",
};

function systemPrompt(tipo: Payload["tipo"]) {
  return `Você é a ANA — Assistente Virtual de Gestão de Vendas, uma consultora sênior especializada em gestão comercial de varejo.
Você escreve mensagens de WhatsApp para proprietários, diretores e gestores.

Regras rígidas de formato (WhatsApp):
- Português do Brasil, tom profissional, consultivo e objetivo. Nunca informal, nunca emojis em excesso (no máximo 1 por bloco).
- Estruture assim, exatamente nesta ordem:
  1) Saudação curta identificando-se como ANA e o tipo de análise (${tipoDescricao[tipo]}).
  2) *Panorama* — números-chave interpretados (não apenas repetidos).
  3) *Destaques* — 2 a 4 linhas iniciadas por "•", citando lojas pelo nome.
  4) *Pontos de atenção* — 1 a 3 linhas iniciadas por "•", com risco e causa provável.
  5) *Recomendações da ANA* — 2 a 3 ações práticas, priorizadas e executáveis nas próximas horas/dias.
  6) Encerramento de uma linha, assinado "ANA — Assistente Virtual de Gestão de Vendas".
- Use *negrito do WhatsApp* (asteriscos simples) para títulos. Nunca use markdown (#, **, tabelas, listas numeradas longas).
- Máximo de 1600 caracteres.
- Toda afirmação deve estar ancorada nos dados fornecidos. Não invente números.
- Considere férias e folgas como contexto atenuante: nunca aponte como risco uma unidade cuja queda é explicada por ausências.`;
}

function userPrompt(p: Payload) {
  const linhas = p.unidades
    .slice(0, 30)
    .map(
      (u) =>
        `- ${u.nome}: vendido ${fmt(u.venda)} | meta do período ${fmt(u.meta)} | atingimento ${u.percentual.toFixed(1)}% | crescimento vs período anterior ${u.crescimento.toFixed(1)}% | ticket médio ${fmt(u.ticket)} (meta ${fmt(u.metaTicket)}) | ${u.quantidade} venda(s)${u.diasFerias ? ` | ${u.diasFerias} dia(s) de férias no período` : ""}${u.diasFolgas ? ` | ${u.diasFolgas} folga(s) no período` : ""}`
    )
    .join("\n");

  return `Tipo de análise: ${tipoDescricao[p.tipo]}
Período: ${p.periodoLabel}
Período de comparação: ${p.periodoAnteriorLabel}
${p.destinatarioNome ? `Destinatário: ${p.destinatarioNome}${p.destinatarioCargo ? ` (${p.destinatarioCargo})` : ""}` : ""}

Consolidado da rede:
- Total vendido: ${fmt(p.totalVendido)}
- Meta do período: ${fmt(p.metaPeriodo)}
- Atingimento: ${p.percentualAtingido.toFixed(1)}%
- Crescimento vs período anterior: ${p.crescimento.toFixed(1)}%
- Ticket médio: ${fmt(p.ticketGeral)} (meta ${fmt(p.metaTicket)})
${p.diasUteisRestantes !== undefined ? `- Dias úteis restantes no mês: ${p.diasUteisRestantes}` : ""}
${p.feriados.length ? `- Feriados no período: ${p.feriados.join("; ")}` : ""}

Desempenho por loja:
${linhas || "- Sem dados de vendas no período."}

Gere a mensagem de WhatsApp conforme as regras.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    if (!LOVABLE_API_KEY) return json({ error: "Serviço de IA indisponível" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Não autenticado" }, 401);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
    if (!isAdmin) return json({ error: "Acesso restrito ao administrador" }, 403);

    const payload = (await req.json()) as Payload;
    if (!payload?.tipo || !payload?.periodoLabel) {
      return json({ error: "Dados insuficientes para gerar a análise" }, 400);
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        stream: true,
        input: [
          { role: "system", content: systemPrompt(payload.tipo) },
          { role: "user", content: userPrompt(payload) },
        ],
      }),
    });

    if (resp.status === 429) return json({ error: "rate_limit" }, 429);
    if (resp.status === 402) return json({ error: "credits_exhausted" }, 402);
    if (!resp.ok || !resp.body) {
      const detail = await resp.text();
      console.error(`ANA gateway error [${resp.status}]: ${detail}`);
      return json({ error: "Falha ao gerar a análise" }, 500);
    }

    // Consome o stream dentro da função (evita timeout em gerações longas).
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
          } else if (evt.type === "response.completed") {
            const txt = evt.response?.output
              ?.flatMap((o: any) => o?.content ?? [])
              ?.filter((c: any) => c?.type === "output_text")
              ?.map((c: any) => c.text)
              ?.join("");
            if (!mensagem && txt) mensagem = txt;
          }
        } catch {
          // ignora chunks parciais
        }
      }
    }

    if (!mensagem.trim()) return json({ error: "A IA não retornou conteúdo" }, 500);

    return json({ mensagem: mensagem.trim() });
  } catch (e) {
    console.error("ANA function error:", e);
    return json({ error: "Erro inesperado ao gerar a análise" }, 500);
  }
});
