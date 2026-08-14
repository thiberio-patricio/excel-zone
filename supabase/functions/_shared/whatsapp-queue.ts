// Fila de envios de WhatsApp com registro completo (data, hora, status, erros)
// e reenvio automático: 1ª tentativa imediata, 2ª após 5 min, 3ª após 15 min.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  MAX_TENTATIVAS,
  enviarWhatsApp,
  proximaTentativa,
  type WhatsAppConfig,
  type WhatsAppKind,
} from "./whatsapp.ts";

export interface NovoEnvio {
  recipient_name: string;
  recipient_phone: string;
  kind: WhatsAppKind;
  message?: string | null;
  media_url?: string | null;
  media_filename?: string | null;
  alert_id?: string | null;
  created_by?: string | null;
}

export async function carregarConfig(admin: SupabaseClient): Promise<WhatsAppConfig | null> {
  const { data } = await admin
    .from("whatsapp_config")
    .select("provider, base_url, instance, phone_number_id, sender_label, active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as WhatsAppConfig) ?? null;
}

export async function enfileirar(admin: SupabaseClient, envios: NovoEnvio[]) {
  if (!envios.length) return [];
  const { data, error } = await admin.from("whatsapp_messages").insert(envios).select("id");
  if (error) throw error;
  return (data ?? []).map((d: { id: string }) => d.id);
}

/** Processa uma mensagem da fila, gravando log da tentativa e agendando reenvio se falhar. */
export async function processarMensagem(
  admin: SupabaseClient,
  config: WhatsAppConfig | null,
  msg: any,
) {
  const tentativa = (msg.attempts ?? 0) + 1;

  const resultado = config
    ? await enviarWhatsApp(config, {
        telefone: msg.recipient_phone,
        kind: msg.kind,
        mensagem: msg.message,
        mediaUrl: msg.media_url,
        mediaFilename: msg.media_filename,
      })
    : { ok: false, error: "WhatsApp não configurado" as string };

  await admin.from("whatsapp_logs").insert({
    message_id: msg.id,
    attempt: tentativa,
    status: resultado.ok ? "enviado" : "erro",
    http_status: (resultado as any).httpStatus ?? null,
    error: resultado.ok ? null : (resultado.error ?? "Erro desconhecido").slice(0, 1000),
    response: (resultado as any).response ?? null,
  });

  if (resultado.ok) {
    await admin
      .from("whatsapp_messages")
      .update({
        status: "enviado",
        attempts: tentativa,
        sent_at: new Date().toISOString(),
        provider: config?.provider ?? null,
        provider_message_id: (resultado as any).providerMessageId ?? null,
        last_error: null,
      })
      .eq("id", msg.id);
    return { ok: true, tentativa };
  }

  const proxima = proximaTentativa(tentativa);
  await admin
    .from("whatsapp_messages")
    .update({
      status: proxima ? "erro" : "falha",
      attempts: tentativa,
      next_attempt_at: (proxima ?? new Date()).toISOString(),
      last_error: (resultado.error ?? "Erro desconhecido").slice(0, 1000),
      provider: config?.provider ?? null,
    })
    .eq("id", msg.id);

  return {
    ok: false,
    tentativa,
    erro: resultado.error,
    reenvioEm: proxima?.toISOString() ?? null,
    esgotado: !proxima && tentativa >= MAX_TENTATIVAS,
  };
}

/** Processa todos os envios pendentes/com erro cuja próxima tentativa já venceu. */
export async function processarFila(admin: SupabaseClient, limite = 40) {
  const config = await carregarConfig(admin);
  const { data, error } = await admin
    .from("whatsapp_messages")
    .select("*")
    .in("status", ["pendente", "erro"])
    .lt("attempts", MAX_TENTATIVAS)
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(limite);
  if (error) throw error;

  const resultados = [];
  for (const msg of data ?? []) {
    resultados.push({ id: (msg as any).id, ...(await processarMensagem(admin, config, msg)) });
  }
  return resultados;
}
