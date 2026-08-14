// Monitoramento contínuo de alertas automáticos (ANA).
// Executado por cron (a cada 30 minutos) ou manualmente por um administrador.
// Gera alertas de queda de vendas (10/20/30%), ticket médio, conversão, risco de meta,
// meta atingida/superada, vendedor destaque e estoque crítico — com envio imediato via WhatsApp.

import { createClient } from "npm:@supabase/supabase-js@2";
import { carregarConfig, processarMensagem } from "../_shared/whatsapp-queue.ts";
import { configuracaoValida } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_TICKET = 500;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Severidade = "positivo" | "atencao" | "moderado" | "elevado";

interface Alerta {
  alert_type: string;
  severity: Severidade;
  store_id: string | null;
  store_name: string;
  title: string;
  message: string;
  metrics: Record<string, unknown>;
  dedupe_key: string;
}

const fmt = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const somaDias = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

async function vendas(inicio: string, fim: string) {
  const linhas: { vendedor_id: string; valor: number; devolucao: number; quantidade_vendas: number }[] = [];
  const passo = 1000;
  for (let de = 0; ; de += passo) {
    const { data, error } = await admin
      .from("vendas")
      .select("vendedor_id, valor, devolucao, quantidade_vendas")
      .gte("data", inicio)
      .lte("data", fim)
      .range(de, de + passo - 1);
    if (error) throw error;
    linhas.push(...((data ?? []) as typeof linhas));
    if (!data || data.length < passo) break;
  }
  return linhas;
}

interface Agregado {
  vendido: number;
  quantidade: number;
}

function agrupar(
  linhas: { vendedor_id: string; valor: number; devolucao: number; quantidade_vendas: number }[],
  chave: (vendedorId: string) => string | null,
) {
  const mapa = new Map<string, Agregado>();
  for (const v of linhas) {
    const k = chave(v.vendedor_id);
    if (!k) continue;
    const a = mapa.get(k) ?? { vendido: 0, quantidade: 0 };
    a.vendido += Number(v.valor || 0) - Number(v.devolucao || 0);
    a.quantidade += Number(v.quantidade_vendas || 0);
    mapa.set(k, a);
  }
  return mapa;
}

