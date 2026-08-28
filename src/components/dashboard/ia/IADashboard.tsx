import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Bot,
  RefreshCw,
  Loader2,
  Send,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Clock,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { toLocalISO } from "@/utils/dateISO";
import ScoreComercialPanel from "@/components/ia/ScoreComercialPanel";

const fmtBRL = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CORES = [
  "hsl(0 100% 52%)",
  "hsl(28 96% 56%)",
  "hsl(45 96% 56%)",
  "hsl(160 84% 45%)",
  "hsl(199 89% 55%)",
  "hsl(268 84% 65%)",
];

const TIPO_LABEL: Record<string, string> = {
  diario: "Relatório diário",
  semanal: "Relatório semanal",
  mensal: "Relatório mensal",
  queda_vendas: "Queda de vendas",
  risco_meta: "Risco de meta",
  previsao_fechamento: "Previsão de fechamento",
  ticket_medio: "Ticket médio",
  conversao: "Conversão",
  estoque: "Estoque",
  ranking: "Ranking",
};

const CRITICOS = new Set(["queda_vendas", "previsao_fechamento", "risco_meta", "ticket_medio", "conversao", "estoque"]);

interface LojaResumo {
  nome: string;
  vendido: number;
  meta: number;
  percentual: number;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <PageCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-display text-2xl font-bold leading-none text-foreground truncate">
            {value}
          </p>
          {hint && <p className="mt-2 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10"
          style={{ background: `linear-gradient(135deg, ${accent ?? CORES[0]}33, transparent)` }}
        >
          <Icon className="h-5 w-5" style={{ color: accent ?? CORES[0] }} />
        </div>
      </div>
    </PageCard>
  );
}

