import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Users, TrendingUp, Target, ArrowLeft, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { useChartColors, ChartThemePicker } from "@/hooks/useChartColors";
import { fetchMetaWithFallback } from "@/utils/fetchMetaWithFallback";

interface VendasFilial {
  filialId: string;
  nome: string;
  total: number;
  meta: number;
}

interface VendasVendedor {
  nome: string;
  total: number;
  meta: number;
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function VisaoGeral() {
  const { theme: chartTheme, themeId: chartThemeId, setThemeId: setChartThemeId } = useChartColors();
  const now = new Date();
  const [mesSelecionado, setMesSelecionado] = useState<number>(now.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState<number>(now.getFullYear());
  const [stats, setStats] = useState({
    totalFiliais: 0,
    totalGerentes: 0,
    totalVendedores: 0,
    vendasMesAtual: 0,
    metaGeral: 0
  });
  const [vendasPorFilial, setVendasPorFilial] = useState<VendasFilial[]>([]);
  const [filialSelecionada, setFilialSelecionada] = useState<{ id: string; nome: string } | null>(null);
  const [vendasPorVendedor, setVendasPorVendedor] = useState<VendasVendedor[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);

  useEffect(() => {
    carregarEstatisticas();
    if (filialSelecionada) {
      carregarVendedoresDaFilial(filialSelecionada.id, filialSelecionada.nome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesSelecionado, anoSelecionado]);

  const anosDisponiveis = (() => {
    const anoAtual = now.getFullYear();
    const anos: number[] = [];
    for (let a = anoAtual - 5; a <= anoAtual + 1; a++) anos.push(a);
    return anos;
  })();

  const carregarEstatisticas = async () => {
    try {
      const mes = mesSelecionado;
      const ano = anoSelecionado;
      const primeiroDia = new Date(ano, mes - 1, 1).toISOString().split("T")[0];
      const ultimoDiaDate = new Date(ano, mes, 0);
      const ultimoDia = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDiaDate.getDate()).padStart(2, "0")}`;

      const [filiaisRes, gerentesRes, vendedoresRes, vendasRes, metasRes, profilesRes] = await Promise.all([
        supabase.from("filiais").select("id, nome"),
        supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "gerente"),
        supabase
          .from("user_roles")
          .select("id", { count: "exact", head: true })
          .eq("role", "vendedor"),
        supabase
          .from("vendas")
          .select(`
            valor, 
            devolucao,
            vendedor:vendedor_id (
              filial_id,
              filiais:filial_id (
                nome
              )
            )
          `)
          .gte("data", primeiroDia)
          .lte("data", ultimoDia),
        supabase
          .from("metas")
          .select("vendedor_id, valor_meta, mes, ano")
          .or(`ano.lt.${ano},and(ano.eq.${ano},mes.lte.${mes})`),
        supabase
          .from("profiles")
          .select("id, filial_id"),
      ]);

      const vendasTotal = vendasRes.data?.reduce(
        (acc, v) => acc + (Number(v.valor) - Number(v.devolucao)),
        0
      ) || 0;

      const vendedorFilialMap = new Map<string, string | null>();
      (profilesRes.data || []).forEach((p: any) => {
        vendedorFilialMap.set(p.id, p.filial_id);
      });

      const filialNomeMap = new Map<string, string>();
      (filiaisRes.data || []).forEach((f: any) => {
        filialNomeMap.set(f.id, f.nome);
      });

      const filialAggMap = new Map<string, { filialId: string; nome: string; total: number; meta: number }>();
      (filiaisRes.data || []).forEach((f: any) => {
        filialAggMap.set(f.id, { filialId: f.id, nome: f.nome, total: 0, meta: 0 });
      });
      vendasRes.data?.forEach((venda: any) => {
        if (!venda.vendedor?.filial_id) return;
        const filialId = venda.vendedor?.filial_id || "sem-filial";
        const nome = venda.vendedor?.filiais?.nome || filialNomeMap.get(filialId) || "Sem Filial";
        const valor = Number(venda.valor) - Number(venda.devolucao);
        const cur = filialAggMap.get(filialId) || { filialId, nome, total: 0, meta: 0 };
        cur.total += valor;
        cur.nome = nome;
        filialAggMap.set(filialId, cur);
      });

      const metaMaisRecentePorVendedor = new Map<string, { valor_meta: number; rank: number }>();
      (metasRes.data || []).forEach((m: any) => {
        const rank = Number(m.ano) * 12 + Number(m.mes);
        const atual = metaMaisRecentePorVendedor.get(m.vendedor_id);
        if (!atual || rank > atual.rank) {
          metaMaisRecentePorVendedor.set(m.vendedor_id, { valor_meta: Number(m.valor_meta), rank });
        }
      });

      metaMaisRecentePorVendedor.forEach((m, vendedorId) => {
        const filialId = vendedorFilialMap.get(vendedorId);
        if (!filialId) return;
        const cur = filialAggMap.get(filialId) || { filialId, nome: filialNomeMap.get(filialId) || "", total: 0, meta: 0 };
        cur.meta += m.valor_meta;
        filialAggMap.set(filialId, cur);
      });

      const vendasFilialArray = Array.from(filialAggMap.values())
        .map((f) => ({ ...f, percentual: f.meta > 0 ? Math.round((f.total / f.meta) * 100) : 0 }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      const metaGeralTotal = Array.from(filialAggMap.values()).reduce((acc, f) => acc + f.meta, 0);

      setStats({
        totalFiliais: filiaisRes.data?.length || 0,
        totalGerentes: gerentesRes.count || 0,
        totalVendedores: vendedoresRes.count || 0,
        vendasMesAtual: vendasTotal,
        metaGeral: metaGeralTotal
      });
      
      setVendasPorFilial(vendasFilialArray);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const carregarVendedoresDaFilial = async (filialId: string, filialNome: string) => {
    setLoadingVendedores(true);
    setFilialSelecionada({ id: filialId, nome: filialNome });
    try {
      const mes = mesSelecionado;
      const ano = anoSelecionado;
      const primeiroDia = new Date(ano, mes - 1, 1).toISOString().split("T")[0];
      const ultimoDiaDate = new Date(ano, mes, 0);
      const ultimoDia = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDiaDate.getDate()).padStart(2, "0")}`;

      // Vendedores da filial
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .eq("filial_id", filialId);

      const vendedorIds = (profiles || []).map((p) => p.id);
      if (vendedorIds.length === 0) {
        setVendasPorVendedor([]);
        return;
      }

      // Filtrar apenas vendedores (não gerentes)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor")
        .in("user_id", vendedorIds);
      const vendedorOnlyIds = new Set((roles || []).map((r: any) => r.user_id));
      const vendedoresProfiles = (profiles || []).filter((p) => vendedorOnlyIds.has(p.id));

      const result = await Promise.all(
        vendedoresProfiles.map(async (v) => {
          const { data: vendas } = await supabase
            .from("vendas")
            .select("valor, devolucao")
            .eq("vendedor_id", v.id)
            .gte("data", primeiroDia)
            .lte("data", ultimoDia);
          const total = (vendas || []).reduce(
            (acc, x: any) => acc + (Number(x.valor) - Number(x.devolucao)),
            0
          );
          const meta = await fetchMetaWithFallback(v.id, mes, ano);
          return {
            nome: v.nome,
            total,
            meta: Number(meta?.valor_meta) || 0,
          };
        })
      );

      setVendasPorVendedor(result.sort((a, b) => a.nome.localeCompare(b.nome)));
    } catch (error) {
      console.error("Erro ao carregar vendedores da filial:", error);
      setVendasPorVendedor([]);
    } finally {
      setLoadingVendedores(false);
    }
  };

  const voltarParaFiliais = () => {
    setFilialSelecionada(null);
    setVendasPorVendedor([]);
  };

  const chartConfig = {
    meta: {
      label: "Meta",
      color: chartTheme.meta,
    },
    total: {
      label: "Vendido",
      color: chartTheme.vendido,
    },
  };

  const labelPeriodo = `${MESES[mesSelecionado - 1]}/${anoSelecionado}`;

  return (
    <div className="space-y-6">
      {/* Seletor de período */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Período:</span>
          <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESES.map((nome, idx) => (
                <SelectItem key={idx + 1} value={String(idx + 1)}>{nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
            <SelectTrigger className="w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anosDisponiveis.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Filiais</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFiliais}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGerentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVendedores}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas {labelPeriodo}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.vendasMesAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Geral</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.metaGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {filialSelecionada ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={voltarParaFiliais}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar para Filiais
              </Button>
              <CardTitle>Meta vs Vendido — {filialSelecionada.nome} ({labelPeriodo})</CardTitle>
            </div>
            <ChartThemePicker themeId={chartThemeId} onChange={setChartThemeId} />
          </CardHeader>
          <CardContent>
            {loadingVendedores ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : vendasPorVendedor.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum vendedor encontrado nesta filial.
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendasPorVendedor}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="nome"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                      angle={-25}
                      textAnchor="end"
                      height={70}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) =>
                            `${name === 'meta' ? 'Meta' : 'Vendido'}: R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          }
                        />
                      }
                    />
                    <Legend formatter={(value) => (value === "meta" ? "Meta" : "Vendido")} />
                    <Bar dataKey="meta" fill={chartTheme.meta} radius={[8, 8, 0, 0]} name="meta" />
                    <Bar dataKey="total" fill={chartTheme.vendido} radius={[8, 8, 0, 0]} name="total" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      ) : (
        vendasPorFilial.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Meta vs Vendido por Filial - {labelPeriodo}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em uma barra para ver os vendedores da filial.
                </p>
              </div>
              <ChartThemePicker themeId={chartThemeId} onChange={setChartThemeId} />
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vendasPorFilial}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="nome"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                      tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) =>
                            `${name === 'meta' ? 'Meta' : 'Vendido'}: R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          }
                        />
                      }
                    />
                    <Legend formatter={(value) => (value === "meta" ? "Meta" : "Vendido")} />
                    <Bar
                      dataKey="meta"
                      fill={chartTheme.meta}
                      radius={[8, 8, 0, 0]}
                      name="meta"
                      cursor="pointer"
                      onClick={(data: any) =>
                        carregarVendedoresDaFilial(data.filialId, data.nome)
                      }
                    />
                    <Bar
                      dataKey="total"
                      fill={chartTheme.vendido}
                      radius={[8, 8, 0, 0]}
                      name="total"
                      cursor="pointer"
                      onClick={(data: any) =>
                        carregarVendedoresDaFilial(data.filialId, data.nome)
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
