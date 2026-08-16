// Scheduler Engine da IA Executiva (ANA)
// Executado automaticamente por cron (a cada 15 minutos) ou manualmente por um administrador.
// Avalia a configuração de cada empresa (diário/semanal/mensal + horário) e gera as análises devidas,
// registrando logs completos em ai_scheduler_logs.

import { createClient } from "npm:@supabase/supabase-js@2";
import { gerarInsightsAna, type IndicadorLoja, type IndicadoresAna } from "../_shared/ana-insights.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const META_TICKET = 500;

type Tipo = "diario" | "semanal" | "mensal";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ---------------------------------- datas --------------------------------- */

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "Agora" convertido para o fuso configurado, como objeto Date de componentes locais. */
function agoraNoFuso(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
}

const somaDias = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const fmtDia = (s: string) => s.split("-").reverse().join("/");

/** Intervalos do período atual e do período de comparação. */
function periodos(tipo: Tipo, hoje: Date) {
  if (tipo === "diario") {
    const ini = somaDias(hoje, -1);
    const antIni = somaDias(hoje, -2);
    return {
      inicio: iso(ini),
      fim: iso(ini),
      antInicio: iso(antIni),
      antFim: iso(antIni),
      label: fmtDia(iso(ini)),
      labelAnterior: fmtDia(iso(antIni)),
    };
  }
  if (tipo === "semanal") {
    const fim = somaDias(hoje, -1);
    const ini = somaDias(fim, -6);
    const antFim = somaDias(ini, -1);
    const antIni = somaDias(antFim, -6);
    return {
      inicio: iso(ini),
      fim: iso(fim),
      antInicio: iso(antIni),
      antFim: iso(antFim),
      label: `${fmtDia(iso(ini))} a ${fmtDia(iso(fim))}`,
      labelAnterior: `${fmtDia(iso(antIni))} a ${fmtDia(iso(antFim))}`,
    };
  }
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  const ini = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const antFim = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 0);
  const antIni = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  return {
    inicio: iso(ini),
    fim: iso(fim),
    antInicio: iso(antIni),
    antFim: iso(antFim),
    label: `${fmtDia(iso(ini))} a ${fmtDia(iso(fim))}`,
    labelAnterior: `${fmtDia(iso(antIni))} a ${fmtDia(iso(antFim))}`,
  };
}

/* ------------------------------- agregação -------------------------------- */

