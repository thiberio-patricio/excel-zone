import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

interface VendasFilial {
  nome: string;
  total: number;
  meta: number;
}

export default function VisaoGeral() {
  const [stats, setStats] = useState({
    totalFiliais: 0,
    totalGerentes: 0,
    totalVendedores: 0,
    vendasMesAtual: 0
  });
  const [vendasPorFilial, setVendasPorFilial] = useState<VendasFilial[]>([]);

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async () => {
    try {
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();

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
          .gte("data", new Date(anoAtual, now.getMonth(), 1).toISOString()),
        supabase
          .from("metas")
          .select("vendedor_id, valor_meta, mes, ano")
          .or(`ano.lt.${anoAtual},and(ano.eq.${anoAtual},mes.lte.${mesAtual})`),
        supabase
          .from("profiles")
          .select("id, filial_id"),
      ]);

      const vendasTotal = vendasRes.data?.reduce(
        (acc, v) => acc + (Number(v.valor) - Number(v.devolucao)),
        0
      ) || 0;

      // Mapa vendedor_id -> filial_id
      const vendedorFilialMap = new Map<string, string | null>();
      (profilesRes.data || []).forEach((p: any) => {
        vendedorFilialMap.set(p.id, p.filial_id);
      });

      // Mapa filial_id -> nome
      const filialNomeMap = new Map<string, string>();
      (filiaisRes.data || []).forEach((f: any) => {
        filialNomeMap.set(f.id, f.nome);
      });

      // Inicializa todas as filiais (mesmo sem vendas/metas)
      const filialAggMap = new Map<string, { nome: string; total: number; meta: number }>();
      (filiaisRes.data || []).forEach((f: any) => {
        filialAggMap.set(f.id, { nome: f.nome, total: 0, meta: 0 });
      });
      filialAggMap.set("sem-filial", { nome: "Sem Filial", total: 0, meta: 0 });

      // Soma vendas por filial
      vendasRes.data?.forEach((venda: any) => {
        const filialId = venda.vendedor?.filial_id || "sem-filial";
        const nome = venda.vendedor?.filiais?.nome || filialNomeMap.get(filialId) || "Sem Filial";
        const valor = Number(venda.valor) - Number(venda.devolucao);
        const cur = filialAggMap.get(filialId) || { nome, total: 0, meta: 0 };
        cur.total += valor;
        cur.nome = nome;
        filialAggMap.set(filialId, cur);
      });

      // Para cada vendedor, mantém apenas a meta mais recente (herança mês a mês)
      const metaMaisRecentePorVendedor = new Map<string, { valor_meta: number; rank: number }>();
      (metasRes.data || []).forEach((m: any) => {
        const rank = Number(m.ano) * 12 + Number(m.mes);
        const atual = metaMaisRecentePorVendedor.get(m.vendedor_id);
        if (!atual || rank > atual.rank) {
          metaMaisRecentePorVendedor.set(m.vendedor_id, { valor_meta: Number(m.valor_meta), rank });
        }
      });

      // Soma metas por filial (via vendedor->filial)
      metaMaisRecentePorVendedor.forEach((m, vendedorId) => {
        const filialId = vendedorFilialMap.get(vendedorId) || "sem-filial";
        const cur = filialAggMap.get(filialId) || { nome: filialNomeMap.get(filialId) || "Sem Filial", total: 0, meta: 0 };
        cur.meta += m.valor_meta;
        filialAggMap.set(filialId, cur);
      });

      const vendasFilialArray = Array.from(filialAggMap.values())
        .filter((f) => f.nome !== "Sem Filial" || f.total > 0 || f.meta > 0)
        .sort((a, b) => a.nome.localeCompare(b.nome));

      setStats({
        totalFiliais: filiaisRes.data?.length || 0,
        totalGerentes: gerentesRes.count || 0,
        totalVendedores: vendedoresRes.count || 0,
        vendasMesAtual: vendasTotal
      });
      
      setVendasPorFilial(vendasFilialArray);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  const chartConfig = {
    meta: {
      label: "Meta",
      color: "hsl(215 90% 50%)",
    },
    total: {
      label: "Vendido",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Vendas Mês Atual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.vendasMesAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {vendasPorFilial.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Meta vs Vendido por Filial - Mês Atual</CardTitle>
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
                  <Legend
                    formatter={(value) => (value === "meta" ? "Meta" : "Vendido")}
                  />
                  <Bar 
                    dataKey="meta" 
                    fill="hsl(215 90% 50%)" 
                    radius={[8, 8, 0, 0]}
                    name="meta"
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
                    name="total"
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
