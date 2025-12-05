import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { TrendingUp, Target, User } from "lucide-react";
import CalendarioVendas from "./CalendarioVendas";

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

  const mesAtual = new Date().getMonth() + 1;
  const anoAtual = new Date().getFullYear();

  useEffect(() => {
    carregarDados();
  }, [vendedorId]);

  const carregarDados = async () => {
    try {
      const { data: vendedorData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", vendedorId)
        .single();

      if (vendedorData) setVendedor(vendedorData);

      const { data: metaData } = await supabase
        .from("metas")
        .select("*")
        .eq("vendedor_id", vendedorId)
        .eq("mes", mesAtual)
        .eq("ano", anoAtual)
        .single();

      if (metaData) setMeta(metaData);

      const primeiroDia = new Date(anoAtual, mesAtual - 1, 1);
      const ultimoDia = new Date(anoAtual, mesAtual, 0);

      const { data: vendasData, error } = await supabase
        .from("vendas")
        .select("*")
        .eq("vendedor_id", vendedorId)
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
      toast.error("Erro ao carregar dados do vendedor");
    }
  };

  const percentualMeta = meta ? (totalVendido / meta.valor_meta) * 100 : 0;

  if (!vendedor) return null;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-primary/10 to-secondary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {vendedor.nome}
          </CardTitle>
        </CardHeader>
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
        onUpdate={() => {
          carregarDados();
          onDataChange?.();
        }}
      />
    </div>
  );
}