export default function IADashboard() {
  const [carregando, setCarregando] = useState(true);
  const [analisesHoje, setAnalisesHoje] = useState(0);
  const [alertasCriticos, setAlertasCriticos] = useState(0);
  const [ultimoEnvio, setUltimoEnvio] = useState<string | null>(null);
  const [proximoEnvio, setProximoEnvio] = useState<string | null>(null);
  const [lojas, setLojas] = useState<LojaResumo[]>([]);
  const [evolucao, setEvolucao] = useState<{ dia: string; alertas: number; relatorios: number }[]>([]);
  const [distribuicao, setDistribuicao] = useState<{ nome: string; total: number }[]>([]);
  const [tendencia, setTendencia] = useState<{ dia: string; vendido: number }[]>([]);

  const carregar = async () => {
    setCarregando(true);
    try {
      const hoje = new Date();
      const hojeISO = toLocalISO(hoje);
      const inicioMes = toLocalISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
      const desde14 = new Date(hoje);
      desde14.setDate(desde14.getDate() - 13);

      const [
        analisesRes,
        notifRes,
        settingsRes,
        filiaisRes,
        profilesRes,
        vendasRes,
        metasRes,
      ] = await Promise.all([
        supabase.from("ai_analysis_history").select("id, created_at").gte("analysis_date", hojeISO),
        supabase
          .from("ai_notifications")
          .select("notification_type, delivery_status, sent_at, created_at")
          .gte("created_at", `${toLocalISO(desde14)}T00:00:00`),
        supabase.from("ai_notification_settings").select("send_time, active").limit(1).maybeSingle(),
        supabase.from("filiais").select("id, nome"),
        supabase.from("profiles").select("id, filial_id").eq("ativo", true),
        supabase.from("vendas").select("vendedor_id, data, valor, devolucao").gte("data", inicioMes).lte("data", hojeISO),
        supabase.from("metas").select("vendedor_id, valor_meta").eq("mes", hoje.getMonth() + 1).eq("ano", hoje.getFullYear()),
      ]);

      setAnalisesHoje(analisesRes.data?.length ?? 0);

      const notifs = notifRes.data ?? [];
      setAlertasCriticos(
        notifs.filter(
          (n) => CRITICOS.has(n.notification_type) && (n.created_at ?? "").slice(0, 10) === hojeISO
        ).length
      );

      const enviados = notifs
        .filter((n) => n.sent_at)
        .map((n) => n.sent_at as string)
        .sort();
      setUltimoEnvio(enviados.length ? enviados[enviados.length - 1] : null);
      setProximoEnvio(settingsRes.data?.active ? (settingsRes.data.send_time as string) : null);

      // Evolução dos alertas (14 dias)
      const dias: { dia: string; alertas: number; relatorios: number }[] = [];
      for (let i = 0; i < 14; i++) {
        const d = new Date(desde14);
        d.setDate(d.getDate() + i);
        const iso = toLocalISO(d);
        const doDia = notifs.filter((n) => (n.created_at ?? "").slice(0, 10) === iso);
        dias.push({
          dia: iso.slice(8, 10) + "/" + iso.slice(5, 7),
          alertas: doDia.filter((n) => CRITICOS.has(n.notification_type)).length,
          relatorios: doDia.filter((n) => !CRITICOS.has(n.notification_type)).length,
        });
      }
      setEvolucao(dias);

      // Distribuição por tipo
      const porTipo = new Map<string, number>();
      notifs.forEach((n) =>
        porTipo.set(n.notification_type, (porTipo.get(n.notification_type) ?? 0) + 1)
      );
      setDistribuicao(
        [...porTipo.entries()]
          .map(([k, total]) => ({ nome: TIPO_LABEL[k] ?? k, total }))
          .sort((a, b) => b.total - a.total)
      );

      // Comparativo entre lojas
      const filialPorVendedor = new Map<string, string>();
      (profilesRes.data ?? []).forEach((p) => {
        if (p.filial_id) filialPorVendedor.set(p.id, p.filial_id);
      });
      const vendidoPorFilial = new Map<string, number>();
      const metaPorFilial = new Map<string, number>();
      (vendasRes.data ?? []).forEach((v) => {
        const f = filialPorVendedor.get(v.vendedor_id);
        if (!f) return;
        vendidoPorFilial.set(
          f,
          (vendidoPorFilial.get(f) ?? 0) + (Number(v.valor) || 0) - (Number(v.devolucao) || 0)
        );
      });
      (metasRes.data ?? []).forEach((m) => {
        const f = filialPorVendedor.get(m.vendedor_id);
        if (!f) return;
        metaPorFilial.set(f, (metaPorFilial.get(f) ?? 0) + (Number(m.valor_meta) || 0));
      });
      const resumo: LojaResumo[] = (filiaisRes.data ?? []).map((f) => {
        const vendido = vendidoPorFilial.get(f.id) ?? 0;
        const meta = metaPorFilial.get(f.id) ?? 0;
        return {
          nome: f.nome,
          vendido,
          meta,
          percentual: meta > 0 ? (vendido / meta) * 100 : 0,
        };
      });
      setLojas(resumo.sort((a, b) => b.percentual - a.percentual));

      // Tendência de desempenho (vendas por dia no mês)
      const porDia = new Map<string, number>();
      (vendasRes.data ?? []).forEach((v) => {
        porDia.set(v.data, (porDia.get(v.data) ?? 0) + (Number(v.valor) || 0) - (Number(v.devolucao) || 0));
      });
      setTendencia(
        [...porDia.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([iso, vendido]) => ({ dia: iso.slice(8, 10), vendido }))
      );
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const emRisco = useMemo(() => lojas.filter((l) => l.meta > 0 && l.percentual < 70).length, [lojas]);
  const acimaMeta = useMemo(() => lojas.filter((l) => l.percentual >= 100).length, [lojas]);

  const tooltipStyle = {
    background: "hsl(0 42% 11%)",
    border: "1px solid hsl(0 0% 100% / 0.08)",
    borderRadius: 12,
    color: "hsl(0 0% 98%)",
    fontSize: 12,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        eyebrow="IA Executiva · ANA"
        title="Dashboard IA"
        description="Visão executiva da inteligência de vendas: análises geradas, alertas emitidos e desempenho das lojas em tempo real."
        actions={
          <Button variant="outline" onClick={carregar} disabled={carregando}>
            {carregando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard icon={Send} label="Análises enviadas hoje" value={String(analisesHoje)} accent={CORES[4]} />
        <KpiCard
          icon={AlertTriangle}
          label="Alertas críticos hoje"
          value={String(alertasCriticos)}
          accent={CORES[1]}
        />
        <KpiCard
          icon={TrendingDown}
          label="Lojas em risco"
          value={String(emRisco)}
          hint="Abaixo de 70% da meta do mês"
          accent={CORES[0]}
        />
        <KpiCard
          icon={TrendingUp}
          label="Lojas acima da meta"
          value={String(acimaMeta)}
          hint="Atingimento igual ou superior a 100%"
          accent={CORES[3]}
        />
        <KpiCard
          icon={Clock}
          label="Último envio realizado"
          value={
            ultimoEnvio
              ? new Date(ultimoEnvio).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"
          }
          accent={CORES[5]}
        />
        <KpiCard
          icon={CalendarClock}
          label="Próximo envio programado"
          value={proximoEnvio ? proximoEnvio.slice(0, 5) : "Desativado"}
          hint={proximoEnvio ? "Horário definido nas configurações" : "Ative os envios nas configurações"}
          accent={CORES[2]}
        />
      </div>

      <ScoreComercialPanel />

      <div className="grid gap-6 xl:grid-cols-2">
        <PageCard>
          <h3 className="font-display text-base font-semibold text-foreground">Evolução dos alertas</h3>
          <p className="mb-4 text-xs text-muted-foreground">Últimos 14 dias</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evolucao}>
              <defs>
                <linearGradient id="gradAlertas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CORES[0]} stopOpacity={0.55} />
                  <stop offset="100%" stopColor={CORES[0]} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradRelatorios" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CORES[4]} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={CORES[4]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" />
              <XAxis dataKey="dia" stroke="hsl(0 0% 70%)" fontSize={11} />
              <YAxis stroke="hsl(0 0% 70%)" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="alertas"
                name="Alertas"
                stroke={CORES[0]}
                fill="url(#gradAlertas)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="relatorios"
                name="Relatórios"
                stroke={CORES[4]}
                fill="url(#gradRelatorios)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </PageCard>

        <PageCard>
          <h3 className="font-display text-base font-semibold text-foreground">
            Distribuição dos tipos de alertas
          </h3>
          <p className="mb-4 text-xs text-muted-foreground">Participação por categoria</p>
          {distribuicao.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={distribuicao}
                  dataKey="total"
                  nameKey="nome"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {distribuicao.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
              Nenhum alerta registrado nos últimos 14 dias.
            </div>
          )}
        </PageCard>

        <PageCard>
          <h3 className="font-display text-base font-semibold text-foreground">Comparativo entre lojas</h3>
          <p className="mb-4 text-xs text-muted-foreground">Meta x vendido no mês atual</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={lojas} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" />
              <XAxis dataKey="nome" stroke="hsl(0 0% 70%)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis
                stroke="hsl(0 0% 70%)"
                fontSize={11}
                tickFormatter={(v: number) => `R$\u00A0${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="meta" name="Meta" fill="hsl(0 0% 100% / 0.18)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="vendido" name="Vendido" fill={CORES[0]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PageCard>

        <PageCard>
          <h3 className="font-display text-base font-semibold text-foreground">Tendência de desempenho</h3>
          <p className="mb-4 text-xs text-muted-foreground">Vendas por dia no mês atual</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={tendencia}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 100% / 0.06)" />
              <XAxis dataKey="dia" stroke="hsl(0 0% 70%)" fontSize={11} />
              <YAxis
                stroke="hsl(0 0% 70%)"
                fontSize={11}
                tickFormatter={(v: number) => `R$\u00A0${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtBRL(v)} />
              <Line
                type="monotone"
                dataKey="vendido"
                name="Vendido"
                stroke={CORES[3]}
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </PageCard>
      </div>
    </div>
  );
}
