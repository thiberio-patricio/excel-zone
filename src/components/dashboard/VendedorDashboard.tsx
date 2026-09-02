import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  TrendingUp,
  Target,
  Percent,
  RotateCcw,
  LayoutDashboard,
  Receipt,
  Gauge,
  Trophy,
  Medal,
  CalendarDays,
  CalendarOff,
} from "lucide-react";
import CalendarioVendas from "./CalendarioVendas";
import MensagemMetaBatida from "./MensagemMetaBatida";
import { fetchMetaWithFallback } from "@/utils/fetchMetaWithFallback";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { KpiCard } from "@/components/layout/KpiCard";
import { META_TICKET_DEFAULT } from "@/utils/metaResolver";
import { toLocalISO } from "@/utils/dateISO";
import { useGsapReveal } from "@/hooks/useGsapReveal";

interface VendedorDashboardProps {
  profile: {
    id: string;
    nome: string;
    email: string;
  };
}

interface Meta {
  valor_meta: number;
  meta_ticket?: number | null;
  mes: number;
  ano: number;
}

interface Venda {
  id: string;
  data: string;
  valor: number;
  devolucao: number;
  quantidade_vendas: number;
}

interface CampanhaResumo {
  id: string;
  nome: string;
  metaDiaria: number;
  pontos: number;
  diasUteis: number;
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Dias úteis (seg a sex) do mês, excluindo feriados cadastrados. */
function diasUteisDoMes(mes: number, ano: number, feriados: Set<string>): Date[] {
  const dias: Date[] = [];
  const total = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const data = new Date(ano, mes - 1, d);
    const dow = data.getDay();
    if (dow >= 1 && dow <= 5 && !feriados.has(toLocalISO(data))) dias.push(data);
  }
  return dias;
}

