import { useState } from "react";
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
  vendas: Array<{
    id: string;
    data: string;
    valor: number;
    observacoes: string | null;
  }>;
  isReadOnly: boolean;
  onVendasUpdate: () => void;
}

export default function CalendarioVendas({
  vendedorId,
  vendas,
  isReadOnly,
  onVendasUpdate,
}: CalendarioVendasProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  const getDiasDoMes = () => {
    const primeiroDia = new Date(anoAtual, mesAtual, 1);
    const ultimoDia = new Date(anoAtual, mesAtual + 1, 0);
    const dias = [];

    for (let dia = primeiroDia; dia <= ultimoDia; dia.setDate(dia.getDate() + 1)) {
      const diaSemana = dia.getDay();
      if (diaSemana !== 0) {
        dias.push(new Date(dia));
      }
    }

    return dias;
  };

  const handleDayClick = (data: Date) => {
    const dataStr = data.toISOString().split('T')[0];
    setSelectedDate(dataStr);

    const venda = vendas.find(v => v.data === dataStr);
    if (venda) {
      setValor(venda.valor.toString());
      setObservacoes(venda.observacoes || "");
    } else {
      setValor("");
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
            observacoes,
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
            observacoes,
          });

        if (error) throw error;
      }

      toast.success("Venda salva com sucesso!");
      onVendasUpdate();
      setSelectedDate(null);
      setValor("");
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {meses[mesAtual]} {anoAtual}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {diasMes.map((dia) => {
              const dataStr = dia.toISOString().split('T')[0];
              const venda = vendas.find(v => v.data === dataStr);
              const isSelected = selectedDate === dataStr;

              return (
                <button
                  key={dataStr}
                  onClick={() => handleDayClick(dia)}
                  disabled={isReadOnly && !venda}
                  className={`
                    p-3 rounded-lg border transition-all
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
                  {venda && (
                    <div className="text-xs mt-1 font-medium">
                      R$ {venda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedDate && !isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle>
              Registrar Venda - {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações sobre a venda..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSalvar} className="flex-1">
                Salvar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate(null);
                  setValor("");
                  setObservacoes("");
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
