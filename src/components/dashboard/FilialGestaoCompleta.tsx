import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, BarChart3, Users, UserSquare2, FileText, CalendarDays } from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import { useChartColors, ChartThemePicker } from "@/hooks/useChartColors";
import { PageCard } from "@/components/layout/PageCard";
import { EmptyState } from "@/components/layout/EmptyState";
import { ProfilePhoto } from "@/components/ui/profile-photo";
import PainelExecutivo from "./PainelExecutivo";
import Relatorios from "./Relatorios";
import GerenciarVendedores from "./GerenciarVendedores";
import GerenciarFeriadosFerias from "./GerenciarFeriadosFerias";
import VisualizarVendedor from "./VisualizarVendedor";

const META_TICKET = 500;

export interface VendedorPerformance {
  id: string;
  nome: string;
  total: number;
  meta: number;
  ticket: number;
  percentual: number;
  percentualTicket: number;
}

interface FilialGestaoCompletaProps {
  filialId: string;
  filialNome: string;
  mes: number;
  ano: number;
  performance: VendedorPerformance[];
  loadingPerformance?: boolean;
  onVoltar: () => void;
  onReload?: () => void;
}

interface VendedorItem {
  id: string;
  nome: string;
  email: string;
  foto_url: string | null;
  ativo?: boolean | null;
}


export default function FilialGestaoCompleta({
  filialId,
  filialNome,
  mes,
  ano,
  performance,
  loadingPerformance,
  onVoltar,
  onReload,
}: FilialGestaoCompletaProps) {
  const { theme: chartTheme, themeId: chartThemeId, setThemeId: setChartThemeId } = useChartColors();
  const [tab, setTab] = useState("dashboard");
  const [vendedores, setVendedores] = useState<VendedorItem[]>([]);
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null);

  useEffect(() => {
    carregarVendedores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filialId]);

  const carregarVendedores = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nome, email, foto_url, ativo")
      .eq("filial_id", filialId)
      .order("nome");
    const ids = (profiles || []).map((p) => p.id);
    if (ids.length === 0) {
      setVendedores([]);
      return;
    }
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "vendedor")
      .in("user_id", ids);
    const vendedorIds = new Set((roles || []).map((r: any) => r.user_id));
    setVendedores((profiles || []).filter((p) => vendedorIds.has(p.id)) as VendedorItem[]);
  };

  const chartData = performance.map((p) => ({
    nome: p.nome,
    vendido: p.total,
    meta: p.meta,
    ticket: p.ticket,
    percentual: p.percentual,
    percentualTicket: p.percentualTicket,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onVoltar}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Filiais
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Visão completa da filial</p>
            <h2 className="text-xl font-semibold tracking-tight">{filialNome}</h2>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">
            <BarChart3 className="w-4 h-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="vendas">
            <UserSquare2 className="w-4 h-4 mr-2" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="relatorios">
            <FileText className="w-4 h-4 mr-2" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="feriados">
            <CalendarDays className="w-4 h-4 mr-2" />
            Férias / Feriados / Folgas
          </TabsTrigger>
          <TabsTrigger value="equipe">
            <Users className="w-4 h-4 mr-2" />
            Gestão de Equipe
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <PainelExecutivo mes={mes} ano={ano} filialId={filialId} />

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Performance da Equipe — {filialNome}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Vendas realizadas versus metas dos vendedores desta filial.
                </p>
              </div>
              <ChartThemePicker themeId={chartThemeId} onChange={setChartThemeId} />
            </CardHeader>
            <CardContent>
              {loadingPerformance ? (
                <div className="h-[360px] flex items-center justify-center text-muted-foreground">Carregando...</div>
              ) : chartData.length === 0 ? (
                <div className="h-[360px] flex items-center justify-center text-muted-foreground">
                  Nenhum vendedor encontrado nesta filial.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsBarChart data={chartData} margin={{ top: 24, right: 24, left: 12, bottom: 60 }} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis
                      dataKey="nome"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      angle={-35}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={80}
                      tickFormatter={(value) => `R$\u00A0${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                        padding: "12px",
                      }}
                      formatter={(value: number, name: string) =>
                        name === "Ticket Médio"
                          ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${Math.round(
                              (value / META_TICKET) * 100
                            )}% da meta de R$ 500,00)`
                          : `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Legend iconType="circle" iconSize={10} wrapperStyle={{ paddingTop: 16 }} />
                    <Bar dataKey="meta" fill={chartTheme.meta} name="Meta" radius={[8, 8, 0, 0]} maxBarSize={60} />
                    <Bar
                      dataKey="vendido"
                      fill={chartTheme.vendido}
                      name="Vendido"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                      cursor="pointer"
                      onClick={(d: any) => {
                        const found = performance.find((p) => p.nome === d?.nome);
                        if (found) {
                          setSelectedVendedor(found.id);
                          setTab("vendas");
                        }
                      }}
                    >
                      <LabelList
                        dataKey="percentual"
                        position="top"
                        formatter={(v: number) => `${v}%`}
                        style={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                      />
                    </Bar>
                    <Bar
                      dataKey="ticket"
                      fill={chartTheme.percentual}
                      name="Ticket Médio"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={60}
                    >
                      <LabelList
                        dataKey="percentualTicket"
                        position="top"
                        formatter={(v: number) => `${v}%`}
                        style={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }}
                      />
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendas" className="space-y-4">
          {!selectedVendedor ? (
            <PageCard>
              {vendedores.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum vendedor cadastrado"
                  description="Cadastre vendedores em Gestão de Equipe para acompanhar as vendas desta filial."
                />
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
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedVendedor(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
              >
                ← Voltar para lista de vendedores
              </button>
              <VisualizarVendedor vendedorId={selectedVendedor} onDataChange={() => onReload?.()} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <Relatorios scope={{ filialId, filialNome }} />
        </TabsContent>

        <TabsContent value="feriados" className="space-y-4">
          <GerenciarFeriadosFerias filialId={filialId} />
        </TabsContent>

        <TabsContent value="equipe" className="space-y-4">
          <GerenciarVendedores filialId={filialId} onUpdate={() => { carregarVendedores(); onReload?.(); }} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