async function monitorar(settings: any): Promise<Alerta[]> {
  const hoje = new Date();
  const hojeISO = iso(hoje);
  const inicioMes = iso(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();

  const janelaFim = somaDias(hoje, -1);
  const janelaIni = somaDias(janelaFim, -6);
  const antFim = somaDias(janelaIni, -1);
  const antIni = somaDias(antFim, -6);

  const [{ data: filiais }, { data: profiles }, mesAtual, atual7, anterior7, { data: metas }, { data: ferias }] =
    await Promise.all([
      admin.from("filiais").select("id, nome"),
      admin.from("profiles").select("id, nome, filial_id"),
      vendas(inicioMes, hojeISO),
      vendas(iso(janelaIni), iso(janelaFim)),
      vendas(iso(antIni), iso(antFim)),
      admin
        .from("metas")
        .select("vendedor_id, valor_meta")
        .eq("mes", hoje.getMonth() + 1)
        .eq("ano", hoje.getFullYear()),
      admin.from("ferias").select("vendedor_id, data_inicio, data_fim").lte("data_inicio", hojeISO).gte("data_fim", hojeISO),
    ]);

  const filialDe = new Map<string, string | null>((profiles ?? []).map((p: any) => [p.id, p.filial_id]));
  const nomeVendedor = new Map<string, string>((profiles ?? []).map((p: any) => [p.id, p.nome]));
  const nomeFilial = new Map<string, string>((filiais ?? []).map((f: any) => [f.id, f.nome]));
  const emFerias = new Set((ferias ?? []).map((f: any) => f.vendedor_id));

  const porFilialMes = agrupar(mesAtual, (id) => filialDe.get(id) ?? null);
  const porFilial7 = agrupar(atual7, (id) => filialDe.get(id) ?? null);
  const porFilialAnt7 = agrupar(anterior7, (id) => filialDe.get(id) ?? null);
  const porVendedorMes = agrupar(mesAtual, (id) => id);

  const metaFilial = new Map<string, number>();
  for (const m of metas ?? []) {
    const fid = filialDe.get((m as any).vendedor_id);
    if (!fid) continue;
    metaFilial.set(fid, (metaFilial.get(fid) ?? 0) + Number((m as any).valor_meta || 0));
  }

  const ritmoEsperado = hoje.getDate() / diasNoMes;
  const selo = `${hojeISO}`;
  const alertas: Alerta[] = [];

  for (const [fid, nome] of nomeFilial) {
    const mes = porFilialMes.get(fid) ?? { vendido: 0, quantidade: 0 };
    const a7 = porFilial7.get(fid) ?? { vendido: 0, quantidade: 0 };
    const p7 = porFilialAnt7.get(fid) ?? { vendido: 0, quantidade: 0 };
    const meta = metaFilial.get(fid) ?? 0;
    const pct = meta > 0 ? (mes.vendido / meta) * 100 : 0;

    // Queda de vendas (10% / 20% / 30%)
    if (settings.sales_drop_alert && p7.vendido > 0) {
      const variacao = ((a7.vendido - p7.vendido) / p7.vendido) * 100;
      if (variacao <= -10) {
        const severidade: Severidade = variacao <= -30 ? "elevado" : variacao <= -20 ? "moderado" : "atencao";
        const faixa = variacao <= -30 ? 30 : variacao <= -20 ? 20 : 10;
        alertas.push({
          alert_type: "queda_vendas",
          severity: severidade,
          store_id: fid,
          store_name: nome,
          title: `Queda de vendas acima de ${faixa}%`,
          message: `*Alerta de queda de vendas*\n${nome} recuou ${Math.abs(variacao).toFixed(1)}% nos últimos 7 dias.\nAtual: ${fmt(a7.vendido)} | Anterior: ${fmt(p7.vendido)}\n\nANA — Gestão Comercial`,
          metrics: { variacao, atual: a7.vendido, anterior: p7.vendido },
          dedupe_key: `queda_vendas:${fid}:${faixa}:${selo}`,
        });
      }
    }

    // Ticket médio em queda
    if (settings.ticket_average_alert) {
      const ticketAtual = a7.quantidade > 0 ? a7.vendido / a7.quantidade : 0;
      const ticketAnterior = p7.quantidade > 0 ? p7.vendido / p7.quantidade : 0;
      if (ticketAnterior > 0 && ticketAtual > 0 && ticketAtual < ticketAnterior * 0.95) {
        const variacao = ((ticketAtual - ticketAnterior) / ticketAnterior) * 100;
        alertas.push({
          alert_type: "ticket_medio",
          severity: ticketAtual < META_TICKET * 0.7 ? "moderado" : "atencao",
          store_id: fid,
          store_name: nome,
          title: "Ticket médio em queda",
          message: `*Ticket médio em queda*\n${nome}: ${fmt(ticketAtual)} (${variacao.toFixed(1)}% vs semana anterior).\nMeta de ticket: ${fmt(META_TICKET)}\n\nANA — Gestão Comercial`,
          metrics: { ticketAtual, ticketAnterior, variacao, metaTicket: META_TICKET },
          dedupe_key: `ticket_medio:${fid}:${selo}`,
        });
      }
    }

    // Conversão (volume de vendas fechadas) em queda
    if (settings.conversion_alert && p7.quantidade > 0) {
      const variacao = ((a7.quantidade - p7.quantidade) / p7.quantidade) * 100;
      if (variacao <= -10) {
        alertas.push({
          alert_type: "conversao",
          severity: variacao <= -25 ? "moderado" : "atencao",
          store_id: fid,
          store_name: nome,
          title: "Conversão em queda",
          message: `*Conversão em queda*\n${nome} fechou ${a7.quantidade} venda(s) nos últimos 7 dias contra ${p7.quantidade} no período anterior (${variacao.toFixed(1)}%).\n\nANA — Gestão Comercial`,
          metrics: { variacao, atual: a7.quantidade, anterior: p7.quantidade },
          dedupe_key: `conversao:${fid}:${selo}`,
        });
      }
    }

    // Risco de meta
    if (settings.goal_risk_alert && meta > 0 && pct < ritmoEsperado * 100 * 0.85) {
      alertas.push({
        alert_type: "risco_meta",
        severity: pct < ritmoEsperado * 100 * 0.6 ? "elevado" : "moderado",
        store_id: fid,
        store_name: nome,
        title: "Meta em risco",
        message: `*Meta em risco*\n${nome} está com ${pct.toFixed(1)}% da meta, com ${(ritmoEsperado * 100).toFixed(0)}% do mês decorrido.\nVendido: ${fmt(mes.vendido)} | Meta: ${fmt(meta)}\n\nANA — Gestão Comercial`,
        metrics: { pct, vendido: mes.vendido, meta },
        dedupe_key: `risco_meta:${fid}:${selo}`,
      });
    }

    // Meta atingida / superada
    if (meta > 0 && pct >= 100) {
      const superou = pct >= 110;
      alertas.push({
        alert_type: superou ? "meta_superada" : "meta_atingida",
        severity: "positivo",
        store_id: fid,
        store_name: nome,
        title: superou ? "Meta superada" : "Meta atingida",
        message: `*${superou ? "Meta superada" : "Meta atingida"}*\n${nome} alcançou ${pct.toFixed(1)}% da meta do mês.\nVendido: ${fmt(mes.vendido)} | Meta: ${fmt(meta)}\n\nANA — Gestão Comercial`,
        metrics: { pct, vendido: mes.vendido, meta },
        dedupe_key: `${superou ? "meta_superada" : "meta_atingida"}:${fid}:${hoje.getMonth() + 1}-${hoje.getFullYear()}`,
      });
    }
  }

  // Vendedor destaque do mês
  if (settings.ranking_alert) {
    const ranking = [...porVendedorMes.entries()]
      .filter(([id]) => !emFerias.has(id) && nomeVendedor.has(id))
      .sort((a, b) => b[1].vendido - a[1].vendido);
    const [topId, top] = ranking[0] ?? [];
    if (topId && top && top.vendido > 0) {
      const fid = filialDe.get(topId) ?? null;
      alertas.push({
        alert_type: "vendedor_destaque",
        severity: "positivo",
        store_id: fid,
        store_name: (fid && nomeFilial.get(fid)) || "Rede",
        title: "Vendedor destaque",
        message: `*Vendedor destaque*\n${nomeVendedor.get(topId)} lidera o mês com ${fmt(top.vendido)} em ${top.quantidade} venda(s).\n\nANA — Gestão Comercial`,
        metrics: { vendedor: nomeVendedor.get(topId), vendido: top.vendido, quantidade: top.quantidade },
        dedupe_key: `vendedor_destaque:${topId}:${selo}`,
      });
    }
  }

  // Estoque crítico — monitorado apenas quando houver dados de estoque cadastrados.
  if (settings.stock_alert) {
    const { data: estoque, error } = await admin
      .from("estoque")
      .select("filial_id, produto, quantidade, quantidade_minima")
      .limit(500);
    if (!error) {
      for (const item of estoque ?? []) {
        const q = Number((item as any).quantidade || 0);
        const min = Number((item as any).quantidade_minima || 0);
        if (min > 0 && q <= min) {
          const fid = (item as any).filial_id ?? null;
          alertas.push({
            alert_type: "estoque_critico",
            severity: q === 0 ? "elevado" : "moderado",
            store_id: fid,
            store_name: (fid && nomeFilial.get(fid)) || "Rede",
            title: "Estoque crítico",
            message: `*Estoque crítico*\n${(item as any).produto}: ${q} unidade(s) disponível(is) (mínimo ${min}).\n\nANA — Gestão Comercial`,
            metrics: { produto: (item as any).produto, quantidade: q, minimo: min },
            dedupe_key: `estoque_critico:${fid ?? "rede"}:${(item as any).produto}:${selo}`,
          });
        }
      }
    }
  }

  return alertas;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({}));
    const manual = Boolean(body?.manual);

    if (manual) {
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
    }

    const { data: settings } = await admin
      .from("ai_notification_settings")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!settings) return json({ alertas: 0, mensagem: "Nenhuma configuração ativa de alertas" });

    const detectados = await monitorar(settings);

    // Persiste ignorando duplicados (dedupe_key único).
    const novos: any[] = [];
    for (const a of detectados) {
      const { data, error } = await admin
        .from("ai_alerts")
        .upsert(a, { onConflict: "dedupe_key", ignoreDuplicates: true })
        .select("*");
      if (error) {
        console.error("Falha ao registrar alerta:", error.message);
        continue;
      }
      if (data && data.length) novos.push(data[0]);
    }

    // Envio imediato via WhatsApp para os destinatários cadastrados.
    const config = await carregarConfig(admin);
    const problemaConfig = configuracaoValida(config);
    let enviados = 0;

    if (novos.length) {
      const { data: destinatarios } = await admin
        .from("ai_notifications")
        .select("recipient_name, recipient_phone")
        .not("recipient_phone", "is", null);

      const unicos = new Map<string, string>();
      for (const d of destinatarios ?? []) {
        const tel = String((d as any).recipient_phone).replace(/\D/g, "");
        if (tel.length >= 10) unicos.set(tel, (d as any).recipient_name ?? "Destinatário");
      }

      if (unicos.size) {
        const fila = novos.flatMap((a) =>
          [...unicos.entries()].map(([telefone, nome]) => ({
            recipient_name: nome,
            recipient_phone: telefone,
            kind: "texto",
            message: a.message,
            alert_id: a.id,
          })),
        );
        const { data: criadas } = await admin.from("whatsapp_messages").insert(fila).select("*");
        if (!problemaConfig) {
          for (const msg of criadas ?? []) {
            const r = await processarMensagem(admin, config, msg);
            if (r.ok) enviados++;
          }
        }
        await admin
          .from("ai_alerts")
          .update({ notified: true })
          .in("id", novos.map((a) => a.id));
      }
    }

    return json({
      detectados: detectados.length,
      novos: novos.length,
      enviados,
      aviso: problemaConfig ?? undefined,
    });
  } catch (e) {
    console.error("ana-alerts error:", e);
    return json({ error: "Erro inesperado no monitoramento de alertas" }, 500);
  }
});