export default function VendedorDashboard({ profile }: VendedorDashboardProps) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [totalVendido, setTotalVendido] = useState(0);
  const [totalDevolucoes, setTotalDevolucoes] = useState(0);
  const [ticketMedio, setTicketMedio] = useState(0);
  const [folgas, setFolgas] = useState<string[]>([]);
  const [campanhas, setCampanhas] = useState<CampanhaResumo[]>([]);

  const mesAtualDate = new Date().getMonth() + 1;
  const anoAtualDate = new Date().getFullYear();

  const [mesSelecionado, setMesSelecionado] = useState(mesAtualDate);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtualDate);

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, mesSelecionado, anoSelecionado]);

  const carregarDados = async () => {
    try {
      // Meta do mês selecionado (com fallback para a meta mais recente)
      const metaData = await fetchMetaWithFallback(profile.id, mesSelecionado, anoSelecionado);
      setMeta(metaData as Meta | null);

      const primeiroDia = toLocalISO(new Date(anoSelecionado, mesSelecionado - 1, 1));
      const ultimoDia = toLocalISO(new Date(anoSelecionado, mesSelecionado, 0));

      const [{ data: vendasData, error }, { data: perfil }, { data: folgasData }] = await Promise.all([
        supabase
          .from("vendas")
          .select("*")
          .eq("vendedor_id", profile.id)
          .gte("data", primeiroDia)
          .lte("data", ultimoDia)
          .order("data", { ascending: true }),
        supabase.from("profiles").select("filial_id").eq("id", profile.id).maybeSingle(),
        supabase
          .from("folgas")
          .select("data")
          .eq("vendedor_id", profile.id)
          .gte("data", primeiroDia)
          .lte("data", ultimoDia)
          .order("data", { ascending: true }),
      ]);

      if (error) throw error;

      setFolgas(((folgasData as any[]) || []).map((f) => String(f.data)));


      const lista = (vendasData as Venda[]) || [];
      setVendas(lista);
      const total = lista.reduce((acc, v) => acc + (Number(v.valor) - Number(v.devolucao)), 0);
      const totalDev = lista.reduce((acc, v) => acc + Number(v.devolucao), 0);
      setTotalVendido(total);
      setTotalDevolucoes(totalDev);

      // Ticket médio ACUMULADO do mês: total líquido do mês ÷ quantidade total de vendas
      const qtdTotal = lista.reduce((acc, v) => acc + (Number(v.quantidade_vendas) || 0), 0);
      setTicketMedio(qtdTotal > 0 ? total / qtdTotal : 0);

      await carregarCampanhas(
        (perfil as any)?.filial_id ?? null,
        lista,
        Number(metaData?.valor_meta) || 0,
        primeiroDia,
        ultimoDia
      );
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
    }
  };

  const carregarCampanhas = async (
    filialId: string | null,
    lista: Venda[],
    metaMensal: number,
    primeiroDia: string,
    ultimoDia: string
  ) => {
    try {
      let campQuery = supabase
        .from("campanhas")
        .select("id, nome, mes, ano, filial_id, ativa")
        .eq("ativa", true)
        .eq("mes", mesSelecionado)
        .eq("ano", anoSelecionado);
      if (filialId) campQuery = campQuery.or(`filial_id.is.null,filial_id.eq.${filialId}`);
      else campQuery = campQuery.is("filial_id", null);

      let feriadosQuery = supabase
        .from("feriados")
        .select("data, filial_id")
        .gte("data", primeiroDia)
        .lte("data", ultimoDia);
      if (filialId) feriadosQuery = feriadosQuery.or(`filial_id.is.null,filial_id.eq.${filialId}`);
      else feriadosQuery = feriadosQuery.is("filial_id", null);

      const [{ data: camps }, { data: feriadosRows }] = await Promise.all([
        campQuery,
        feriadosQuery,
      ]);

      const feriados = new Set<string>(((feriadosRows as any[]) || []).map((f) => String(f.data)));
      const dias = diasUteisDoMes(mesSelecionado, anoSelecionado, feriados);
      const metaDiaria = dias.length > 0 ? metaMensal / dias.length : 0;

      // Vendas líquidas por dia
      const porDia = new Map<string, number>();
      for (const v of lista) {
        const liquido = (Number(v.valor) || 0) - (Number(v.devolucao) || 0);
        porDia.set(v.data, (porDia.get(v.data) ?? 0) + liquido);
      }

      let pontos = 0;
      for (const d of dias) {
        const valor = porDia.get(toLocalISO(d)) ?? 0;
        if (metaDiaria > 0 && valor >= metaDiaria) pontos += 1;
      }

      setCampanhas(
        ((camps as any[]) || []).map((c) => ({
          id: c.id,
          nome: c.nome,
          metaDiaria,
          pontos,
          diasUteis: dias.length,
        }))
      );
    } catch (e) {
      console.error(e);
      setCampanhas([]);
    }
  };

  const percentualMeta = meta ? (totalVendido / Number(meta.valor_meta)) * 100 : 0;
  const metaTicket = Number(meta?.meta_ticket) || META_TICKET_DEFAULT;
  const percentualTicket = metaTicket > 0 ? (ticketMedio / metaTicket) * 100 : 0;

  const campanhaResumo = useMemo(() => {
    if (campanhas.length === 0) return null;
    const pontos = campanhas.reduce((acc, c) => acc + c.pontos, 0);
    return {
      quantidade: campanhas.length,
      metaDiaria: campanhas[0].metaDiaria,
      diasUteis: campanhas[0].diasUteis,
      pontos,
      pontosPossiveis: campanhas.length * campanhas[0].diasUteis,
      nomes: campanhas.map((c) => c.nome).join(" · "),
    };
  }, [campanhas]);

  const kpisRef = useGsapReveal<HTMLDivElement>({ y: 18, duration: 0.55, stagger: 0.06 }, [
    mesSelecionado,
    anoSelecionado,
    campanhas.length,
  ]);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const anos = [];
  for (let ano = anoAtualDate; ano >= anoAtualDate - 5; ano--) {
    anos.push(ano);
  }

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Meu Espaço"
        title={`Olá, ${profile.nome.split(" ")[0]}`}
        description="Acompanhe suas vendas, meta, ticket médio e campanhas do mês."
      />

      <div className="space-y-6">
        <MensagemMetaBatida vendedorId={profile.id} />

        {/* Seletor de Mês/Ano */}
        <PageCard>
          <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
            <CalendarDays className="h-5 w-5 text-primary" /> Selecionar Período
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Select
                value={mesSelecionado.toString()}
                onValueChange={(value) => setMesSelecionado(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select
                value={anoSelecionado.toString()}
                onValueChange={(value) => setAnoSelecionado(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PageCard>

        {/* KPIs */}
        <div
          ref={kpisRef}
          className="grid items-stretch gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <KpiCard
            icon={TrendingUp}
            label="Total Vendido"
            value={brl(totalVendido)}
            hint="Vendas líquidas (já sem devoluções)"
            tone="positive"
          />

          <KpiCard
            icon={RotateCcw}
            label="Total Devoluções"
            value={brl(totalDevolucoes)}
            hint="Valor devolvido no período"
            tone="negative"
          />

          <KpiCard
            icon={Target}
            label="Meta do Mês"
            value={brl(Number(meta?.valor_meta) || 0)}
            hint={`Faltam ${brl(Math.max((Number(meta?.valor_meta) || 0) - totalVendido, 0))}`}
          />

          <KpiCard
            icon={Percent}
            label="Progresso da Meta"
            value={`${percentualMeta.toFixed(1)}%`}
            progress={percentualMeta}
            hint={percentualMeta >= 100 ? "Meta batida! Parabéns 🎉" : "Evolução da meta mensal"}
            tone={percentualMeta >= 100 ? "positive" : "warn"}
          />

          <KpiCard
            icon={Receipt}
            label="Ticket Médio do Mês"
            value={brl(ticketMedio)}
            hint="Acumulado do mês: vendas líquidas ÷ quantidade total de vendas"
            tone="positive"
          />

          <KpiCard
            icon={Gauge}
            label="Meta Ticket Médio"
            value={brl(metaTicket)}
            progress={percentualTicket}
            hint={`${percentualTicket.toFixed(1)}% da meta de ticket`}
            tone={percentualTicket >= 100 ? "positive" : "warn"}
          />

          <KpiCard
            icon={Trophy}
            label="Meta de Campanha (dia)"
            value={campanhaResumo ? brl(campanhaResumo.metaDiaria) : "—"}
            hint={
              campanhaResumo
                ? `${campanhaResumo.quantidade} campanha(s) ativa(s) · ${campanhaResumo.diasUteis} dias úteis`
                : "Nenhuma campanha ativa neste mês"
            }
            tone="premium"
          />

          <KpiCard
            icon={Medal}
            label="Pontuação de Campanhas"
            value={campanhaResumo ? `${campanhaResumo.pontos} pts` : "—"}
            progress={
              campanhaResumo && campanhaResumo.pontosPossiveis > 0
                ? (campanhaResumo.pontos / campanhaResumo.pontosPossiveis) * 100
                : undefined
            }
            hint={
              campanhaResumo
                ? `De ${campanhaResumo.pontosPossiveis} pontos possíveis · ${campanhaResumo.nomes}`
                : "Pontos são somados a cada dia com a meta diária batida"
            }
            tone="premium"
          />

          <KpiCard
            icon={CalendarOff}
            label="Minhas Folgas"
            value={folgasInfo.valor}
            hint={folgasInfo.hint}
            tone={folgas.length > 0 ? "warn" : "default"}
          />
        </div>


        <CalendarioVendas
          vendedorId={profile.id}
          isReadOnly={true}
          mes={mesSelecionado}
          ano={anoSelecionado}
        />
      </div>
    </div>
  );
}
