import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Users, TrendingUp, Target } from "lucide-react";
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

  useEffect(() => {
    carregarVendedores();
    carregarTotalVendas();
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
      }
    } catch (error: any) {
      toast.error("Erro ao carregar vendedores");
    }
  };

  const carregarTotalVendas = async () => {
    try {
      const mesAtual = new Date().getMonth() + 1;
      const anoAtual = new Date().getFullYear();
      const primeiroDia = new Date(anoAtual, mesAtual - 1, 1);
      const ultimoDia = new Date(anoAtual, mesAtual, 0);

      const { data, error } = await supabase
        .from("vendas")
        .select("valor")
        .gte("data", primeiroDia.toISOString().split('T')[0])
        .lte("data", ultimoDia.toISOString().split('T')[0]);

      if (error) throw error;

      if (data) {
        const total = data.reduce((acc, v) => acc + Number(v.valor), 0);
        setTotalVendas(total);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar total de vendas");
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

      <Tabs defaultValue="vendedores" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="vendedores">Gerenciar Equipe</TabsTrigger>
          <TabsTrigger value="vendas">Visualizar Vendas</TabsTrigger>
        </TabsList>

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
