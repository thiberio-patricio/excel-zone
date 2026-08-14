// Envio de WhatsApp sob demanda (texto, relatório, PDF, imagem).
// Enfileira o envio, tenta imediatamente e registra data, hora, status e erros.
// Acesso restrito a administradores.

import { createClient } from "npm:@supabase/supabase-js@2";
import { carregarConfig, processarMensagem } from "../_shared/whatsapp-queue.ts";
import { configuracaoValida, normalizarTelefone } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const KINDS = ["texto", "relatorio", "pdf", "imagem"];

interface Destino {
  nome?: string;
  telefone: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado" }, 401);

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await client.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roles ?? []).some((r: { role: string }) => r.role === "admin")) {
      return json({ error: "Acesso restrito ao administrador" }, 403);
    }

    const body = await req.json().catch(() => null);
    const kind = String(body?.kind ?? "texto");
    if (!KINDS.includes(kind)) return json({ error: "Tipo de envio inválido" }, 400);

    const destinos: Destino[] = Array.isArray(body?.destinos) ? body.destinos : [];
    const validos = destinos
      .map((d) => ({ nome: (d?.nome || "Destinatário").toString().slice(0, 120), telefone: normalizarTelefone(d?.telefone ?? "") }))
      .filter((d) => d.telefone.length >= 12);
    if (!validos.length) return json({ error: "Informe pelo menos um telefone válido com DDD" }, 400);

    const mensagem = typeof body?.mensagem === "string" ? body.mensagem.slice(0, 4000) : null;
    const mediaUrl = typeof body?.mediaUrl === "string" ? body.mediaUrl.slice(0, 2000) : null;
    const mediaFilename = typeof body?.mediaFilename === "string" ? body.mediaFilename.slice(0, 200) : null;

    if ((kind === "texto" || kind === "relatorio") && !mensagem?.trim()) {
      return json({ error: "Informe o texto da mensagem" }, 400);
    }
    if ((kind === "pdf" || kind === "imagem") && !mediaUrl) {
      return json({ error: "Informe o link do arquivo a enviar" }, 400);
    }

    const config = await carregarConfig(admin);
    const problemaConfig = configuracaoValida(config);

    const { data: criadas, error: insertError } = await admin
      .from("whatsapp_messages")
      .insert(
        validos.map((d) => ({
          recipient_name: d.nome,
          recipient_phone: d.telefone,
          kind,
          message: mensagem,
          media_url: mediaUrl,
          media_filename: mediaFilename,
          alert_id: typeof body?.alertId === "string" ? body.alertId : null,
          created_by: user.id,
        })),
      )
      .select("*");
    if (insertError) throw insertError;

    if (problemaConfig) {
      // Mantém na fila para reenvio automático depois de configurar o provedor.
      return json({ enfileirados: (criadas ?? []).length, aviso: problemaConfig }, 200);
    }

    const resultados = [];
    for (const msg of criadas ?? []) {
      resultados.push({ telefone: (msg as any).recipient_phone, ...(await processarMensagem(admin, config, msg)) });
    }

    const enviados = resultados.filter((r) => r.ok).length;
    return json({ enfileirados: resultados.length, enviados, resultados });
  } catch (e) {
    console.error("whatsapp-send error:", e);
    return json({ error: "Erro inesperado ao enviar pelo WhatsApp" }, 500);
  }
});
