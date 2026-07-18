import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, Target, User, Calendar } from "lucide-react";
import CalendarioVendas from "./CalendarioVendas";
import { fetchMetaWithFallback } from "@/utils/fetchMetaWithFallback";
import { PageHeader } from "@/components/layout/PageHeader";

interface VisualizarVendedorProps {
  vendedorId: string;
  onDataChange?: () => void;
}

interface Vendedor {
  id: string;
  nome: string;
  email: string;
}

interface Meta {
  valor_meta: number;
}

interface Venda {
  id: string;
  data: string;
  valor: number;
  devolucao: number;
}

export default function VisualizarVendedor({ vendedorId, onDataChange }: VisualizarVendedorProps) {
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [totalVendido, setTotalVendido] = useState(0);

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
    carregarDados();
  }, [vendedorId, mesSelecionado, anoSelecionado]);

  const carregarDados = async () => {
    try {
      const { data: vendedorData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", vendedorId)
        .single();

      if (vendedorData) setVendedor(vendedorData);

      // Carregar meta do mês selecionado (com fallback para meta mais recente)
      const metaData = await fetchMetaWithFallback(vendedorId, mesSelecionado, anoSelecionado);
      setMeta(metaData);

      const primeiroDia = `${anoSelecionado}-${String(mesSelecionado).padStart(2, "0")}-01`;
      const ultimoDiaDate = new Date(anoSelecionado, mesSelecionado, 0);
      const ultimoDia = `${anoSelecionado}-${String(mesSelecionado).padStart(2, "0")}-${String(ultimoDiaDate.getDate()).padStart(2, "0")}`;

      const { data: vendasData, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("vendedor_id", vendedorId)
        .gte("data", primeiroDia)
        .lte("data", ultimoDia)
        .order("data", { ascending: true });

      if (error) throw error;

      if (vendasData) {
        setVendas(vendasData);
        const total = vendasData.reduce((acc, v) => acc + (Number(v.valor) - Number(v.devolucao)), 0);
        setTotalVendido(total);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar dados do vendedor");
    }
  };

  const percentualMeta = meta ? (totalVendido / meta.valor_meta) * 100 : 0;

  if (!vendedor) return null;

  return (
    <div>
      <PageHeader
        icon={User}
        eyebrow="Vendedor"
        title={vendedor.nome}
        description="Acompanhamento individual de metas, vendas e calendário."
      />
      <div className="space-y-4">

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
        vendedorId={vendedorId}
        isReadOnly={false}
        mes={mesSelecionado}
        ano={anoSelecionado}
        onUpdate={() => {
          carregarDados();
          onDataChange?.();
        }}
        />
      </div>
    </div>
  );
}

