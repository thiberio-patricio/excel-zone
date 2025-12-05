import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, TrendingUp, Target, BarChart } from "lucide-react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import GerenciarVendedores from "./GerenciarVendedores";
import VisualizarVendedor from "./VisualizarVendedor";

interface GerenteDashboardProps {
  profile: {
    id: string;
    nome: string;
    email: string;
  };
}

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  foto_url: string | null;
}

export default function GerenteDashboard({ profile }: GerenteDashboardProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null);
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalMetas, setTotalMetas] = useState(0);
  const [dashboardData, setDashboardData] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.id) {
      recarregarTudo();
    }
  }, [profile?.id]);

  const recarregarTudo = () => {
    carregarVendedores();
    carregarTotalVendas();
    carregarDadosDashboard();
  };

  const carregarVendedores = async () => {
    console.log("=== INICIANDO carregarVendedores (Dashboard) ===");
    try {
      // Buscar todos os user_ids de vendedores
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      console.log("Dashboard - Roles data:", rolesData?.length, "roles encontrados");

      if (rolesError) {
        console.error("Dashboard - Erro ao buscar roles:", rolesError);
        throw rolesError;
      }

      const vendedorIds = rolesData?.map(r => r.user_id) || [];
      console.log("Dashboard - IDs de vendedores:", vendedorIds);

      if (vendedorIds.length > 0) {
        // Buscar perfis dos vendedores
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", vendedorIds)
          .order("nome");

        console.log("Dashboard - Profiles data:", data?.length, "perfis encontrados");

        if (error) {
          console.error("Dashboard - Erro ao buscar perfis:", error);
          throw error;
        }
        
        if (data && data.length > 0) {
          console.log("Dashboard - Atualizando estado com", data.length, "vendedores");
          setVendedores(data);
        } else {
          console.log("Dashboard - Nenhum perfil encontrado");
          setVendedores([]);
        }
      } else {
        console.log("Dashboard - Nenhum role de vendedor encontrado");
        setVendedores([]);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar vendedores");
      console.error("Dashboard - Erro detalhado:", error);
    }
    console.log("=== FIM carregarVendedores (Dashboard) ===");
  };

  const carregarTotalVendas = async () => {
    try {
      const mesAtual = new Date().getMonth() + 1;
      const anoAtual = new Date().getFullYear();
      
      // Primeiro dia do mês atual
      const primeiroDia = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
      
      // Último dia do mês atual
      const ultimoDia = new Date(anoAtual, mesAtual, 0);
      const ultimoDiaFormatado = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`;

      // Buscar vendedores da filial
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      const vendedorIds = rolesData?.map(r => r.user_id) || [];

      if (vendedorIds.length === 0) {
        setTotalVendas(0);
        setTotalMetas(0);
        return;
      }

      // Buscar todas as vendas dos vendedores da filial
      const { data: vendasData, error: vendasError } = await supabase
        .from("vendas")
        .select("valor, devolucao")
        .in("vendedor_id", vendedorIds)
        .gte("data", primeiroDia)
        .lte("data", ultimoDiaFormatado);

      if (vendasError) throw vendasError;

      if (vendasData) {
        const total = vendasData.reduce((acc, v) => acc + (Number(v.valor) - Number(v.devolucao)), 0);
        setTotalVendas(total);
      }

      // Buscar todas as metas dos vendedores
      const { data: metasData, error: metasError } = await supabase
        .from("metas")
        .select("valor_meta")
        .in("vendedor_id", vendedorIds)
        .eq("mes", mesAtual)
        .eq("ano", anoAtual);

      if (metasError) throw metasError;

      if (metasData) {
        const totalMetasValue = metasData.reduce((acc, m) => acc + Number(m.valor_meta), 0);
        setTotalMetas(totalMetasValue);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar totais");
      console.error("Erro detalhado:", error);
    }
  };

  const carregarDadosDashboard = async () => {
    try {
      const mesAtual = new Date().getMonth() + 1;
      const anoAtual = new Date().getFullYear();
      
      // Primeiro dia do mês atual
      const primeiroDia = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`;
      
      // Último dia do mês atual
      const ultimoDia = new Date(anoAtual, mesAtual, 0);
      const ultimoDiaFormatado = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`;

      // Buscar vendedores
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      console.log("Dashboard - Roles:", rolesData?.length, rolesError);

      const vendedorIds = rolesData?.map(r => r.user_id) || [];

      if (vendedorIds.length === 0) {
        setDashboardData([]);
        return;
      }

      // Buscar perfis
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", vendedorIds);

      console.log("Dashboard - Profiles:", profiles?.length, profilesError);

      // Buscar vendas e metas
      const chartData = await Promise.all(
        (profiles || []).map(async (vendedor) => {
          const { data: vendas, error: vendasError } = await supabase
            .from("vendas")
            .select("valor, devolucao")
            .eq("vendedor_id", vendedor.id)
            .gte("data", primeiroDia)
            .lte("data", ultimoDiaFormatado);

          const { data: meta, error: metaError } = await supabase
            .from("metas")
            .select("valor_meta")
            .eq("vendedor_id", vendedor.id)
            .eq("mes", mesAtual)
            .eq("ano", anoAtual)
            .maybeSingle();

          const totalVendido = (vendas || []).reduce(
            (acc, v) => acc + (Number(v.valor) - Number(v.devolucao)),
            0
          );

          console.log(`Dashboard - ${vendedor.nome}: vendas=${totalVendido}, meta=${meta?.valor_meta}, erros:`, vendasError, metaError);

          return {
            nome: vendedor.nome,
            vendido: totalVendido,
            meta: Number(meta?.valor_meta) || 0,
          };
        })
      );

      console.log("Dashboard - ChartData final:", chartData);
      setDashboardData(chartData);
    } catch (error: any) {
      toast.error("Erro ao carregar dados do dashboard");
      console.error("Erro detalhado:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-card/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equipe</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {vendedores.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vendedores ativos
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta Geral</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              R$ {totalMetas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso</CardTitle>
            <BarChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalMetas > 0 ? ((totalVendas / totalMetas) * 100).toFixed(1) : 0}%
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                style={{ width: `${Math.min(totalMetas > 0 ? (totalVendas / totalMetas) * 100 : 0, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="vendedores">Gerenciar Equipe</TabsTrigger>
          <TabsTrigger value="vendas">Visualizar Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50">
            <CardHeader className="pb-8">
              <CardTitle className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
                <BarChart className="h-6 w-6 text-primary" />
                Performance da Equipe
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Vendas realizadas versus metas estabelecidas
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={450}>
                <RechartsBarChart 
                  data={dashboardData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  barGap={8}
                >
                  <defs>
                    <linearGradient id="colorVendido" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 85% 45%)" stopOpacity={0.95}/>
                      <stop offset="100%" stopColor="hsl(0 85% 55%)" stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(0 0% 20%)" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="hsl(0 0% 35%)" stopOpacity={0.75}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke="hsl(var(--border))" 
                    opacity={0.3}
                    vertical={false}
                  />
                  <XAxis 
                    dataKey="nome" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={13}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={13}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }}
                    tickFormatter={(value) => 
                      `R$ ${(value / 1000).toFixed(0)}k`
                    }
                  />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))', opacity: 0.1 }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 'var(--radius)',
                      padding: '12px',
                      boxShadow: '0 4px 12px hsl(var(--primary) / 0.1)'
                    }}
                    labelStyle={{
                      color: 'hsl(var(--foreground))',
                      fontWeight: 600,
                      marginBottom: '8px',
                      fontSize: '14px'
                    }}
                    itemStyle={{
                      color: 'hsl(var(--muted-foreground))',
                      fontSize: '13px',
                      padding: '4px 0'
                    }}
                    formatter={(value: number) => 
                      `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    }
                  />
                  <Legend 
                    wrapperStyle={{
                      paddingTop: '20px',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                    iconType="circle"
                    iconSize={10}
                  />
                  <Bar 
                    dataKey="vendido" 
                    fill="url(#colorVendido)" 
                    name="Vendido"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                  <Bar 
                    dataKey="meta" 
                    fill="url(#colorMeta)" 
                    name="Meta"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendedores" className="space-y-4">
          <GerenciarVendedores onUpdate={recarregarTudo} />
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Selecione um vendedor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                {vendedores.map((vendedor) => (
                  <button
                    key={vendedor.id}
                    onClick={() => setSelectedVendedor(vendedor.id)}
                    className={`p-4 text-left rounded-lg border transition-colors ${
                      selectedVendedor === vendedor.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card hover:bg-muted border-border'
                    }`}
                  >
                    {vendedor.nome}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedVendedor && (
            <VisualizarVendedor vendedorId={selectedVendedor} onDataChange={recarregarTudo} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
