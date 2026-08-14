// WhatsAppService — camada única de envio compatível com Evolution API e WhatsApp Business API (Cloud API).
// Recursos: texto, relatório (texto formatado), PDF (documento) e imagem.

export type WhatsAppKind = "texto" | "relatorio" | "pdf" | "imagem";

export interface WhatsAppConfig {
  provider: "evolution" | "business";
  base_url: string | null;
  instance: string | null;
  phone_number_id: string | null;
  sender_label?: string | null;
  active: boolean;
}

export interface EnvioWhatsApp {
  telefone: string;
  kind: WhatsAppKind;
  mensagem?: string | null;
  mediaUrl?: string | null;
  mediaFilename?: string | null;
}

export interface ResultadoEnvio {
  ok: boolean;
  httpStatus?: number;
  providerMessageId?: string;
  error?: string;
  response?: unknown;
}

/** Normaliza para o padrão internacional brasileiro (somente dígitos, com 55). */
export function normalizarTelefone(telefone: string): string {
  const digitos = String(telefone || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("55")) return digitos;
  return `55${digitos}`;
}

function credencial(provider: WhatsAppConfig["provider"]) {
  return provider === "evolution"
    ? Deno.env.get("EVOLUTION_API_KEY")
    : Deno.env.get("WHATSAPP_ACCESS_TOKEN");
}

export function configuracaoValida(config: WhatsAppConfig | null): string | null {
  if (!config) return "WhatsApp não configurado";
  if (!config.active) return "Integração de WhatsApp desativada";
  if (!credencial(config.provider)) {
    return config.provider === "evolution"
      ? "Credencial da Evolution API não configurada"
      : "Token da WhatsApp Business API não configurado";
  }
  if (config.provider === "evolution" && (!config.base_url || !config.instance)) {
    return "Informe o endereço do servidor e a instância da Evolution API";
  }
  if (config.provider === "business" && !config.phone_number_id) {
    return "Informe o Phone Number ID da WhatsApp Business API";
  }
  return null;
}

/* ------------------------------ Evolution API ----------------------------- */

async function enviarEvolution(config: WhatsAppConfig, envio: EnvioWhatsApp): Promise<ResultadoEnvio> {
  const base = String(config.base_url).replace(/\/+$/, "");
  const numero = normalizarTelefone(envio.telefone);
  const apiKey = credencial("evolution")!;

  let url: string;
  let body: Record<string, unknown>;

  if (envio.kind === "texto" || envio.kind === "relatorio") {
    url = `${base}/message/sendText/${config.instance}`;
    body = { number: numero, text: envio.mensagem ?? "" };
  } else {
    url = `${base}/message/sendMedia/${config.instance}`;
    body = {
      number: numero,
      mediatype: envio.kind === "pdf" ? "document" : "image",
      mimetype: envio.kind === "pdf" ? "application/pdf" : undefined,
      media: envio.mediaUrl,
      fileName: envio.mediaFilename ?? (envio.kind === "pdf" ? "relatorio.pdf" : "imagem.jpg"),
      caption: envio.mensagem ?? undefined,
    };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify(body),
  });
  const texto = await resp.text();
  let json: any = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // resposta não-JSON
  }

  if (!resp.ok) {
    return { ok: false, httpStatus: resp.status, error: texto.slice(0, 500), response: json };
  }
  return {
    ok: true,
    httpStatus: resp.status,
    providerMessageId: json?.key?.id ?? json?.messageId ?? undefined,
    response: json ?? texto.slice(0, 500),
  };
}

/* -------------------------- WhatsApp Business API -------------------------- */

async function enviarBusiness(config: WhatsAppConfig, envio: EnvioWhatsApp): Promise<ResultadoEnvio> {
  const base = (config.base_url || "https://graph.facebook.com/v21.0").replace(/\/+$/, "");
  const numero = normalizarTelefone(envio.telefone);
  const token = credencial("business")!;

  let payload: Record<string, unknown>;
  if (envio.kind === "texto" || envio.kind === "relatorio") {
    payload = {
      messaging_product: "whatsapp",
      to: numero,
      type: "text",
      text: { preview_url: false, body: envio.mensagem ?? "" },
    };
  } else if (envio.kind === "pdf") {
    payload = {
      messaging_product: "whatsapp",
      to: numero,
      type: "document",
      document: {
        link: envio.mediaUrl,
        filename: envio.mediaFilename ?? "relatorio.pdf",
        caption: envio.mensagem ?? undefined,
      },
    };
  } else {
    payload = {
      messaging_product: "whatsapp",
      to: numero,
      type: "image",
      image: { link: envio.mediaUrl, caption: envio.mensagem ?? undefined },
    };
  }

  const resp = await fetch(`${base}/${config.phone_number_id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const texto = await resp.text();
  let json: any = null;
  try {
    json = JSON.parse(texto);
  } catch {
    // resposta não-JSON
  }

  if (!resp.ok) {
    const detalhe = json?.error?.message ?? texto.slice(0, 500);
    return { ok: false, httpStatus: resp.status, error: detalhe, response: json };
  }
  return {
    ok: true,
    httpStatus: resp.status,
    providerMessageId: json?.messages?.[0]?.id,
    response: json ?? texto.slice(0, 500),
  };
}

/** Envia uma mensagem pelo provedor configurado. */
export async function enviarWhatsApp(
  config: WhatsAppConfig,
  envio: EnvioWhatsApp,
): Promise<ResultadoEnvio> {
  const invalido = configuracaoValida(config);
  if (invalido) return { ok: false, error: invalido };
  if (!normalizarTelefone(envio.telefone)) return { ok: false, error: "Telefone inválido" };
  if ((envio.kind === "texto" || envio.kind === "relatorio") && !envio.mensagem?.trim()) {
    return { ok: false, error: "Mensagem vazia" };
  }
  if ((envio.kind === "pdf" || envio.kind === "imagem") && !envio.mediaUrl) {
    return { ok: false, error: "Arquivo não informado" };
  }

  try {
    return config.provider === "evolution"
      ? await enviarEvolution(config, envio)
      : await enviarBusiness(config, envio);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Falha de rede no envio" };
  }
}

/** Política de reenvio: 1ª imediata, 2ª após 5 min, 3ª após 15 min. */
export const ATRASOS_MINUTOS = [0, 5, 15];
export const MAX_TENTATIVAS = ATRASOS_MINUTOS.length;

export function proximaTentativa(tentativasFeitas: number): Date | null {
  if (tentativasFeitas >= MAX_TENTATIVAS) return null;
  const minutos = ATRASOS_MINUTOS[tentativasFeitas] ?? 15;
  return new Date(Date.now() + minutos * 60_000);
}
