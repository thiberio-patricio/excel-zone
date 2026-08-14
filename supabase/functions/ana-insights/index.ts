// IA geradora de insights (ANA) — geração on-demand a partir de indicadores enviados pelo painel.
// Acesso restrito a usuários com role 'admin'.

import { createClient } from "npm:@supabase/supabase-js@2";
import { gerarInsightsAna, type IndicadoresAna } from "../_shared/ana-insights.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) {
      return json({ error: "Acesso restrito ao administrador" }, 403);
    }

    const payload = (await req.json()) as IndicadoresAna & { salvar?: boolean };
    if (!payload?.tipo || !payload?.periodoLabel) {
      return json({ error: "Dados insuficientes para gerar os insights" }, 400);
    }

    const result = await gerarInsightsAna(LOVABLE_API_KEY, payload);
    if (!result.ok) return json({ error: result.error }, result.status);

    if (payload.salvar) {
      await supabase.from("ai_analysis_history").insert({
        analysis_date: new Date().toISOString().slice(0, 10),
        analysis_type: payload.tipo,
        generated_text: result.mensagem,
        generated_by: user.id,
      });
    }

    return json({ mensagem: result.mensagem });
  } catch (e) {
    console.error("ana-insights error:", e);
    return json({ error: "Erro inesperado ao gerar os insights" }, 500);
  }
});
