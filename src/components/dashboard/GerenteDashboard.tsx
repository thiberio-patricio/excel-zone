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
  const [dashboardData, setDashboardData] = useState<any[]>([]);

  useEffect(() => {
    carregarVendedores();
    carregarTotalVendas();
    carregarDadosDashboard();
  }, []);

  const carregarVendedores = async () => {
    try {
      // Buscar IDs de vendedores da tabela user_roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      if (rolesError) throw rolesError;

      const vendedorIds = rolesData?.map(r => r.user_id) || [];

      if (vendedorIds.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .in("id", vendedorIds)
          .order("nome");

        if (error) throw error;
        if (data) setVendedores(data);
      } else {
        setVendedores([]);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar vendedores");
      console.error("Erro detalhado:", error);
    }
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

      const { data, error } = await supabase
        .from("vendas")
        .select("valor, devolucao")
        .gte("data", primeiroDia)
        .lte("data", ultimoDiaFormatado);

      if (error) throw error;

      if (data) {
        const total = data.reduce((acc, v) => acc + (Number(v.valor) - Number(v.devolucao)), 0);
        setTotalVendas(total);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar total de vendas");
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
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendedor");

      const vendedorIds = rolesData?.map(r => r.user_id) || [];

      if (vendedorIds.length === 0) {
        setDashboardData([]);
        return;
      }

      // Buscar perfis
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", vendedorIds);

      // Buscar vendas e metas
      const chartData = await Promise.all(
        (profiles || []).map(async (vendedor) => {
          const { data: vendas } = await supabase
            .from("vendas")
            .select("valor, devolucao")
            .eq("vendedor_id", vendedor.id)
            .gte("data", primeiroDia)
            .lte("data", ultimoDiaFormatado);

          const { data: meta } = await supabase
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

          return {
            nome: vendedor.nome,
            vendido: totalVendido,
            meta: Number(meta?.valor_meta) || 0,
          };
        })
      );

      setDashboardData(chartData);
    } catch (error: any) {
      toast.error("Erro ao carregar dados do dashboard");
      console.error("Erro detalhado:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
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
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {vendedores.length}
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
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.7}/>
                    </linearGradient>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.7}/>
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
          <GerenciarVendedores onUpdate={carregarVendedores} />
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
            <VisualizarVendedor vendedorId={selectedVendedor} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
