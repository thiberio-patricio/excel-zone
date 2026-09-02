import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Trophy,
  Plus,
  Target,
  CalendarDays,
  ArrowLeft,
  Medal,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { ProfilePhoto } from "@/components/ui/profile-photo";
import { criarMetaResolver } from "@/utils/metaResolver";
import { toLocalISO } from "@/utils/dateISO";

type Role = "vendedor" | "gerente" | "diretor" | "admin";

interface CampanhasProps {
  role: Role;
  profile: { id: string; nome: string; filial_id?: string | null };
}

interface Campanha {
  id: string;
  nome: string;
  tipo: string;
  mes: number;
  ano: number;
  filial_id: string | null;
  descricao: string | null;
  ativa: boolean;
  criterios?: string[] | null;
  referencias?: string[] | null;
  data_inicio?: string | null;
  data_fim?: string | null;
}


interface Filial {
  id: string;
  nome: string;
}

interface RankingItem {
  vendedorId: string;
  nome: string;
  fotoUrl: string | null;
  filialId: string | null;
  filialNome: string;
  metaDiaria: number;
  pontos: number;
  totalVendido: number;
  /** Feriados aplicáveis à filial do vendedor (nacionais + da filial). */
  feriados: string[];
  diasPorData: Record<string, { valor: number; batida: boolean }>;
}


const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Dias úteis (segunda a sexta) do mês, excluindo feriados cadastrados. */
function diasUteisDoMes(mes: number, ano: number, feriados: Set<string> = new Set()): Date[] {
  const dias: Date[] = [];
  const total = new Date(ano, mes, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const data = new Date(ano, mes - 1, d);
    const dow = data.getDay();
    if (dow >= 1 && dow <= 5 && !feriados.has(toLocalISO(data))) dias.push(data);
  }
  return dias;
}

