import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sparkles,
  Bot,
  Send,
  Copy,
  RefreshCw,
  Loader2,
  CalendarDays,
  Users,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { toLocalISO } from "@/utils/dateISO";

const META_TICKET = 500;

type Tipo = "diario" | "semanal" | "mensal";

interface Destinatario {
  id: string;
  nome: string;
  cargo: string;
  telefone: string;
  alert_types: string[];
}

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

interface Analise {
  tipo: Tipo;
  periodoLabel: string;
  periodoAnteriorLabel: string;
  totalVendido: number;
  metaPeriodo: number;
  percentualAtingido: number;
  crescimento: number;
  ticketGeral: number;
  metaTicket: number;
  diasUteisRestantes: number;
  unidades: UnidadeResumo[];
  feriados: string[];
  /** Escopo da análise: rede completa ou loja específica */
  escopoNome: string;
  /** "loja" quando a análise é da rede, "vendedor" quando é de uma loja específica */
  unidadeLabel: "loja" | "vendedor";
}

const TIPO_LABEL: Record<Tipo, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

const fmtBRL = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtData = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

const addDays = (iso: string, days: number) => {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return toLocalISO(dt);
};

// Dias úteis = todos exceto domingos e feriados
const diasUteis = (ini: string, fim: string, feriados: Set<string>) => {
  const [ai, mi, di] = ini.split("-").map(Number);
  const cursor = new Date(ai, mi - 1, di);
  const limite = (() => {
    const [af, mf, df] = fim.split("-").map(Number);
    return new Date(af, mf - 1, df);
  })();
  let total = 0;
  while (cursor <= limite) {
    const iso = toLocalISO(cursor);
    if (cursor.getDay() !== 0 && !feriados.has(iso)) total++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return total;
};

const overlapDias = (ini: string, fim: string, di: string, df: string) => {
  const start = di > ini ? di : ini;
  const end = df < fim ? df : fim;
  if (start > end) return 0;
  const [a1, m1, d1] = start.split("-").map(Number);
  const [a2, m2, d2] = end.split("-").map(Number);
  const ms = new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime();
  return Math.floor(ms / 86400000) + 1;
};

function calcularRange(tipo: Tipo, base: string) {
  if (tipo === "diario") {
    return {
      ini: base,
      fim: base,
      prevIni: addDays(base, -1),
      prevFim: addDays(base, -1),
      label: fmtData(base),
      prevLabel: fmtData(addDays(base, -1)),
    };
  }
  if (tipo === "semanal") {
    const ini = addDays(base, -6);
    return {
      ini,
      fim: base,
      prevIni: addDays(base, -13),
      prevFim: addDays(base, -7),
      label: `${fmtData(ini)} a ${fmtData(base)}`,
      prevLabel: `${fmtData(addDays(base, -13))} a ${fmtData(addDays(base, -7))}`,
    };
  }
  const [ano, mes] = base.split("-").map(Number);
  const ini = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const fim = toLocalISO(new Date(ano, mes, 0));
  const prevMes = mes === 1 ? 12 : mes - 1;
  const prevAno = mes === 1 ? ano - 1 : ano;
  const prevIni = `${prevAno}-${String(prevMes).padStart(2, "0")}-01`;
  const prevFim = toLocalISO(new Date(prevAno, prevMes, 0));
  return {
    ini,
    fim,
    prevIni,
    prevFim,
    label: `${fmtData(ini)} a ${fmtData(fim)}`,
    prevLabel: `${fmtData(prevIni)} a ${fmtData(prevFim)}`,
  };
}

function CardSecao({
  icon: Icon,
  title,
  description,
  actions,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageCard>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </PageCard>
  );
}

export default function IAExecutiva() {
  const hoje = toLocalISO(new Date());
  const [tipo, setTipo] = useState<Tipo>("diario");
  const [dataBase, setDataBase] = useState(hoje);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [destinatarios, setDestinatarios] = useState<Destinatario[]>([]);
  const [filiaisLista, setFiliaisLista] = useState<{ id: string; nome: string }[]>([]);
  const [filialId, setFilialId] = useState<string>("todas");

  useEffect(() => {
    (async () => {
      const [{ data }, { data: fdata }] = await Promise.all([
        supabase
          .from("ai_recipients")
          .select("id, nome, cargo, telefone, alert_types")
          .eq("active", true)
          .order("created_at", { ascending: true }),
        supabase.from("filiais").select("id, nome").order("nome"),
      ]);
      setDestinatarios((data ?? []) as unknown as Destinatario[]);
      setFiliaisLista(fdata ?? []);
    })();
  }, []);

  const range = useMemo(() => calcularRange(tipo, dataBase), [tipo, dataBase]);

  const carregarDados = async () => {
    setCarregando(true);
    setMensagem("");
    try {
      const { ini, fim, prevIni, prevFim } = range;
      const [ano, mes] = ini.split("-").map(Number);
      const mesIni = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const mesFim = toLocalISO(new Date(ano, mes, 0));

      const [filiaisRes, profilesRes, vendasRes, vendasPrevRes, metasRes, feriadosRes, feriasRes, folgasRes] =
        await Promise.all([
          supabase.from("filiais").select("id, nome"),
          supabase.from("profiles").select("id, nome, filial_id"),
          supabase.from("vendas").select("vendedor_id, valor, devolucao, quantidade_vendas, data").gte("data", ini).lte("data", fim),
          supabase.from("vendas").select("vendedor_id, valor, devolucao, quantidade_vendas, data").gte("data", prevIni).lte("data", prevFim),
          supabase.from("metas").select("vendedor_id, valor_meta, meta_ticket, mes, ano").eq("mes", mes).eq("ano", ano),
          supabase.from("feriados").select("data, descricao, filial_id").gte("data", mesIni).lte("data", mesFim),
          supabase.from("ferias").select("vendedor_id, data_inicio, data_fim"),
          supabase.from("folgas").select("vendedor_id, data").gte("data", ini).lte("data", fim),
        ]);

      const filiais = filiaisRes.data ?? [];
      const profiles = profilesRes.data ?? [];
      const filialDoVendedor = new Map<string, string | null>(
        profiles.map((p) => [p.id, p.filial_id])
      );

      // Escopo: rede completa (agrupa por loja) ou loja específica (agrupa por vendedor)
      const porLoja = filialId === "todas";
      const filialAtual = filiais.find((f) => f.id === filialId);
      const escopoNome = porLoja ? "Rede completa" : filialAtual?.nome ?? "Loja";
      const unidadeLabel: "loja" | "vendedor" = porLoja ? "loja" : "vendedor";

      const noEscopo = (vendedorId: string) =>
        porLoja ? true : filialDoVendedor.get(vendedorId) === filialId;

      const feriadosMes = feriadosRes.data ?? [];
      const feriadosRelevantes = feriadosMes.filter(
        (f) => !f.filial_id || (!porLoja && f.filial_id === filialId)
      );
      const feriadosGerais = new Set(feriadosRelevantes.map((f) => f.data));
      const feriadosPeriodo = feriadosRelevantes
        .filter((f) => f.data >= ini && f.data <= fim)
        .map((f) => `${fmtData(f.data)} — ${f.descricao}`);

      const uteisMes = diasUteis(mesIni, mesFim, feriadosGerais);
      const uteisPeriodo = diasUteis(ini, fim, feriadosGerais);
      const uteisRestantes = diasUteis(
        hoje > mesIni && hoje <= mesFim ? hoje : mesIni,
        mesFim,
        feriadosGerais
      );

      type Acc = { venda: number; qtd: number; prev: number; meta: number; metaTicket: number; ferias: number; folgas: number };
      const acc = new Map<string, Acc>();
      const getAcc = (id: string) => {
        if (!acc.has(id))
          acc.set(id, { venda: 0, qtd: 0, prev: 0, meta: 0, metaTicket: 0, ferias: 0, folgas: 0 });
        return acc.get(id)!;
      };

      // Chaves do agrupamento
      const grupos: { id: string; nome: string }[] = porLoja
        ? filiais.map((f) => ({ id: f.id, nome: f.nome }))
        : profiles
            .filter((p) => p.filial_id === filialId)
            .map((p) => ({ id: p.id, nome: p.nome }));
      grupos.forEach((g) => getAcc(g.id));

      const chave = (vendedorId: string) =>
        porLoja ? filialDoVendedor.get(vendedorId) ?? null : vendedorId;

      (vendasRes.data ?? []).forEach((v) => {
        if (!noEscopo(v.vendedor_id)) return;
        const k = chave(v.vendedor_id);
        if (!k) return;
        const a = getAcc(k);
        a.venda += Number(v.valor || 0) - Number(v.devolucao || 0);
        a.qtd += Number(v.quantidade_vendas || 0);
      });

      (vendasPrevRes.data ?? []).forEach((v) => {
        if (!noEscopo(v.vendedor_id)) return;
        const k = chave(v.vendedor_id);
        if (!k) return;
        getAcc(k).prev += Number(v.valor || 0) - Number(v.devolucao || 0);
      });

      (metasRes.data ?? []).forEach((m) => {
        if (!noEscopo(m.vendedor_id)) return;
        const k = chave(m.vendedor_id);
        if (!k) return;
        const a = getAcc(k);
        a.meta += Number(m.valor_meta || 0);
        a.metaTicket += Number(m.meta_ticket || META_TICKET);
      });

      (feriasRes.data ?? []).forEach((f) => {
        if (!noEscopo(f.vendedor_id)) return;
        const k = chave(f.vendedor_id);
        if (!k) return;
        getAcc(k).ferias += overlapDias(ini, fim, f.data_inicio, f.data_fim);
      });

      (folgasRes.data ?? []).forEach((f) => {
        if (!noEscopo(f.vendedor_id)) return;
        const k = chave(f.vendedor_id);
        if (!k) return;
        getAcc(k).folgas += 1;
      });

      const proporcao = uteisMes > 0 ? uteisPeriodo / uteisMes : 1;

      const unidades: UnidadeResumo[] = grupos.map((g) => {
        const a = getAcc(g.id);
        const meta = a.meta * proporcao;
        const ticket = a.qtd > 0 ? a.venda / a.qtd : 0;
        return {
          nome: g.nome,
          venda: a.venda,
          meta,
          percentual: meta > 0 ? (a.venda / meta) * 100 : 0,
          crescimento: a.prev > 0 ? ((a.venda - a.prev) / a.prev) * 100 : a.venda > 0 ? 100 : 0,
          ticket,
          metaTicket: META_TICKET,
          quantidade: a.qtd,
          diasFerias: a.ferias,
          diasFolgas: a.folgas,
        };
      });

      const totalVendido = unidades.reduce((s, u) => s + u.venda, 0);
      const totalPrev = Array.from(acc.values()).reduce((s, a) => s + a.prev, 0);
      const metaPeriodo = unidades.reduce((s, u) => s + u.meta, 0);
      const totalQtd = unidades.reduce((s, u) => s + u.quantidade, 0);

      setAnalise({
        tipo,
        periodoLabel: range.label,
        periodoAnteriorLabel: range.prevLabel,
        totalVendido,
        metaPeriodo,
        percentualAtingido: metaPeriodo > 0 ? (totalVendido / metaPeriodo) * 100 : 0,
        crescimento: totalPrev > 0 ? ((totalVendido - totalPrev) / totalPrev) * 100 : totalVendido > 0 ? 100 : 0,
        ticketGeral: totalQtd > 0 ? totalVendido / totalQtd : 0,
        metaTicket: porLoja ? META_TICKET * filiais.length : META_TICKET,
        diasUteisRestantes: uteisRestantes,
        unidades: unidades.sort((a, b) => b.percentual - a.percentual),
        feriados: feriadosPeriodo,
        escopoNome,
        unidadeLabel,
      });
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar os dados do período");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, dataBase]);

  const gerarMensagem = async (destinatario?: Destinatario) => {
    if (!analise) return;
    setGerando(true);
    try {
      const { data, error } = await supabase.functions.invoke("ana-executiva", {
        body: {
          ...analise,
          metaTicket: META_TICKET,
          destinatarioNome: destinatario?.nome,
          destinatarioCargo: destinatario?.cargo,
        },
      });
      if (error) throw error;
      if (data?.error === "rate_limit") {
        toast.error("Muitas solicitações. Tente novamente em instantes.");
        return;
      }
      if (data?.error === "credits_exhausted") {
        toast.error("Créditos de IA esgotados.");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setMensagem(data.mensagem ?? "");
      toast.success("Análise da ANA gerada");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível gerar a análise");
    } finally {
      setGerando(false);
    }
  };

  const linkWhatsapp = (telefone: string) => {
    const numero = telefone.startsWith("55") ? telefone : `55${telefone}`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(mensagem);
    toast.success("Mensagem copiada");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bot}
        eyebrow="Módulo exclusivo do administrador"
        title="IA Executiva · ANA"
        description="ANA — Assistente Virtual de Gestão de Vendas. Transforma os dados do sistema em análises consultivas prontas para envio por WhatsApp a proprietários, diretores e gestores."
        actions={
          <Button variant="outline" onClick={carregarDados} disabled={carregando}>
            {carregando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar dados
          </Button>
        }
      />

      <CardSecao
        icon={CalendarDays}
        title="Período da análise"
        description="Selecione o tipo de relatório e a data de referência."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Tipo de relatório</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Diário</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de referência</Label>
            <Input type="date" value={dataBase} onChange={(e) => setDataBase(e.target.value || hoje)} />
          </div>
          <div className="space-y-2">
            <Label>Intervalo considerado</Label>
            <div className="flex h-10 items-center rounded-btn border border-white/10 px-3 text-sm text-muted-foreground">
              {range.label}
            </div>
          </div>
        </div>

        {analise && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Vendido", value: fmtBRL(analise.totalVendido) },
              { label: "Meta do período", value: fmtBRL(analise.metaPeriodo) },
              { label: "Atingimento", value: `${analise.percentualAtingido.toFixed(1)}%` },
              { label: "Ticket médio", value: fmtBRL(analise.ticketGeral) },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-card border border-white/5 p-4"
                style={{ background: "linear-gradient(135deg, hsl(0 42% 11% / 0.7), hsl(0 39% 15% / 0.5))" }}
              >
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className="mt-1 font-display text-lg font-bold text-foreground">{kpi.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardSecao>

      <CardSecao
        icon={Sparkles}
        title={`Análise da ANA · ${TIPO_LABEL[tipo]}`}
        description="Mensagem consultiva gerada com base nos dados reais do período, pronta para WhatsApp."
        actions={
          <div className="flex gap-2">
            <Button onClick={() => gerarMensagem()} disabled={gerando || carregando || !analise}>
              {gerando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Gerar análise
            </Button>
            {mensagem && (
              <Button variant="outline" onClick={copiar}>
                <Copy className="mr-2 h-4 w-4" />
                Copiar
              </Button>
            )}
          </div>
        }
      >
        {mensagem ? (
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={16}
            className="font-mono text-sm leading-relaxed"
          />
        ) : (
          <EmptyState
            icon={MessageCircle}
            title="Nenhuma análise gerada ainda"
            description="Clique em “Gerar análise” para a ANA interpretar os dados do período selecionado."
          />
        )}
      </CardSecao>

      <CardSecao
        icon={Users}
        title="Destinatários"
        description="Cadastrados na Central de Destinatários (IA Executiva → Destinatários)."
      >
        <div className="mt-6 space-y-3">
          {destinatarios.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum destinatário cadastrado"
              description="Cadastre os gestores na Central de Destinatários para gerar e enviar as análises."
            />
          ) : (
            destinatarios.map((d) => (
              <div
                key={d.id}
                className="flex flex-col gap-3 rounded-card border border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{ background: "linear-gradient(135deg, hsl(0 42% 11% / 0.6), hsl(0 39% 15% / 0.4))" }}
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {d.nome}{" "}
                    {d.cargo && <span className="text-xs font-normal text-muted-foreground">· {d.cargo}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">+{d.telefone.startsWith("55") ? d.telefone : `55${d.telefone}`}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {d.alert_types.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] capitalize">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => gerarMensagem(d)}
                    disabled={gerando || !analise}
                  >
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                    Gerar para {d.nome.split(" ")[0]}
                  </Button>
                  <Button size="sm" asChild disabled={!mensagem}>
                    <a
                      href={mensagem ? linkWhatsapp(d.telefone) : undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        if (!mensagem) {
                          e.preventDefault();
                          toast.error("Gere a análise antes de enviar");
                        }
                      }}
                    >
                      <Send className="mr-2 h-3.5 w-3.5" />
                      WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardSecao>
    </div>
  );
}
