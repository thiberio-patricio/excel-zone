// Motor de reenvio automático do WhatsApp — executado por cron a cada minuto.
// Processa a fila (pendentes e falhas dentro da política de 3 tentativas: imediata, 5 min e 15 min).

import { createClient } from "npm:@supabase/supabase-js@2";
import { processarFila } from "../_shared/whatsapp-queue.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // Autorização: token do agendador interno OU usuário autenticado diretor/admin.
    const { data: cronOk } = await admin.rpc("verify_cron_secret", {
      _token: req.headers.get("x-cron-secret") ?? "",
    });

    if (cronOk !== true) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Não autenticado" }, 401);
      const client = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user } } = await client.auth.getUser();
      if (!user) return json({ error: "Não autenticado" }, 401);
      const { data: isDiretor } = await admin.rpc("is_diretor", { _user_id: user.id });
      if (isDiretor !== true) return json({ error: "Acesso restrito" }, 403);
    }


    const resultados = await processarFila(admin);
    return json({
      processados: resultados.length,
      enviados: resultados.filter((r) => r.ok).length,
      resultados,
    });
  } catch (e) {
    console.error("whatsapp-dispatch error:", e);
    return json({ error: "Erro inesperado no reenvio automático" }, 500);
  }
});
