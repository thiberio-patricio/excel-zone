import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, TrendingUp, Target, BarChart, Calendar, UserSquare2, LayoutDashboard } from "lucide-react";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from "recharts";
import GerenciarVendedores from "./GerenciarVendedores";
import VisualizarVendedor from "./VisualizarVendedor";
import GerenciarFeriadosFerias from "./GerenciarFeriadosFerias";
import { fetchMetaWithFallback } from "@/utils/fetchMetaWithFallback";
import { useChartColors, ChartThemePicker } from "@/hooks/useChartColors";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { ProfilePhoto } from "@/components/ui/profile-photo";

interface GerenteDashboardProps {
  profile: {
    id: string;
    nome: string;
    email: string;
    filial_id?: string | null;
  };
}

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  foto_url: string | null;
}

export default function GerenteDashboard({ profile }: GerenteDashboardProps) {
  const validTabs = ["dashboard", "vendedores", "vendas", "feriados"];
  const initialHash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
  const [activeTab, setActiveTab] = useState(
    validTabs.includes(initialHash) ? initialHash : "dashboard"
  );
  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace("#", "");
      if (validTabs.includes(h)) setActiveTab(h);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);
  const { theme: chartTheme, themeId: chartThemeId, setThemeId: setChartThemeId } = useChartColors();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null);
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalMetas, setTotalMetas] = useState(0);
  const [dashboardData, setDashboardData] = useState<any[]>([]);

  const mesAtualDate = new Date().getMonth() + 1;
  const anoAtualDate = new Date().getFullYear();

  const [mesSelecionado, setMesSelecionado] = useState(mesAtualDate);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtualDate);

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const anos = [];
  for (let ano = anoAtualDate; ano >= anoAtualDate - 5; ano--) {
    anos.push(ano);
  }

  useEffect(() => {
    if (profile?.id) {
      recarregarTudo();
    }
  }, [profile?.id, mesSelecionado, anoSelecionado]);

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
      // Primeiro dia do mês selecionado
      const primeiroDia = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`;
      
      // Último dia do mês selecionado
      const ultimoDia = new Date(anoSelecionado, mesSelecionado, 0);
      const ultimoDiaFormatado = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`;

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

      // Buscar todas as metas dos vendedores (com fallback)
      const metasResults = await Promise.all(
        vendedorIds.map(id => fetchMetaWithFallback(id, mesSelecionado, anoSelecionado))
      );

      const totalMetasValue = metasResults.reduce((acc, m) => acc + (m ? Number(m.valor_meta) : 0), 0);
      setTotalMetas(totalMetasValue);
    } catch (error: any) {
      toast.error("Erro ao carregar totais");
      console.error("Erro detalhado:", error);
    }
  };

  const carregarDadosDashboard = async () => {
    try {
      // Primeiro dia do mês selecionado
      const primeiroDia = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-01`;
      
      // Último dia do mês selecionado
      const ultimoDia = new Date(anoSelecionado, mesSelecionado, 0);
      const ultimoDiaFormatado = `${anoSelecionado}-${String(mesSelecionado).padStart(2, '0')}-${String(ultimoDia.getDate()).padStart(2, '0')}`;

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

          const meta = await fetchMetaWithFallback(vendedor.id, mesSelecionado, anoSelecionado);

          const totalVendido = (vendas || []).reduce(
            (acc, v) => acc + (Number(v.valor) - Number(v.devolucao)),
            0
          );

          console.log(`Dashboard - ${vendedor.nome}: vendas=${totalVendido}, meta=${meta?.valor_meta}, erros:`, vendasError);

          return {
            nome: vendedor.nome,
            vendido: totalVendido,
            meta: Number(meta?.valor_meta) || 0,
            percentual: meta?.valor_meta
              ? Math.round((totalVendido / Number(meta.valor_meta)) * 100)
              : 0,
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
    <div>
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Performance"
        title="Dashboard"
        description={`Visão consolidada da equipe de ${profile.nome.split(" ")[0]}.`}
      />
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

      {/* Seletor de Mês/Ano */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Selecionar Período
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
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
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">

        <TabsContent value="dashboard" className="space-y-4">
          <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50">
            <CardHeader className="pb-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
                    <BarChart className="h-6 w-6 text-primary" />
                    Performance da Equipe
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Vendas realizadas versus metas estabelecidas
                  </p>
                </div>
                <ChartThemePicker themeId={chartThemeId} onChange={setChartThemeId} />
              </div>
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
                      <stop offset="0%" stopColor={chartTheme.vendidoStart} stopOpacity={0.95}/>
                      <stop offset="100%" stopColor={chartTheme.vendidoEnd} stopOpacity={0.8}/>
                    </linearGradient>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartTheme.metaStart} stopOpacity={0.9}/>
                      <stop offset="100%" stopColor={chartTheme.metaEnd} stopOpacity={0.75}/>
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
                  >
                    <LabelList
                      dataKey="percentual"
                      position="top"
                      formatter={(value: number) => `${value}%`}
                      style={{ fill: 'hsl(var(--foreground))', fontSize: 12, fontWeight: 600 }}
                    />
                  </Bar>
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
          {!selectedVendedor && (
            <PageHeader
              icon={UserSquare2}
              eyebrow="Gestão"
              title="Vendas"
              description="Selecione um vendedor para visualizar e editar o calendário de vendas."
            />
          )}
          {!selectedVendedor && (
            <PageCard>
              {vendedores.length === 0 ? (
                <EmptyState icon={Users} title="Nenhum vendedor cadastrado" description="Cadastre vendedores em Equipe para começar a acompanhar vendas." />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {vendedores.map((vendedor) => (
                    <button
                      key={vendedor.id}
                      onClick={() => setSelectedVendedor(vendedor.id)}
                      className="group relative p-4 text-left rounded-btn border border-white/5 bg-surface-1/40 hover:bg-white/[0.05] hover:border-primary/30 transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-center gap-3">
                        <ProfilePhoto
                          url={vendedor.foto_url}
                          alt={vendedor.nome}
                          className="h-10 w-10 rounded-xl object-cover border border-white/10"
                          fallback={
                            <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 text-primary font-semibold">
                              {vendedor.nome.charAt(0).toUpperCase()}
                            </div>
                          }
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{vendedor.nome}</div>
                          <div className="text-xs text-muted-foreground truncate">{vendedor.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </PageCard>
          )}

          {selectedVendedor && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedVendedor(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                ← Voltar para lista de vendedores
              </button>
              <VisualizarVendedor vendedorId={selectedVendedor} onDataChange={recarregarTudo} />
            </div>
          )}
        </TabsContent>


        <TabsContent value="feriados" className="space-y-4">
          <GerenciarFeriadosFerias />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