async function vendasPeriodo(inicio: string, fim: string) {
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

async function montarIndicadores(tipo: Tipo, hoje: Date): Promise<IndicadoresAna> {
  const p = periodos(tipo, hoje);

  const [{ data: filiais }, { data: profiles }, atuais, anteriores, { data: metas }, { data: feriados }] =
    await Promise.all([
      admin.from("filiais").select("id, nome"),
      admin.from("profiles").select("id, filial_id"),
      vendasPeriodo(p.inicio, p.fim),
      vendasPeriodo(p.antInicio, p.antFim),
      admin
        .from("metas")
        .select("vendedor_id, valor_meta, meta_ticket, mes, ano")
        .eq("mes", hoje.getMonth() === 0 ? 12 : hoje.getMonth())
        .eq("ano", hoje.getMonth() === 0 ? hoje.getFullYear() - 1 : hoje.getFullYear()),
      admin.from("feriados").select("data, descricao").gte("data", p.inicio).lte("data", p.fim),
    ]);

  const filialDoVendedor = new Map<string, string | null>(
    (profiles ?? []).map((x: any) => [x.id, x.filial_id])
  );
  const nomeFilial = new Map<string, string>((filiais ?? []).map((f: any) => [f.id, f.nome]));

  const acc = new Map<string, IndicadorLoja>();
  const garantir = (id: string): IndicadorLoja => {
    if (!acc.has(id))
      acc.set(id, {
        nome: nomeFilial.get(id) ?? "Sem filial",
        vendido: 0,
        meta: 0,
        percentual: 0,
        crescimento: 0,
        ticket: 0,
        metaTicket: META_TICKET,
        quantidade: 0,
      });
    return acc.get(id)!;
  };

  const anteriorPorFilial = new Map<string, number>();
  for (const v of anteriores) {
    const fid = filialDoVendedor.get(v.vendedor_id) ?? "sem-filial";
    anteriorPorFilial.set(fid, (anteriorPorFilial.get(fid) ?? 0) + (Number(v.valor) - Number(v.devolucao || 0)));
  }

  for (const v of atuais) {
    const fid = filialDoVendedor.get(v.vendedor_id) ?? "sem-filial";
    const loja = garantir(fid);
    loja.vendido += Number(v.valor) - Number(v.devolucao || 0);
    loja.quantidade += Number(v.quantidade_vendas || 0);
  }

  // Meta do período: meta mensal proporcional aos dias do intervalo analisado.
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
  const diasPeriodo =
    Math.round((new Date(p.fim).getTime() - new Date(p.inicio).getTime()) / 86400000) + 1;
  const fator = tipo === "mensal" ? 1 : Math.min(1, diasPeriodo / diasNoMes);

  for (const m of metas ?? []) {
    const fid = filialDoVendedor.get((m as any).vendedor_id) ?? "sem-filial";
    if (!acc.has(fid) && !nomeFilial.has(fid)) continue;
    garantir(fid).meta += Number((m as any).valor_meta || 0) * fator;
  }

  const lojas = [...acc.entries()].map(([fid, l]) => {
    const anterior = anteriorPorFilial.get(fid) ?? 0;
    return {
      ...l,
      percentual: l.meta > 0 ? (l.vendido / l.meta) * 100 : 0,
      crescimento: anterior > 0 ? ((l.vendido - anterior) / anterior) * 100 : 0,
      ticket: l.quantidade > 0 ? l.vendido / l.quantidade : 0,
    };
  });

  const totalVendido = lojas.reduce((s, l) => s + l.vendido, 0);
  const totalAnterior = [...anteriorPorFilial.values()].reduce((s, v) => s + v, 0);
  const metaPeriodo = lojas.reduce((s, l) => s + l.meta, 0);
  const quantidade = lojas.reduce((s, l) => s + l.quantidade, 0);

  return {
    tipo,
    periodoLabel: p.label,
    periodoAnteriorLabel: p.labelAnterior,
    totalVendido,
    metaPeriodo,
    percentualAtingido: metaPeriodo > 0 ? (totalVendido / metaPeriodo) * 100 : 0,
    crescimento: totalAnterior > 0 ? ((totalVendido - totalAnterior) / totalAnterior) * 100 : 0,
    ticketGeral: quantidade > 0 ? totalVendido / quantidade : 0,
    metaTicket: META_TICKET * lojas.length,
    quantidadeVendas: quantidade,
    lojas: lojas.sort((a, b) => b.vendido - a.vendido),
    feriados: (feriados ?? []).map((f: any) => `${fmtDia(f.data)} — ${f.descricao}`),
  };
}

/* -------------------------------- execução -------------------------------- */

const LAST_COL: Record<Tipo, string> = {
  diario: "last_daily_run_at",
  semanal: "last_weekly_run_at",
  mensal: "last_monthly_run_at",
};

function devidos(settings: any, agora: Date): Tipo[] {
  const [h, m] = String(settings.send_time ?? "08:00").split(":").map(Number);
  const minutosAlvo = h * 60 + (m || 0);
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  // janela de tolerância de 20 minutos (cron roda a cada 15 min)
  if (minutosAgora < minutosAlvo || minutosAgora > minutosAlvo + 20) return [];

  const hojeISO = iso(agora);
  const jaRodou = (tipo: Tipo) => {
    const last = settings[LAST_COL[tipo]];
    return last ? iso(new Date(last)) === hojeISO : false;
  };

  const lista: Tipo[] = [];
  if (settings.daily_report_enabled && !jaRodou("diario")) lista.push("diario");
  if (
    settings.weekly_report_enabled &&
    agora.getDay() === Number(settings.weekly_weekday ?? 1) &&
    !jaRodou("semanal")
  )
    lista.push("semanal");
  if (
    settings.monthly_report_enabled &&
    agora.getDate() === Number(settings.monthly_day ?? 1) &&
    !jaRodou("mensal")
  )
    lista.push("mensal");
  return lista;
}

async function executarTipo(settings: any, tipo: Tipo, origem: string) {
  const inicio = Date.now();
  const tz = settings.timezone || "America/Sao_Paulo";
  const agora = agoraNoFuso(tz);
  let analises = 0;
  let notificacoes = 0;

  try {
    const indicadores = await montarIndicadores(tipo, agora);
    const result = await gerarInsightsAna(LOVABLE_API_KEY!, indicadores);
    if (!result.ok) throw new Error(result.error);

    const { error: histErro } = await admin.from("ai_analysis_history").insert({
      company_id: settings.company_id,
      analysis_date: iso(agora),
      analysis_type: tipo,
      generated_text: result.mensagem,
    });
    if (histErro) throw histErro;
    analises = 1;

    // Enfileira o envio para os destinatários cadastrados.
    const { data: destinatarios } = await admin
      .from("ai_recipients")
      .select("nome, telefone, alert_types, active")
      .eq("active", true);

    const unicos = new Map<string, string>();
    for (const d of destinatarios ?? []) {
      const tel = String((d as any).telefone ?? "").replace(/\D/g, "");
      const tipos: string[] = (d as any).alert_types ?? [];
      if (tel.length >= 10 && tipos.includes(tipo)) unicos.set(tel, (d as any).nome ?? "Destinatário");
    }

    if (unicos.size) {
      const rows = [...unicos.entries()].map(([phone, nome]) => ({
        company_id: settings.company_id,
        recipient_name: nome,
        recipient_phone: phone,
        notification_type: tipo,
        message: result.mensagem,
        delivery_status: "pendente",
      }));
      const { error } = await admin.from("ai_notifications").insert(rows);
      if (!error) notificacoes = rows.length;
    }

    await admin
      .from("ai_notification_settings")
      .update({ [LAST_COL[tipo]]: new Date().toISOString() })
      .eq("id", settings.id);

    await admin.from("ai_scheduler_logs").insert({
      company_id: settings.company_id,
      run_type: tipo,
      trigger_source: origem,
      status: "sucesso",
      message: `Análise ${tipo} gerada com sucesso`,
      analyses_generated: analises,
      notifications_created: notificacoes,
      duration_ms: Date.now() - inicio,
      details: {
        periodo: indicadores.periodoLabel,
        total_vendido: indicadores.totalVendido,
        atingimento: Number(indicadores.percentualAtingido.toFixed(1)),
        lojas: indicadores.lojas.length,
      },
    });

    return { tipo, status: "sucesso", notificacoes };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error(`Scheduler falhou (${tipo}):`, msg);
    await admin.from("ai_scheduler_logs").insert({
      company_id: settings.company_id,
      run_type: tipo,
      trigger_source: origem,
      status: "erro",
      message: msg,
      duration_ms: Date.now() - inicio,
    });
    return { tipo, status: "erro", erro: msg };
  }
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

    const body = await req.json().catch(() => ({}));
    const manual = Boolean(body?.manual);
    let origem = "cron";

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
      origem = "manual";
    }

    const { data: configs, error } = await admin
      .from("ai_notification_settings")
      .select("*")
      .eq("active", true);
    if (error) throw error;

    const resultados: unknown[] = [];

    for (const settings of configs ?? []) {
      const tz = (settings as any).timezone || "America/Sao_Paulo";
      const lista: Tipo[] = manual
        ? [(body?.tipo as Tipo) || "diario"]
        : devidos(settings, agoraNoFuso(tz));
      for (const tipo of lista) {
        resultados.push(await executarTipo(settings, tipo, origem));
      }
    }

    if (!resultados.length) {
      return json({ executados: 0, mensagem: "Nenhum agendamento devido neste momento" });
    }
    return json({ executados: resultados.length, resultados });
  } catch (e) {
    console.error("ana-scheduler error:", e);
    return json({ error: "Erro inesperado no agendador" }, 500);
  }
});