export default function Campanhas({ role, profile }: CampanhasProps) {
  const isDiretor = role === "diretor" || role === "admin";
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [somenteAtivas, setSomenteAtivas] = useState(true);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionada, setSelecionada] = useState<Campanha | null>(null);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [carregandoRanking, setCarregandoRanking] = useState(false);
  const [vendedorAberto, setVendedorAberto] = useState<string | null>(null);
  const [feriadosCampanha, setFeriadosCampanha] = useState<Set<string>>(new Set());

  const hoje = new Date();
  const [dialogAberto, setDialogAberto] = useState(false);
  const [dialogCustomAberto, setDialogCustomAberto] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    mes: hoje.getMonth() + 1,
    ano: hoje.getFullYear(),
    filial_id: "todas",
    descricao: "",
  });
  const [formCustom, setFormCustom] = useState({
    nome: "",
    criterios: [] as string[],
    referencias: [""],
    data_inicio: toLocalISO(hoje),
    data_fim: toLocalISO(hoje),
    filial_id: "todas",
    descricao: "",
  });
  const [salvando, setSalvando] = useState(false);


  const anos = useMemo(() => {
    const base = hoje.getFullYear();
    return [base + 1, base, base - 1, base - 2];
  }, []);

  const campanhasVisiveis = useMemo(
    () => (somenteAtivas ? campanhas.filter((c) => c.ativa) : campanhas),
    [campanhas, somenteAtivas]
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: camps, error: errCamps }, { data: fils }] = await Promise.all([
        supabase
          .from("campanhas")
          .select("*")
          .order("ano", { ascending: false })
          .order("mes", { ascending: false }),
        supabase.from("filiais").select("id, nome").order("nome"),
      ]);
      if (errCamps) throw errCamps;
      setCampanhas((camps as Campanha[]) || []);
      setFiliais((fils as Filial[]) || []);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const criarCampanha = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da campanha");
      return;
    }
    setSalvando(true);
    try {
      const { error } = await supabase.from("campanhas").insert({
        nome: form.nome.trim(),
        tipo: "meta_fixa",
        mes: form.mes,
        ano: form.ano,
        filial_id: form.filial_id === "todas" ? null : form.filial_id,
        descricao: form.descricao.trim() || null,
        created_by: profile.id,
      });
      if (error) throw error;
      toast.success("Campanha cadastrada!");
      setDialogAberto(false);
      setForm({
        nome: "",
        mes: hoje.getMonth() + 1,
        ano: hoje.getFullYear(),
        filial_id: "todas",
        descricao: "",
      });
      carregar();
    } catch (e: any) {
      console.error(e);
      toast.error("Não foi possível cadastrar a campanha");
    } finally {
      setSalvando(false);
    }
  };

  const criarCampanhaCustom = async () => {
    const referencias = formCustom.referencias.map((r) => r.trim()).filter(Boolean);
    if (!formCustom.nome.trim()) {
      toast.error("Informe o nome da campanha");
      return;
    }
    if (formCustom.criterios.length === 0) {
      toast.error("Selecione pelo menos um critério (Quantidade ou Valores)");
      return;
    }
    if (!formCustom.data_inicio || !formCustom.data_fim) {
      toast.error("Informe a data de início e a data final");
      return;
    }
    if (formCustom.data_fim < formCustom.data_inicio) {
      toast.error("A data final deve ser igual ou posterior à data de início");
      return;
    }
    setSalvando(true);
    try {
      const inicio = new Date(`${formCustom.data_inicio}T00:00:00`);
      const { error } = await supabase.from("campanhas").insert({
        nome: formCustom.nome.trim(),
        tipo: "personalizada",
        mes: inicio.getMonth() + 1,
        ano: inicio.getFullYear(),
        filial_id: formCustom.filial_id === "todas" ? null : formCustom.filial_id,
        descricao: formCustom.descricao.trim() || null,
        criterios: formCustom.criterios,
        referencias,
        data_inicio: formCustom.data_inicio,
        data_fim: formCustom.data_fim,
        created_by: profile.id,
      });
      if (error) throw error;
      toast.success("Campanha cadastrada!");
      setDialogCustomAberto(false);
      setFormCustom({
        nome: "",
        criterios: [],
        referencias: [""],
        data_inicio: toLocalISO(hoje),
        data_fim: toLocalISO(hoje),
        filial_id: "todas",
        descricao: "",
      });
      carregar();
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível cadastrar a campanha");
    } finally {
      setSalvando(false);
    }
  };

  const alternarCriterio = (criterio: string, marcado: boolean) =>
    setFormCustom((prev) => ({
      ...prev,
      criterios: marcado
        ? [...prev.criterios, criterio]
        : prev.criterios.filter((c) => c !== criterio),
    }));



  const alternarAtiva = async (campanha: Campanha, ativa: boolean) => {
    setCampanhas((prev) => prev.map((c) => (c.id === campanha.id ? { ...c, ativa } : c)));
    const { error } = await supabase.from("campanhas").update({ ativa }).eq("id", campanha.id);
    if (error) {
      setCampanhas((prev) =>
        prev.map((c) => (c.id === campanha.id ? { ...c, ativa: campanha.ativa } : c))
      );
      toast.error("Não foi possível atualizar o status da campanha");
      return;
    }
    toast.success(ativa ? "Campanha ativada" : "Campanha desativada");
  };

  const excluirCampanha = async (id: string) => {
    try {
      const { error } = await supabase.from("campanhas").delete().eq("id", id);
      if (error) throw error;
      toast.success("Campanha excluída");
      setSelecionada(null);
      carregar();
    } catch {
      toast.error("Não foi possível excluir a campanha");
    }
  };

  /** Calcula ranking e calendário de cada vendedor no escopo da campanha. */
  const carregarRanking = useCallback(
    async (campanha: Campanha) => {
      setCarregandoRanking(true);
      try {
        // Escopo: gerente sempre restrito à sua filial
        const filialEscopo = role === "gerente" ? profile.filial_id ?? null : campanha.filial_id;

        let profQuery = supabase.from("profiles").select("id, nome, foto_url, filial_id").eq("ativo", true);
        if (filialEscopo) profQuery = profQuery.eq("filial_id", filialEscopo);
        const { data: profs, error: errProf } = await profQuery;
        if (errProf) throw errProf;

        const ids = (profs || []).map((p: any) => p.id);
        if (ids.length === 0) {
          setRanking([]);
          return;
        }

        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "vendedor")
          .in("user_id", ids);
        const vendedorIds = new Set((roles || []).map((r: any) => r.user_id));
        const vendedores = (profs || []).filter((p: any) => vendedorIds.has(p.id));
        if (vendedores.length === 0) {
          setRanking([]);
          return;
        }

        const listaIds = vendedores.map((v: any) => v.id);
        const primeiro = toLocalISO(new Date(campanha.ano, campanha.mes - 1, 1));
        const ultimo = toLocalISO(new Date(campanha.ano, campanha.mes, 0));

        // Feriados: nacionais/gerais (filial_id nulo) + os de cada filial no escopo.
        // Importante: os dias úteis são calculados por filial do vendedor, para que
        // gerente e diretor cheguem exatamente aos mesmos valores.
        let feriadosQuery = supabase
          .from("feriados")
          .select("data, filial_id")
          .gte("data", primeiro)
          .lte("data", ultimo);
        if (filialEscopo) {
          feriadosQuery = feriadosQuery.or(`filial_id.is.null,filial_id.eq.${filialEscopo}`);
        }
        const { data: feriadosRows } = await feriadosQuery;
        const feriadosGerais = new Set<string>(
          ((feriadosRows as any[]) || [])
            .filter((f) => !f.filial_id)
            .map((f) => String(f.data))
        );
        const feriadosPorFilial = new Map<string, Set<string>>();
        for (const f of ((feriadosRows as any[]) || []).filter((r) => r.filial_id)) {
          const set = feriadosPorFilial.get(String(f.filial_id)) ?? new Set<string>();
          set.add(String(f.data));
          feriadosPorFilial.set(String(f.filial_id), set);
        }

        const feriadosDaFilial = (fid: string | null) => {
          const set = new Set<string>(feriadosGerais);
          if (fid) for (const d of feriadosPorFilial.get(fid) ?? []) set.add(d);
          return set;
        };

        setFeriadosCampanha(feriadosDaFilial(filialEscopo));

        const diasCache = new Map<string, Date[]>();
        const diasDaFilial = (fid: string | null) => {
          const chave = fid ?? "__geral__";
          const cache = diasCache.get(chave);
          if (cache) return cache;
          const dias = diasUteisDoMes(campanha.mes, campanha.ano, feriadosDaFilial(fid));
          diasCache.set(chave, dias);
          return dias;
        };

        const [{ data: metasRows }, { data: vendasRows }] = await Promise.all([
          supabase
            .from("metas")
            .select("vendedor_id, mes, ano, valor_meta, meta_ticket")
            .in("vendedor_id", listaIds),
          supabase
            .from("vendas")
            .select("vendedor_id, data, valor, devolucao")
            .in("vendedor_id", listaIds)
            .gte("data", primeiro)
            .lte("data", ultimo),
        ]);

        const resolver = criarMetaResolver((metasRows as any[]) || []);
        const filialNome = new Map(filiais.map((f) => [f.id, f.nome]));

        const porVendedor = new Map<string, Record<string, number>>();
        for (const v of (vendasRows as any[]) || []) {
          const mapa = porVendedor.get(v.vendedor_id) ?? {};
          const liquido = (Number(v.valor) || 0) - (Number(v.devolucao) || 0);
          mapa[v.data] = (mapa[v.data] ?? 0) + liquido;
          porVendedor.set(v.vendedor_id, mapa);
        }

        const itens: RankingItem[] = vendedores.map((v: any) => {
          const filialId = (v.filial_id as string | null) ?? null;
          const dias = diasDaFilial(filialId);
          const meta = resolver.resolver(v.id, campanha.mes, campanha.ano);
          const metaMensal = meta?.valorMeta ?? 0;
          const metaDiaria = dias.length > 0 ? metaMensal / dias.length : 0;
          const vendasDia = porVendedor.get(v.id) ?? {};

          const diasPorData: RankingItem["diasPorData"] = {};
          let pontos = 0;
          let totalVendido = 0;
          for (const d of dias) {
            const iso = toLocalISO(d);
            const valor = vendasDia[iso] ?? 0;
            const batida = metaDiaria > 0 && valor >= metaDiaria;
            if (batida) pontos += 1;
            totalVendido += valor;
            diasPorData[iso] = { valor, batida };
          }

          return {
            vendedorId: v.id,
            nome: v.nome,
            fotoUrl: v.foto_url,
            filialId,
            filialNome: filialId ? filialNome.get(filialId) ?? "—" : "—",
            metaDiaria,
            pontos,
            totalVendido,
            feriados: [...feriadosDaFilial(filialId)],
            diasPorData,
          };
        });


        itens.sort((a, b) => b.pontos - a.pontos || b.totalVendido - a.totalVendido);
        setRanking(itens);
      } catch (e) {
        console.error(e);
        toast.error("Erro ao calcular o ranking da campanha");
      } finally {
        setCarregandoRanking(false);
      }
    },
    [filiais, profile.filial_id, role]
  );

  useEffect(() => {
    if (selecionada) {
      setVendedorAberto(null);
      carregarRanking(selecionada);
    }
  }, [selecionada, carregarRanking]);

  // ---------- Detalhe da campanha ----------
  if (selecionada) {
    const dias = diasUteisDoMes(selecionada.mes, selecionada.ano, feriadosCampanha);
    const vendedor = ranking.find((r) => r.vendedorId === vendedorAberto) ?? null;

    return (
      <div className="space-y-6">
        <PageHeader
          icon={Trophy}
          eyebrow="Campanhas"
          title={selecionada.nome}
          description={`Meta Fixa · ${MESES[selecionada.mes - 1]}/${selecionada.ano} · ${dias.length} dias úteis (seg a sex, sem feriados)${
            feriadosCampanha.size > 0 ? ` · ${feriadosCampanha.size} feriado(s) excluído(s)` : ""
          } · ${selecionada.ativa ? "Ativa" : "Desativada"}`}
          actions={
            <Button variant="outline" size="sm" onClick={() => setSelecionada(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          }
        />

        {carregandoRanking ? (
          <PageCard>
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculando ranking...
            </div>
          </PageCard>
        ) : ranking.length === 0 ? (
          <PageCard>
            <EmptyState
              icon={Target}
              title="Nenhum vendedor no escopo"
              description="Cadastre vendedores e metas para acompanhar esta campanha."
            />
          </PageCard>
        ) : (
          <>
            <PageCard>
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
                <Medal className="h-5 w-5 text-primary" /> Ranking de vendedores
              </h2>
              <div className="space-y-2">
                {ranking.map((r, i) => (
                  <button
                    key={r.vendedorId}
                    onClick={() =>
                      setVendedorAberto(vendedorAberto === r.vendedorId ? null : r.vendedorId)
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                      vendedorAberto === r.vendedorId
                        ? "border-primary/50 bg-primary/10"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <span className="w-8 text-center font-display text-lg font-bold text-primary">
                      {i + 1}º
                    </span>
                    <ProfilePhoto url={r.fotoUrl} alt={r.nome} className="h-9 w-9 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{r.nome}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.filialNome} · Meta diária {brl(r.metaDiaria)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-lg font-bold text-foreground">
                        {r.pontos} <span className="text-xs font-normal text-muted-foreground">pts</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{brl(r.totalVendido)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </PageCard>

            {vendedor && (
              <PageCard>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                    <CalendarDays className="h-5 w-5 text-primary" /> Calendário · {vendedor.nome}
                  </h2>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-success" /> Meta batida
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded bg-destructive" /> Meta não batida
                    </span>
                  </div>
                </div>

                <div className="mb-3 text-sm text-muted-foreground">
                  Meta fixa diária: <span className="font-semibold text-foreground">{brl(vendedor.metaDiaria)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {dias.map((d) => {
                    const iso = toLocalISO(d);
                    const info = vendedor.diasPorData[iso];
                    const batida = info?.batida;
                    return (
                      <div
                        key={iso}
                        className={`rounded-xl border p-3 ${
                          batida
                            ? "border-success/40 bg-success/15"
                            : "border-destructive/40 bg-destructive/15"
                        }`}
                      >
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {d.toLocaleDateString("pt-BR", { weekday: "short" })} {d.getDate()}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-foreground">
                          {brl(info?.valor ?? 0)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {batida ? "+1 ponto" : "sem ponto"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PageCard>
            )}
          </>
        )}
      </div>
    );
  }

  // ---------- Lista de campanhas ----------
  return (
    <div className="space-y-6">
      <PageHeader
        icon={Trophy}
        eyebrow="Engajamento"
        title="Campanhas"
        description="Campanhas de performance com ranking e pontuação por dia útil."
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={somenteAtivas}
                onCheckedChange={setSomenteAtivas}
                aria-label="Mostrar somente campanhas ativas"
              />
              Somente ativas
            </label>
            {isDiretor && (
              <>
                <Button variant="outline" onClick={() => setDialogAberto(true)}>
                  <Target className="mr-2 h-4 w-4" /> Meta Fixa
                </Button>
                <Button onClick={() => setDialogCustomAberto(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Cadastrar Campanha
                </Button>
              </>
            )}

          </div>
        }
      />

      <PageCard>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : campanhasVisiveis.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title={
              somenteAtivas && campanhas.length > 0
                ? "Nenhuma campanha ativa"
                : "Nenhuma campanha cadastrada"
            }
            description={
              somenteAtivas && campanhas.length > 0
                ? "Ative uma campanha para acompanhar o ranking diário dela."
                : isDiretor
                ? "Cadastre a primeira campanha Meta Fixa para engajar a equipe."
                : "Assim que a diretoria criar campanhas, elas aparecerão aqui."
            }
            action={
              isDiretor && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={() => setDialogAberto(true)}>
                    <Target className="mr-2 h-4 w-4" /> Meta Fixa
                  </Button>
                  <Button onClick={() => setDialogCustomAberto(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Cadastrar Campanha
                  </Button>
                </div>
              )
            }

          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {campanhasVisiveis.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.05]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setSelecionada(c)}>
                    <div className="flex items-center gap-2">
                      <span className="truncate font-display text-base font-semibold text-foreground">
                        {c.nome}
                      </span>
                      <Badge variant="secondary">
                        {c.tipo === "personalizada" ? "Campanha" : "Meta Fixa"}
                      </Badge>
                      <Badge variant={c.ativa ? "default" : "outline"}>
                        {c.ativa ? "Ativa" : "Desativada"}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.tipo === "personalizada" && c.data_inicio && c.data_fim
                        ? `${c.data_inicio.split("-").reverse().join("/")} a ${c.data_fim
                            .split("-")
                            .reverse()
                            .join("/")}`
                        : `${MESES[c.mes - 1]}/${c.ano}`}{" "}
                      ·{" "}
                      {c.filial_id
                        ? filiais.find((f) => f.id === c.filial_id)?.nome ?? "Filial"
                        : "Toda a rede"}
                    </div>
                    {c.tipo === "personalizada" && (c.criterios?.length || c.referencias?.length) ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(c.criterios ?? []).map((cr) => (
                          <Badge key={cr} variant="outline" className="text-[10px] capitalize">
                            {cr}
                          </Badge>
                        ))}
                        {(c.referencias ?? []).map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            Ref: {r}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {c.descricao && (
                      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.descricao}</p>
                    )}

                  </button>
                  {isDiretor && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => excluirCampanha(c.id)}
                      aria-label="Excluir campanha"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <Button variant="outline" size="sm" onClick={() => setSelecionada(c)}>
                    Ver ranking
                  </Button>
                  {isDiretor && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={c.ativa}
                        onCheckedChange={(v) => alternarAtiva(c, v)}
                        aria-label="Manter campanha ativa"
                      />
                      Manter ativa
                    </label>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Campanha</DialogTitle>
            <DialogDescription>
              Meta Fixa: a meta mensal de cada vendedor é dividida pelos dias úteis (seg a sex) do mês.
              Cada dia com a meta batida vale 1 ponto no ranking.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da campanha</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Meta Fixa Agosto"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input value="Meta Fixa" disabled />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Mês</Label>
                <Select
                  value={String(form.mes)}
                  onValueChange={(v) => setForm({ ...form, mes: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MESES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select
                  value={String(form.ano)}
                  onValueChange={(v) => setForm({ ...form, ano: Number(v) })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anos.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select
                value={form.filial_id}
                onValueChange={(v) => setForm({ ...form, filial_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Toda a rede</SelectItem>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Premiação, regras extras..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={criarCampanha} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogCustomAberto} onOpenChange={setDialogCustomAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Campanha</DialogTitle>
            <DialogDescription>
              Defina critérios de apuração, referências de fábrica e o período da campanha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da campanha</Label>
              <Input
                value={formCustom.nome}
                onChange={(e) => setFormCustom({ ...formCustom, nome: e.target.value })}
                placeholder="Ex: Campanha Verão"
              />
            </div>

            <div className="space-y-2">
              <Label>Critérios de apuração</Label>
              <div className="flex flex-wrap gap-4">
                {["Quantidade", "Valores"].map((c) => (
                  <label key={c} className="flex items-center gap-2 text-sm text-foreground">
                    <Checkbox
                      checked={formCustom.criterios.includes(c)}
                      onCheckedChange={(v) => alternarCriterio(c, v === true)}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Referências de fábrica</Label>
              {formCustom.referencias.map((ref, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={ref}
                    onChange={(e) =>
                      setFormCustom((prev) => ({
                        ...prev,
                        referencias: prev.referencias.map((r, idx) =>
                          idx === i ? e.target.value : r
                        ),
                      }))
                    }
                    placeholder={`Referência ${i + 1}`}
                  />
                  {formCustom.referencias.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover referência"
                      onClick={() =>
                        setFormCustom((prev) => ({
                          ...prev,
                          referencias: prev.referencias.filter((_, idx) => idx !== i),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormCustom((prev) => ({ ...prev, referencias: [...prev.referencias, ""] }))
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Adicionar referência
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={formCustom.data_inicio}
                  onChange={(e) => setFormCustom({ ...formCustom, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data final</Label>
                <Input
                  type="date"
                  value={formCustom.data_fim}
                  onChange={(e) => setFormCustom({ ...formCustom, data_fim: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Escopo</Label>
              <Select
                value={formCustom.filial_id}
                onValueChange={(v) => setFormCustom({ ...formCustom, filial_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Toda a rede</SelectItem>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formCustom.descricao}
                onChange={(e) => setFormCustom({ ...formCustom, descricao: e.target.value })}
                placeholder="Premiação, regras extras..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogCustomAberto(false)}>Cancelar</Button>
            <Button onClick={criarCampanhaCustom} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
