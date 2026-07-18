import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BarChart3,
  FileText,
  Loader2,
  Sparkles,
  Trophy,
  TrendingUp,
  Target,
  Building2,
  AlertTriangle,
  Lightbulb,
  Download,
  Filter,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUnidos from "@/assets/logo-unidos.png";

/* --------------------------------- Types --------------------------------- */

interface Filial {
  id: string;
  nome: string;
}

interface LojaAgg {
  id: string;
  nome: string;
  meta: number;
  venda: number;
  vendaAnterior: number;
  percentual: number;
  crescimento: number;
  participacao: number;
  diferenca: number;
}

interface MesAgg {
  key: string; // YYYY-MM
  label: string;
  meta: number;
  venda: number;
}

interface Insights {
  destaques: string[];
  alertas: string[];
  oportunidades: string[];
  recomendacoes: string[];
}

/* --------------------------------- Utils --------------------------------- */

const MESES_LABEL = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const formatBRL = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatBRLShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
};

const formatPct = (v: number) =>
  `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

// Datas de venda são armazenadas como DATE (sem fuso horário). Usar
// toISOString() aqui pode deslocar meia-noite para o dia anterior em fusos
// positivos e excluir o último dia do mês dos relatórios.
const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const CHART_COLORS = [
  "hsl(0 85% 55%)",
  "hsl(0 0% 25%)",
  "hsl(38 92% 55%)",
  "hsl(215 90% 55%)",
  "hsl(160 75% 45%)",
  "hsl(265 70% 55%)",
  "hsl(320 70% 55%)",
  "hsl(25 90% 55%)",
];

function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function monthRange(from: Date, to: Date): { mes: number; ano: number; key: string; label: string }[] {
  const out: { mes: number; ano: number; key: string; label: string }[] = [];
  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cur <= end) {
    const mes = cur.getMonth() + 1;
    const ano = cur.getFullYear();
    out.push({
      mes,
      ano,
      key: `${ano}-${String(mes).padStart(2, "0")}`,
      label: `${MESES_LABEL[cur.getMonth()]}/${String(ano).slice(2)}`,
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

async function fetchVendasRange(vendedorIds: string[], inicio: string, fim: string) {
  if (vendedorIds.length === 0) return [];

  const pageSize = 1000;
  const vendas: { valor: number; devolucao: number | null; data: string; vendedor_id: string }[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("vendas")
      .select("valor, devolucao, data, vendedor_id")
      .in("vendedor_id", vendedorIds)
      .gte("data", inicio)
      .lte("data", fim)
      .order("data", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;
    const pagina = (data ?? []) as typeof vendas;
    vendas.push(...pagina);
    if (pagina.length < pageSize) break;
  }

  return vendas;
}

/* --------------------------------- Presets --------------------------------- */

type PeriodPreset = "mes" | "3m" | "6m" | "12m" | "custom";

function computePeriod(preset: PeriodPreset, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  if (preset === "mes") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfMonth };
  }
  if (preset === "3m") return { from: addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -2), to: endOfMonth };
  if (preset === "6m") return { from: addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -5), to: endOfMonth };
  if (preset === "12m") return { from: addMonths(new Date(now.getFullYear(), now.getMonth(), 1), -11), to: endOfMonth };
  const f = customFrom ? new Date(customFrom + "T00:00:00") : new Date(now.getFullYear(), now.getMonth(), 1);
  const t = customTo ? new Date(customTo + "T00:00:00") : endOfMonth;
  return { from: f, to: t };
}

/* --------------------------------- Component --------------------------------- */

interface RelatoriosProps {
  scope?: { filialId: string; filialNome?: string };
}

export default function Relatorios({ scope }: RelatoriosProps = {}) {
  const mode: "filial" | "vendedor" = scope ? "vendedor" : "filial";
  const unitLabel = mode === "vendedor" ? "Vendedor" : "Loja";
  const unitLabelPlural = mode === "vendedor" ? "Vendedores" : "Lojas";

  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [selectedFiliais, setSelectedFiliais] = useState<Set<string>>(new Set());
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("mes");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const [lojas, setLojas] = useState<LojaAgg[]>([]);
  const [evolucao, setEvolucao] = useState<MesAgg[]>([]);
  const [totalVendido, setTotalVendido] = useState(0);
  const [metaTotal, setMetaTotal] = useState(0);
  const [totalAnterior, setTotalAnterior] = useState(0);

  const [aiExec, setAiExec] = useState<string>("");
  const [aiComparativo, setAiComparativo] = useState<string>("");
  const [aiEvolucao, setAiEvolucao] = useState<string>("");
  const [aiRanking, setAiRanking] = useState<string>("");
  const [aiConclusao, setAiConclusao] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  const [insights, setInsights] = useState<Insights>({
    destaques: [],
    alertas: [],
    oportunidades: [],
    recomendacoes: [],
  });

  const [pdfLoading, setPdfLoading] = useState(false);

  const dashRef = useRef<HTMLDivElement>(null);

  /* Load units (branches OR sellers of the manager's branch) */
  useEffect(() => {
    (async () => {
      if (mode === "vendedor" && scope) {
        // Load sellers of this branch (role = vendedor) as the reporting units
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "vendedor");
        const vendedorIds = (roles ?? []).map((r: any) => r.user_id);
        if (vendedorIds.length === 0) {
          setFiliais([]);
          setSelectedFiliais(new Set());
          return;
        }
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nome, filial_id")
          .in("id", vendedorIds)
          .eq("filial_id", scope.filialId)
          .order("nome");
        const arr = ((profs ?? []) as any[]).map((p) => ({ id: p.id, nome: p.nome }));
        setFiliais(arr);
        setSelectedFiliais(new Set(arr.map((f) => f.id)));
      } else {
        const { data } = await supabase.from("filiais").select("id, nome").order("nome");
        const arr = (data as Filial[]) ?? [];
        setFiliais(arr);
        setSelectedFiliais(new Set(arr.map((f) => f.id)));
      }
    })();
  }, [mode, scope?.filialId]);


  const { from, to } = useMemo(
    () => computePeriod(periodPreset, customFrom, customTo),
    [periodPreset, customFrom, customTo]
  );

  const periodoLabel = useMemo(() => {
    const f = from.toLocaleDateString("pt-BR");
    const t = to.toLocaleDateString("pt-BR");
    return `${f} a ${t}`;
  }, [from, to]);

  const percentualAtingido = metaTotal > 0 ? (totalVendido / metaTotal) * 100 : 0;
  const crescimentoTotal =
    totalAnterior > 0 ? ((totalVendido - totalAnterior) / totalAnterior) * 100 : totalVendido > 0 ? 100 : 0;

  const melhorLoja = useMemo(
    () => [...lojas].sort((a, b) => b.percentual - a.percentual)[0],
    [lojas]
  );
  const maiorCrescimento = useMemo(
    () => [...lojas].sort((a, b) => b.crescimento - a.crescimento)[0],
    [lojas]
  );

  /* ------------------------- Data fetch ------------------------- */

  const gerarRelatorio = useCallback(async () => {
    if (selectedFiliais.size === 0) {
      toast.error(mode === "vendedor" ? "Selecione ao menos um vendedor" : "Selecione ao menos uma loja");
      return;
    }
    setLoading(true);
    setGenerated(false);

    try {
      const filialIds = Array.from(selectedFiliais);
      const periodDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000)) + 1;
      const prevTo = new Date(from);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - periodDays + 1);

      // Vendedores das unidades selecionadas.
      // IMPORTANTE: alinhado com VisaoGeral — usamos TODOS os profiles com filial_id
      // vinculada à unidade, SEM filtrar por role='vendedor'. Filtrar por role atual
      // exclui vendas históricas de usuários que mudaram de papel/foram desativados,
      // gerando divergência entre relatório e dashboard.
      // - mode "filial": todos os profiles com filial_id nas filiais selecionadas.
      // - mode "vendedor": cada id selecionado é sua própria unidade.
      let vendedores: { id: string; filial_id: string }[] = [];
      if (mode === "vendedor") {
        vendedores = filialIds.map((id) => ({ id, filial_id: id }));
      } else {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, filial_id")
          .in("filial_id", filialIds);
        vendedores = (profiles ?? []) as { id: string; filial_id: string }[];
      }
      const vendedorIds = vendedores.map((v) => v.id);
      const vendedorToFilial = new Map(vendedores.map((v) => [v.id, v.filial_id]));

      // Vendas do período atual + período anterior + TODAS as metas históricas dos vendedores
      const [vendasAtual, vendasAnterior, metasRes] = await Promise.all([
        fetchVendasRange(vendedorIds, toISO(from), toISO(to)),
        fetchVendasRange(vendedorIds, toISO(prevFrom), toISO(prevTo)),
        vendedorIds.length
          ? supabase
              .from("metas")
              .select("vendedor_id, valor_meta, mes, ano")
              .in("vendedor_id", vendedorIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const metas = (metasRes.data ?? []) as any[];

      // Aggregate per filial
      const lojaMap = new Map<string, LojaAgg>();
      filiais
        .filter((f) => selectedFiliais.has(f.id))
        .forEach((f) =>
          lojaMap.set(f.id, {
            id: f.id,
            nome: f.nome,
            meta: 0,
            venda: 0,
            vendaAnterior: 0,
            percentual: 0,
            crescimento: 0,
            participacao: 0,
            diferenca: 0,
          })
        );

      vendasAtual.forEach((v) => {
        const fid = vendedorToFilial.get(v.vendedor_id);
        if (!fid) return;
        const agg = lojaMap.get(fid);
        if (!agg) return;
        agg.venda += Number(v.valor) - Number(v.devolucao ?? 0);
      });
      vendasAnterior.forEach((v) => {
        const fid = vendedorToFilial.get(v.vendedor_id);
        if (!fid) return;
        const agg = lojaMap.get(fid);
        if (!agg) return;
        agg.vendaAnterior += Number(v.valor) - Number(v.devolucao ?? 0);
      });

      // Meta do período: para CADA mês do período, somamos a meta mais recente
      // (<= aquele mês) de cada vendedor. Isso respeita alterações históricas de meta
      // e alinha com o comportamento mensal usado no dashboard.
      const meses = monthRange(from, to);
      // Ordena metas por (ano, mes) asc para facilitar seleção "mais recente até X"
      const metasSorted = [...metas].sort(
        (a, b) => Number(a.ano) * 12 + Number(a.mes) - (Number(b.ano) * 12 + Number(b.mes))
      );

      meses.forEach((mesInfo) => {
        const rankLimite = mesInfo.ano * 12 + mesInfo.mes;
        const metaMaisRecenteDoMes = new Map<string, number>();
        metasSorted.forEach((m) => {
          const rank = Number(m.ano) * 12 + Number(m.mes);
          if (rank > rankLimite) return;
          metaMaisRecenteDoMes.set(m.vendedor_id, Number(m.valor_meta));
        });
        metaMaisRecenteDoMes.forEach((val, vid) => {
          const fid = vendedorToFilial.get(vid);
          if (!fid) return;
          const agg = lojaMap.get(fid);
          if (!agg) return;
          agg.meta += val;
        });
      });

      // Compute derived per loja
      let totalV = 0;
      let totalM = 0;
      let totalPrev = 0;
      lojaMap.forEach((l) => {
        totalV += l.venda;
        totalM += l.meta;
        totalPrev += l.vendaAnterior;
      });
      const lojasArr: LojaAgg[] = [];
      lojaMap.forEach((l) => {
        l.percentual = l.meta > 0 ? (l.venda / l.meta) * 100 : 0;
        l.crescimento =
          l.vendaAnterior > 0
            ? ((l.venda - l.vendaAnterior) / l.vendaAnterior) * 100
            : l.venda > 0
            ? 100
            : 0;
        l.participacao = totalV > 0 ? (l.venda / totalV) * 100 : 0;
        l.diferenca = l.venda - l.meta;
        lojasArr.push(l);
      });
      lojasArr.sort((a, b) => b.venda - a.venda);

      // Evolução mensal — para cada mês, meta = soma das metas mais recentes até aquele mês
      const evoMap = new Map<string, MesAgg>();
      meses.forEach((m) => {
        const rankLimite = m.ano * 12 + m.mes;
        const metaDoMes = new Map<string, number>();
        metasSorted.forEach((mm) => {
          const rank = Number(mm.ano) * 12 + Number(mm.mes);
          if (rank > rankLimite) return;
          metaDoMes.set(mm.vendedor_id, Number(mm.valor_meta));
        });
        let somaMeta = 0;
        metaDoMes.forEach((val, vid) => {
          if (vendedorToFilial.has(vid)) somaMeta += val;
        });
        evoMap.set(m.key, { key: m.key, label: m.label, meta: somaMeta, venda: 0 });
      });
      vendasAtual.forEach((v) => {
        const d = new Date(v.data + "T00:00:00");
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = evoMap.get(key);
        if (bucket) bucket.venda += Number(v.valor) - Number(v.devolucao ?? 0);
      });
      const evoArr = Array.from(evoMap.values());

      // Insights engine
      const _insights: Insights = {
        destaques: [],
        alertas: [],
        oportunidades: [],
        recomendacoes: [],
      };
      lojasArr.forEach((l) => {
        if (l.percentual >= 110) _insights.destaques.push(`${l.nome} superou a meta em ${(l.percentual - 100).toFixed(1)}%.`);
        if (l.percentual < 80) _insights.alertas.push(`${l.nome} está com ${l.percentual.toFixed(1)}% de atingimento (abaixo de 80%).`);
        if (l.crescimento <= -10) _insights.alertas.push(`${l.nome} teve queda de ${Math.abs(l.crescimento).toFixed(1)}% vs período anterior.`);
        if (l.percentual < 100) _insights.oportunidades.push(`${l.nome} ainda está ${(100 - l.percentual).toFixed(1)}% abaixo da meta.`);
      });
      if (melhorLoja || lojasArr[0]) {
        const best = [...lojasArr].sort((a, b) => b.percentual - a.percentual)[0];
        if (best) {
          _insights.recomendacoes.push(
            mode === "vendedor"
              ? `Compartilhar práticas de venda de ${best.nome} com os demais vendedores da equipe.`
              : `Replicar práticas comerciais da ${best.nome} nas demais lojas.`
          );
        }
      }
      const piorCresc = [...lojasArr].sort((a, b) => a.crescimento - b.crescimento)[0];
      if (piorCresc && piorCresc.crescimento < 0) {
        _insights.recomendacoes.push(
          mode === "vendedor"
            ? `Realizar coaching individual e acompanhamento de rotina com ${piorCresc.nome}.`
            : `Revisar mix de produtos e campanhas da ${piorCresc.nome}.`
        );
      }
      const abaixoMeta = lojasArr.filter((l) => l.percentual < 100);
      if (abaixoMeta.length > 0) {
        const nomes = abaixoMeta.map((x) => x.nome).slice(0, 3).join(", ");
        _insights.recomendacoes.push(
          mode === "vendedor"
            ? `Reforçar treinamento e definir plano de ação individual para ${nomes}.`
            : `Aumentar campanhas promocionais em ${nomes}.`
        );
      }


      setLojas(lojasArr);
      setEvolucao(evoArr);
      setTotalVendido(totalV);
      setMetaTotal(totalM);
      setTotalAnterior(totalPrev);
      setInsights(_insights);
      setGenerated(true);

      // Trigger AI
      const bestLoja = [...lojasArr].sort((a, b) => b.percentual - a.percentual)[0];
      const bestCresc = [...lojasArr].sort((a, b) => b.crescimento - a.crescimento)[0];
      fetchAllInsights({
        periodo: periodoLabel,
        totalVendido: totalV,
        metaTotal: totalM,
        percentualAtingido: totalM > 0 ? (totalV / totalM) * 100 : 0,
        crescimento: totalPrev > 0 ? ((totalV - totalPrev) / totalPrev) * 100 : totalV > 0 ? 100 : 0,
        melhorLoja: bestLoja,
        maiorCrescimento: bestCresc,
        lojas: lojasArr,
        mode,
      });
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar relatório");
    } finally {
      setLoading(false);
    }
  }, [selectedFiliais, filiais, from, to, periodoLabel]);

  /* ------------------------- AI ------------------------- */

  const callInsight = async (payload: any, section: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke("relatorio-insights", {
        body: { ...payload, section },
      });
      if (error) throw error;
      if ((data as any)?.error === "rate_limit") return "Limite de requisições atingido. Tente novamente em instantes.";
      if ((data as any)?.error === "credits_exhausted") return "Créditos de IA esgotados. Adicione créditos para gerar análises.";
      return (data as any)?.insight ?? "";
    } catch (e) {
      console.error("AI error", e);
      return "";
    }
  };

  const fetchAllInsights = async (payload: any) => {
    setAiLoading(true);
    setAiExec(""); setAiComparativo(""); setAiEvolucao(""); setAiRanking(""); setAiConclusao("");
    try {
      const [a, b, c, d, e] = await Promise.all([
        callInsight(payload, "executivo"),
        callInsight(payload, "comparativo"),
        callInsight(payload, "evolucao"),
        callInsight(payload, "ranking"),
        callInsight(payload, "conclusao"),
      ]);
      setAiExec(a);
      setAiComparativo(b);
      setAiEvolucao(c);
      setAiRanking(d);
      setAiConclusao(e);
    } finally {
      setAiLoading(false);
    }
  };

  /* ------------------------- PDF ------------------------- */

  const gerarPDF = async () => {
    if (!generated) {
      toast.error("Gere o relatório primeiro");
      return;
    }
    setPdfLoading(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;

      // COVER
      doc.setFillColor(15, 15, 15);
      doc.rect(0, 0, pageW, pageH, "F");
      try {
        doc.addImage(logoUnidos, "PNG", pageW / 2 - 40, 120, 80, 80);
      } catch {}
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.text("RELATÓRIO EXECUTIVO", pageW / 2, 260, { align: "center" });
      doc.text("DE DESEMPENHO COMERCIAL", pageW / 2, 288, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(220, 220, 220);
      doc.text(`Período: ${periodoLabel}`, pageW / 2, 340, { align: "center" });
      doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")}`, pageW / 2, 360, { align: "center" });
      doc.setDrawColor(200, 40, 40);
      doc.setLineWidth(2);
      doc.line(pageW / 2 - 60, 380, pageW / 2 + 60, 380);
      doc.setFontSize(10);
      doc.setTextColor(180, 180, 180);
      doc.text("Unidos Importados", pageW / 2, pageH - 60, { align: "center" });

      // SUMÁRIO EXECUTIVO
      doc.addPage();
      let y = margin;
      doc.setTextColor(20, 20, 20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Sumário Executivo", margin, y);
      y += 24;
      doc.setDrawColor(200, 40, 40);
      doc.line(margin, y, margin + 60, y);
      y += 18;

      const kpis: [string, string][] = [
        ["Total Vendido", formatBRL(totalVendido)],
        ["Meta Total", formatBRL(metaTotal)],
        ["Atingimento", formatPct(percentualAtingido)],
        ["Crescimento vs anterior", formatPct(crescimentoTotal)],
        ["Melhor loja", melhorLoja ? `${melhorLoja.nome} (${formatPct(melhorLoja.percentual)})` : "-"],
        ["Maior crescimento", maiorCrescimento ? `${maiorCrescimento.nome} (${formatPct(maiorCrescimento.crescimento)})` : "-"],
      ];
      autoTable(doc, {
        startY: y,
        head: [["Indicador", "Valor"]],
        body: kpis,
        theme: "grid",
        headStyles: { fillColor: [200, 40, 40], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 6 },
      });
      y = (doc as any).lastAutoTable.finalY + 24;

      // Análise Executiva
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Análise Executiva (IA)", margin, y);
      y += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const execText = aiExec || "Análise indisponível.";
      const execLines = doc.splitTextToSize(execText, pageW - margin * 2);
      doc.text(execLines, margin, y);
      y += execLines.length * 12 + 20;

      // RANKING
      doc.addPage();
      y = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Ranking de Lojas", margin, y);
      y += 24;
      doc.setDrawColor(200, 40, 40);
      doc.line(margin, y, margin + 60, y);
      y += 12;

      const ranking = [...lojas].sort((a, b) => b.percentual - a.percentual);
      autoTable(doc, {
        startY: y,
        head: [["Pos.", "Loja", "Venda", "Meta", "Diferença", "%", "Participação"]],
        body: ranking.map((l, i) => [
          `${i + 1}º`,
          l.nome,
          formatBRL(l.venda),
          formatBRL(l.meta),
          formatBRL(l.diferenca),
          formatPct(l.percentual),
          formatPct(l.participacao),
        ]),
        theme: "striped",
        headStyles: { fillColor: [200, 40, 40], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      if (aiRanking) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Análise do Ranking", margin, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        const rLines = doc.splitTextToSize(aiRanking, pageW - margin * 2);
        doc.text(rLines, margin, y);
        y += rLines.length * 12 + 10;
      }

      // Insights automáticos
      doc.addPage();
      y = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Insights & Recomendações", margin, y);
      y += 24;
      doc.setDrawColor(200, 40, 40);
      doc.line(margin, y, margin + 60, y);
      y += 20;

      const blocks: [string, string[]][] = [
        ["Destaques", insights.destaques],
        ["Alertas", insights.alertas],
        ["Oportunidades", insights.oportunidades],
        ["Recomendações", insights.recomendacoes],
      ];
      for (const [title, items] of blocks) {
        if (items.length === 0) continue;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, margin, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        items.forEach((it) => {
          const lines = doc.splitTextToSize(`• ${it}`, pageW - margin * 2);
          if (y + lines.length * 12 > pageH - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(lines, margin, y);
          y += lines.length * 12 + 4;
        });
        y += 8;
      }

      // Conclusão
      if (y > pageH - 180) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Conclusão Executiva", margin, y);
      y += 24;
      doc.setDrawColor(200, 40, 40);
      doc.line(margin, y, margin + 60, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const cText = aiConclusao || "Conclusão indisponível.";
      const cLines = doc.splitTextToSize(cText, pageW - margin * 2);
      doc.text(cLines, margin, y);

      // Footer with page numbers
      const total = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        if (i > 1) {
          doc.text(`Unidos Importados · Relatório Executivo · ${periodoLabel}`, margin, pageH - 20);
          doc.text(`${i}/${total}`, pageW - margin, pageH - 20, { align: "right" });
        }
      }

      doc.save(`Relatorio-Executivo-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF gerado com sucesso");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  /* ------------------------- Rendering helpers ------------------------- */

  const KpiCard = ({
    icon: Icon,
    label,
    value,
    hint,
    tone = "default",
  }: {
    icon: any;
    label: string;
    value: string;
    hint?: string;
    tone?: "default" | "positive" | "negative" | "warn";
  }) => {
    const glow =
      tone === "positive"
        ? "from-emerald-500/20"
        : tone === "negative"
        ? "from-rose-500/20"
        : tone === "warn"
        ? "from-amber-500/20"
        : "from-primary/20";
    return (
      <div
        className="relative overflow-hidden rounded-card border border-white/5 p-5"
        style={{
          background:
            "linear-gradient(180deg, hsl(0 39% 15% / 0.85), hsl(0 42% 11% / 0.75))",
          backdropFilter: "blur(14px) saturate(140%)",
          WebkitBackdropFilter: "blur(14px) saturate(140%)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className={`absolute -top-16 -right-16 h-40 w-40 rounded-full bg-gradient-to-br ${glow} to-transparent opacity-70 blur-2xl`} />
        <div className="relative flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="relative font-display text-xl xl:text-2xl font-bold text-foreground whitespace-nowrap">
          {value}
        </div>
        {hint && <div className="relative mt-1 text-xs text-muted-foreground truncate">{hint}</div>}
      </div>
    );
  };

  const AiPanel = ({ title, text }: { title: string; text: string }) => (
    <div
      className="mt-4 rounded-card border border-primary/20 p-4"
      style={{
        background:
          "linear-gradient(135deg, hsl(0 100% 52% / 0.08), hsl(0 0% 0% / 0.4))",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          {title}
        </span>
      </div>
      {aiLoading && !text ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando análise...
        </div>
      ) : (
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
          {text || "Sem análise disponível."}
        </p>
      )}
    </div>
  );

  const ranking = useMemo(
    () => [...lojas].sort((a, b) => b.percentual - a.percentual),
    [lojas]
  );

  const toggleFilial = (id: string) => {
    setSelectedFiliais((prev) => {
      const nx = new Set(prev);
      if (nx.has(id)) nx.delete(id);
      else nx.add(id);
      return nx;
    });
  };

  const selectAll = () => setSelectedFiliais(new Set(filiais.map((f) => f.id)));
  const clearAll = () => setSelectedFiliais(new Set());

  /* --------------------------------- UI --------------------------------- */

  return (
    <div>
      <PageHeader
        icon={FileText}
        eyebrow="Performance"
        title="Relatórios Executivos"
        description="Visão estratégica do desempenho comercial com análises inteligentes geradas por IA."
        actions={
          <Button
            onClick={gerarPDF}
            disabled={!generated || pdfLoading}
            className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Gerar Relatório PDF
          </Button>
        }
      />

      {/* Filtros */}
      <PageCard className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="font-display font-semibold text-foreground">Filtros Avançados</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Seleção de {unitLabelPlural}
              </Label>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                  Nenhuma
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              {filiais.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-2 rounded-md border border-white/5 bg-black/20 px-3 py-2 cursor-pointer hover:bg-white/5 transition"
                >
                  <Checkbox
                    checked={selectedFiliais.has(f.id)}
                    onCheckedChange={() => toggleFilial(f.id)}
                  />
                  <span className="text-sm truncate">{f.nome}</span>
                </label>
              ))}
              {filiais.length === 0 && (
                <div className="text-xs text-muted-foreground col-span-full">
                  Nenhuma loja cadastrada.
                </div>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
              Período
            </Label>
            <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as PeriodPreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mês atual</SelectItem>
                <SelectItem value="3m">Últimos 3 meses</SelectItem>
                <SelectItem value="6m">Últimos 6 meses</SelectItem>
                <SelectItem value="12m">Últimos 12 meses</SelectItem>
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
            {periodPreset === "custom" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Data inicial</Label>
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Data final</Label>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="mt-3 text-xs text-muted-foreground">
              Período selecionado: <span className="text-foreground">{periodoLabel}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button
            onClick={gerarRelatorio}
            disabled={loading}
            className="gap-2 bg-gradient-primary text-primary-foreground shadow-glow"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {generated ? "Atualizar Relatório" : "Gerar Relatório"}
          </Button>
        </div>
      </PageCard>

      {!generated && !loading && (
        <PageCard>
          <div className="text-center py-12">
            <Sparkles className="h-10 w-10 mx-auto text-primary/60 mb-3" />
            <h3 className="font-display font-semibold text-lg">Pronto para gerar seu relatório</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Selecione as lojas e o período desejados, então clique em Gerar Relatório para visualizar
              o dashboard executivo e as análises da IA.
            </p>
          </div>
        </PageCard>
      )}

      {generated && (
        <div ref={dashRef} className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard icon={TrendingUp} label="Total Vendido" value={formatBRLShort(totalVendido)} hint={formatBRL(totalVendido)} tone="positive" />
            <KpiCard icon={Target} label="Meta Total" value={formatBRLShort(metaTotal)} hint={formatBRL(metaTotal)} />
            <KpiCard icon={Percent} label="Atingimento" value={formatPct(percentualAtingido)} tone={percentualAtingido >= 100 ? "positive" : "warn"} />
            <KpiCard
              icon={crescimentoTotal >= 0 ? ArrowUpRight : ArrowDownRight}
              label="Crescimento"
              value={`${crescimentoTotal >= 0 ? "+" : ""}${crescimentoTotal.toFixed(1)}%`}
              hint="vs período anterior"
              tone={crescimentoTotal >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              icon={Trophy}
              label={`Melhor ${unitLabel}`}
              value={melhorLoja?.nome ?? "-"}
              hint={melhorLoja ? `${formatPct(melhorLoja.percentual)} da meta` : ""}
              tone="positive"
            />
            <KpiCard
              icon={ArrowUpRight}
              label="Maior Crescimento"
              value={maiorCrescimento?.nome ?? "-"}
              hint={maiorCrescimento ? `+${maiorCrescimento.crescimento.toFixed(1)}%` : ""}
              tone="positive"
            />
          </div>

          {/* Executive AI */}
          <PageCard>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="font-display font-semibold">Análise Executiva</h2>
            </div>
            <AiPanel title={`${mode === "vendedor" ? "Gerente Comercial" : "Diretor Comercial"} · IA`} text={aiExec} />
          </PageCard>

          {/* Sub-tabs */}
          <Tabs defaultValue="comparativo" className="w-full">
            <TabsList className="w-full flex-wrap h-auto bg-black/30 border border-white/5">
              <TabsTrigger value="comparativo">Comparativo de {unitLabelPlural}</TabsTrigger>
              <TabsTrigger value="evolucao">Evolução de Metas</TabsTrigger>
              <TabsTrigger value="participacao">Participação</TabsTrigger>
              <TabsTrigger value="crescimento">Crescimento</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>

            {/* Comparativo */}
            <TabsContent value="comparativo" className="mt-6 space-y-6">
              <PageCard>
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Meta vs Realizado
                </h3>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={lojas}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="nome" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                      <YAxis
                        tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                        tickFormatter={(v) => formatBRLShort(Number(v))}
                      />
                      <Tooltip
                        contentStyle={{ background: "hsl(0 42% 11%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
                        formatter={(v: any, name: any) => [formatBRL(Number(v)), name === "meta" ? "Meta" : "Vendido"]}
                      />
                      <Legend formatter={(v) => (v === "meta" ? "Meta" : "Vendido")} />
                      <Bar dataKey="meta" fill="hsl(0 0% 30%)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="venda" fill="hsl(0 85% 55%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <AiPanel title="Análise Comparativa · IA" text={aiComparativo} />
              </PageCard>

              <PageCard>
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Percent className="h-4 w-4 text-primary" /> Percentual de Meta Atingida
                </h3>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={ranking} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                      <YAxis type="category" dataKey="nome" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} width={120} />
                      <Tooltip
                        contentStyle={{ background: "hsl(0 42% 11%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
                        formatter={(v: any) => formatPct(Number(v))}
                      />
                      <Bar dataKey="percentual" radius={[0, 6, 6, 0]}>
                        {ranking.map((l, i) => (
                          <Cell key={i} fill={l.percentual >= 100 ? "hsl(160 75% 45%)" : l.percentual >= 80 ? "hsl(38 92% 55%)" : "hsl(0 85% 55%)"} />
                        ))}
                        <LabelList
                          dataKey="percentual"
                          position="right"
                          formatter={(v: number) => `${v.toFixed(1)}%`}
                          className="fill-foreground text-xs"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PageCard>
            </TabsContent>

            {/* Evolução */}
            <TabsContent value="evolucao" className="mt-6 space-y-6">
              <PageCard>
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Evolução Mensal
                </h3>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={evolucao}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatBRLShort(Number(v))} tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(0 42% 11%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
                        formatter={(v: any, name: any) => [formatBRL(Number(v)), name === "meta" ? "Meta" : "Venda"]}
                      />
                      <Legend formatter={(v) => (v === "meta" ? "Meta mensal" : "Venda mensal")} />
                      <Line type="monotone" dataKey="meta" stroke="hsl(0 0% 55%)" strokeWidth={2} dot />
                      <Line type="monotone" dataKey="venda" stroke="hsl(0 85% 55%)" strokeWidth={3} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <AiPanel title="Análise de Evolução · IA" text={aiEvolucao} />
              </PageCard>
            </TabsContent>

            {/* Participação */}
            <TabsContent value="participacao" className="mt-6 space-y-6">
              <PageCard>
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" /> Participação no Faturamento
                </h3>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={lojas.filter((l) => l.venda > 0)}
                        dataKey="venda"
                        nameKey="nome"
                        cx="50%"
                        cy="50%"
                        outerRadius={130}
                        innerRadius={70}
                        paddingAngle={2}
                        label={(entry: any) => `${entry.nome}: ${entry.participacao.toFixed(1)}%`}
                      >
                        {lojas.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(0 42% 11%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
                        formatter={(v: any, _n: any, p: any) => [`${formatBRL(Number(v))} (${p.payload.participacao.toFixed(1)}%)`, p.payload.nome]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </PageCard>
            </TabsContent>

            {/* Crescimento */}
            <TabsContent value="crescimento" className="mt-6 space-y-6">
              <PageCard>
                <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" /> Crescimento entre Períodos
                </h3>
                <div className="h-[360px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={lojas}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="nome" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => formatBRLShort(Number(v))} tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(0 42% 11%)", border: "1px solid hsl(0 0% 100% / 0.1)" }}
                        formatter={(v: any, name: any) => [formatBRL(Number(v)), name === "vendaAnterior" ? "Período Anterior" : "Período Atual"]}
                      />
                      <Legend formatter={(v) => (v === "vendaAnterior" ? "Período Anterior" : "Período Atual")} />
                      <Bar dataKey="vendaAnterior" fill="hsl(0 0% 40%)" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="venda" fill="hsl(0 85% 55%)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </PageCard>
            </TabsContent>

            {/* Ranking */}
            <TabsContent value="ranking" className="mt-6 space-y-6">
              <PageCard padded={false}>
                <div className="p-5 border-b border-white/5 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold">Ranking Geral de Desempenho</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 text-left">Pos.</th>
                        <th className="px-4 py-3 text-left">{unitLabel}</th>
                        <th className="px-4 py-3 text-right">Venda</th>
                        <th className="px-4 py-3 text-right">Meta</th>
                        <th className="px-4 py-3 text-right">Diferença</th>
                        <th className="px-4 py-3 text-right">%</th>
                        <th className="px-4 py-3 text-right">Participação</th>
                        <th className="px-4 py-3 text-center">Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranking.map((l, i) => {
                        const positivo = l.percentual >= 100;
                        return (
                          <tr key={l.id} className="border-t border-white/5 hover:bg-white/5">
                            <td className="px-4 py-3 font-bold text-primary">{i + 1}º</td>
                            <td className="px-4 py-3 font-medium">{l.nome}</td>
                            <td className="px-4 py-3 text-right">{formatBRL(l.venda)}</td>
                            <td className="px-4 py-3 text-right">{formatBRL(l.meta)}</td>
                            <td className={`px-4 py-3 text-right ${l.diferenca >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                              {formatBRL(l.diferenca)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">{formatPct(l.percentual)}</td>
                            <td className="px-4 py-3 text-right">{formatPct(l.participacao)}</td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  positivo
                                    ? "bg-emerald-500/15 text-emerald-400"
                                    : l.percentual >= 80
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-rose-500/15 text-rose-400"
                                }`}
                              >
                                {positivo ? "Superou meta" : l.percentual >= 80 ? "Próximo da meta" : "Abaixo da meta"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {ranking.length === 0 && (
                        <tr>
                          <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                            Nenhum dado no período selecionado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-5">
                  <AiPanel title="Análise do Ranking · IA" text={aiRanking} />
                </div>
              </PageCard>
            </TabsContent>

            {/* Insights */}
            <TabsContent value="insights" className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <InsightBlock icon={Trophy} tone="positive" title="Destaques" items={insights.destaques} />
                <InsightBlock icon={AlertTriangle} tone="warn" title="Alertas" items={insights.alertas} />
                <InsightBlock icon={Target} tone="default" title="Oportunidades" items={insights.oportunidades} />
                <InsightBlock icon={Lightbulb} tone="positive" title="Recomendações" items={insights.recomendacoes} />
              </div>
              <PageCard>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-display font-semibold">Conclusão Executiva</h3>
                </div>
                <AiPanel title="Consultor Estratégico · IA" text={aiConclusao} />
              </PageCard>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Insight block --------------------------------- */

function InsightBlock({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: any;
  title: string;
  items: string[];
  tone: "positive" | "warn" | "negative" | "default";
}) {
  const color =
    tone === "positive"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : tone === "warn"
      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
      : tone === "negative"
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
      : "text-primary bg-primary/10 border-primary/20";
  return (
    <PageCard>
      <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 mb-3 ${color}`}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum item identificado neste período.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="text-sm text-foreground/90 flex gap-2">
              <span className="text-primary">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </PageCard>
  );
}
