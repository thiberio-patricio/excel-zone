import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface VendasFilial {
  nome: string;
  total: number;
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
      const [filiaisRes, gerentesRes, vendedoresRes, vendasRes] = await Promise.all([
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
          .gte("data", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      const vendasTotal = vendasRes.data?.reduce(
        (acc, v) => acc + (Number(v.valor) - Number(v.devolucao)),
        0
      ) || 0;

      // Calcular vendas por filial
      const vendasFilialMap = new Map<string, number>();
      
      vendasRes.data?.forEach((venda: any) => {
        const filialNome = venda.vendedor?.filiais?.nome || "Sem Filial";
        const valorVenda = Number(venda.valor) - Number(venda.devolucao);
        vendasFilialMap.set(
          filialNome, 
          (vendasFilialMap.get(filialNome) || 0) + valorVenda
        );
      });

      const vendasFilialArray = Array.from(vendasFilialMap.entries()).map(([nome, total]) => ({
        nome,
        total
      })).sort((a, b) => b.total - a.total);

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
    total: {
      label: "Vendas",
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
            <CardTitle>Vendas por Filial - Mês Atual</CardTitle>
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
                        formatter={(value) => 
                          `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                        }
                      />
                    } 
                  />
                  <Bar 
                    dataKey="total" 
                    fill="hsl(var(--primary))" 
                    radius={[8, 8, 0, 0]}
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
