import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

interface CalendarioVendasProps {
  vendedorId: string;
  isReadOnly: boolean;
  onUpdate?: () => void;
}

export default function CalendarioVendas({
  vendedorId,
  isReadOnly,
  onUpdate,
}: CalendarioVendasProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [devolucao, setDevolucao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [vendas, setVendas] = useState<Array<{
    id: string;
    data: string;
    valor: number;
    devolucao: number;
    observacoes: string | null;
  }>>([]);
  const [meta, setMeta] = useState<number | null>(null);

  useEffect(() => {
    carregarDados();
  }, [vendedorId, mes, ano]);

  const carregarDados = async () => {
    try {
      const primeiroDia = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0);

      const { data: vendasData } = await supabase
        .from("vendas")
        .select("*")
        .eq("vendedor_id", vendedorId)
        .gte("data", primeiroDia.toISOString().split('T')[0])
        .lte("data", ultimoDia.toISOString().split('T')[0])
        .order("data", { ascending: true });

      setVendas(vendasData || []);

      const { data: metaData } = await supabase
        .from("metas")
        .select("valor_meta")
        .eq("vendedor_id", vendedorId)
        .eq("mes", mes)
        .eq("ano", ano)
        .maybeSingle();

      setMeta(metaData?.valor_meta || null);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const getDiasDoMes = () => {
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    const dias = [];

    // Calcular o dia da semana do primeiro dia (0 = domingo, 1 = segunda, etc.)
    let diaSemanaInicio = primeiroDia.getDay();
    // Ajustar para segunda-feira ser 0
    diaSemanaInicio = diaSemanaInicio === 0 ? 6 : diaSemanaInicio - 1;

    // Adicionar células vazias antes do primeiro dia
    for (let i = 0; i < diaSemanaInicio; i++) {
      dias.push(null);
    }

    // Adicionar os dias do mês (excluindo domingos)
    for (let dia = primeiroDia; dia <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
      const diaSemana = dia.getDay();
      if (diaSemana !== 0) {
        dias.push(new Date(dia));
      }
    }

    return dias;
  };

  const calcularVendaEsperada = (data: Date): number | null => {
    if (!meta) return null;

    const dataStr = data.toISOString().split('T')[0];
    
    // Se já tem venda registrada nesse dia, não mostra esperada
    const vendaExistente = vendas.find(v => v.data === dataStr);
    if (vendaExistente) return null;

    // Calcular total de vendas já registradas no mês
    const vendaRealTotal = vendas.reduce((acc, v) => 
      acc + (v.valor - v.devolucao), 0
    );

    // Calcular dias sem venda registrada (excluindo domingos)
    const ultimoDiaMes = new Date(ano, mes, 0);
    const primeiroDiaMes = new Date(ano, mes - 1, 1);
    let diasSemVenda = 0;
    
    for (let d = new Date(primeiroDiaMes); d <= ultimoDiaMes; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) { // Exclui domingos
        const dStr = d.toISOString().split('T')[0];
        const temVenda = vendas.find(v => v.data === dStr);
        if (!temVenda) {
          diasSemVenda++;
        }
      }
    }

    if (diasSemVenda === 0) return null;

    const metaRestante = meta - vendaRealTotal;
    return metaRestante / diasSemVenda;
  };

  const handleDayClick = (data: Date) => {
    const dataStr = data.toISOString().split('T')[0];
    setSelectedDate(dataStr);

    const venda = vendas.find(v => v.data === dataStr);
    if (venda) {
      setValor(venda.valor.toString());
      setDevolucao(venda.devolucao.toString());
      setObservacoes(venda.observacoes || "");
    } else {
      setValor("");
      setDevolucao("");
      setObservacoes("");
    }
  };

  const handleSalvar = async () => {
    if (!selectedDate || !valor) {
      toast.error("Preencha o valor da venda");
      return;
    }

    try {
      const vendaExistente = vendas.find(v => v.data === selectedDate);

      if (vendaExistente) {
        const { error } = await supabase
          .from("vendas")
          .update({
            valor: parseFloat(valor),
            devolucao: parseFloat(devolucao || "0"),
            observacoes: observacoes || null,
          })
          .eq("id", vendaExistente.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("vendas")
          .insert({
            vendedor_id: vendedorId,
            data: selectedDate,
            valor: parseFloat(valor),
            devolucao: parseFloat(devolucao || "0"),
            observacoes: observacoes || null,
          });

        if (error) throw error;
      }

      toast.success("Venda salva com sucesso!");
      carregarDados();
      onUpdate?.();
      setSelectedDate(null);
      setValor("");
      setDevolucao("");
      setObservacoes("");
    } catch (error: any) {
      toast.error("Erro ao salvar venda");
    }
  };

  const diasMes = getDiasDoMes();
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const diasSemana = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {meses[mes - 1]} {ano}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Legenda dos dias da semana */}
          <div className="grid grid-cols-6 gap-2 mb-2">
            {diasSemana.map((dia) => (
              <div key={dia} className="text-center text-xs font-semibold text-muted-foreground p-2">
                {dia}
              </div>
            ))}
          </div>

          {/* Calendário */}
          <div className="grid grid-cols-6 gap-2">
            {diasMes.map((dia, index) => {
              // Células vazias para alinhar o calendário
              if (dia === null) {
                return <div key={`empty-${index}`} className="p-3" />;
              }

              const dataStr = dia.toISOString().split('T')[0];
              const venda = vendas.find(v => v.data === dataStr);
              const isSelected = selectedDate === dataStr;
              const vendaReal = venda ? venda.valor - venda.devolucao : 0;
              const vendaEsperada = calcularVendaEsperada(dia);

              return (
                <button
                  key={dataStr}
                  onClick={() => handleDayClick(dia)}
                  disabled={isReadOnly && !venda}
                  className={`
                    p-3 rounded-lg border transition-all min-h-[80px] flex flex-col justify-between
                    ${isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : venda
                      ? 'bg-success/10 border-success hover:bg-success/20'
                      : 'bg-card border-border hover:bg-muted'
                    }
                    ${isReadOnly && !venda ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="text-sm font-semibold">
                    {dia.getDate()}
                  </div>
                  
                  {/* Venda Real (dias com venda registrada) */}
                  {venda && (
                    <div className="text-xs mt-1">
                      <div className="font-medium text-success">
                        R$ {vendaReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Real</div>
                    </div>
                  )}
                  
                  {/* Venda Esperada (dias sem venda registrada) */}
                  {!venda && vendaEsperada !== null && (
                    <div className="text-xs mt-1">
                      <div className="font-medium text-primary">
                        R$ {vendaEsperada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Esperada</div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isReadOnly ? 'Detalhes da Venda' : 'Registrar Venda'} - {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Venda do Dia (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="devolucao">Devolução do Dia (R$)</Label>
              <Input
                id="devolucao"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={devolucao}
                onChange={(e) => setDevolucao(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendaReal">Venda Real do Dia (R$)</Label>
              <Input
                id="vendaReal"
                type="text"
                value={`R$ ${(parseFloat(valor || "0") - parseFloat(devolucao || "0")).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                disabled
                className="font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações sobre a venda..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                disabled={isReadOnly}
                rows={3}
              />
            </div>
            {!isReadOnly && (
              <div className="flex gap-2">
                <Button onClick={handleSalvar} className="flex-1">
                  Salvar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedDate(null);
                    setValor("");
                    setDevolucao("");
                    setObservacoes("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            )}
            {isReadOnly && (
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate(null);
                  setValor("");
                  setDevolucao("");
                  setObservacoes("");
                }}
                className="w-full"
              >
                Fechar
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
