import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, TrendingUp } from "lucide-react";

export default function VisaoGeral() {
  const [stats, setStats] = useState({
    totalFiliais: 0,
    totalGerentes: 0,
    totalVendedores: 0,
    vendasMesAtual: 0
  });

  useEffect(() => {
    carregarEstatisticas();
  }, []);

  const carregarEstatisticas = async () => {
    try {
      const [filiaisRes, gerentesRes, vendedoresRes, vendasRes] = await Promise.all([
        supabase.from("filiais").select("id", { count: "exact", head: true }),
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
          .select("valor, devolucao")
          .gte("data", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
      ]);

      const vendasTotal = vendasRes.data?.reduce(
        (acc, v) => acc + (Number(v.valor) - Number(v.devolucao)),
        0
      ) || 0;

      setStats({
        totalFiliais: filiaisRes.count || 0,
        totalGerentes: gerentesRes.count || 0,
        totalVendedores: vendedoresRes.count || 0,
        vendasMesAtual: vendasTotal
      });
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  };

  return (
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
  );
}
