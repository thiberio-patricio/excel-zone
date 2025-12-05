import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, Target, Calendar } from "lucide-react";
import CalendarioVendas from "./CalendarioVendas";

interface VendedorDashboardProps {
  profile: {
    id: string;
    nome: string;
    email: string;
  };
}

interface Meta {
  valor_meta: number;
  mes: number;
  ano: number;
}

interface Venda {
  id: string;
  data: string;
  valor: number;
  devolucao: number;
}

export default function VendedorDashboard({ profile }: VendedorDashboardProps) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [totalVendido, setTotalVendido] = useState(0);

  const mesAtualDate = new Date().getMonth() + 1;
  const anoAtualDate = new Date().getFullYear();

  const [mesSelecionado, setMesSelecionado] = useState(mesAtualDate);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtualDate);

  useEffect(() => {
    carregarDados();
  }, [profile.id, mesSelecionado, anoSelecionado]);

  const carregarDados = async () => {
    try {
      // Carregar meta do mês selecionado
      const { data: metaData } = await supabase
        .from("metas")
        .select("*")
        .eq("vendedor_id", profile.id)
        .eq("mes", mesSelecionado)
        .eq("ano", anoSelecionado)
        .maybeSingle();

      setMeta(metaData);

      // Carregar vendas do mês selecionado
      const primeiroDia = new Date(anoSelecionado, mesSelecionado - 1, 1);
      const ultimoDia = new Date(anoSelecionado, mesSelecionado, 0);

      const { data: vendasData, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("vendedor_id", profile.id)
        .gte("data", primeiroDia.toISOString().split('T')[0])
        .lte("data", ultimoDia.toISOString().split('T')[0])
        .order("data", { ascending: true });

      if (error) throw error;

      if (vendasData) {
        setVendas(vendasData);
        const total = vendasData.reduce((acc, v) => acc + (Number(v.valor) - Number(v.devolucao)), 0);
        setTotalVendido(total);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
    }
  };

  const percentualMeta = meta ? (totalVendido / meta.valor_meta) * 100 : 0;

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const anos = [];
  for (let ano = anoAtualDate; ano >= anoAtualDate - 5; ano--) {
    anos.push(ano);
  }

  return (
    <div className="space-y-6">
      {/* Seletor de Mês/Ano */}
      <Card>
        <CardHeader>
          <CardTitle>Selecionar Período</CardTitle>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-card to-card/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {totalVendido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meta do Mês</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {meta?.valor_meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-card/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progresso</CardTitle>
            <Calendar className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {percentualMeta.toFixed(1)}%
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent/80 transition-all duration-500"
                style={{ width: `${Math.min(percentualMeta, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <CalendarioVendas
        vendedorId={profile.id}
        isReadOnly={true}
      />
    </div>
  );
}
