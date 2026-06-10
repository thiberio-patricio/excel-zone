import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Calendar, Palmtree, CalendarDays } from "lucide-react";
import { fetchMetaWithFallback } from "@/utils/fetchMetaWithFallback";

interface CalendarioVendasProps {
  vendedorId: string;
  isReadOnly: boolean;
  onUpdate?: () => void;
  mes?: number;
  ano?: number;
}

interface Feriado {
  id: string;
  data: string;
  descricao: string;
}

interface Ferias {
  id: string;
  vendedor_id: string;
  data_inicio: string;
  data_fim: string;
}

export default function CalendarioVendas({
  vendedorId,
  isReadOnly,
  onUpdate,
  mes: mesProp,
  ano: anoProp,
}: CalendarioVendasProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [devolucao, setDevolucao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Usa props se fornecidas, senão usa mês/ano atual
  const mes = mesProp ?? new Date().getMonth() + 1;
  const ano = anoProp ?? new Date().getFullYear();
  const [vendas, setVendas] = useState<Array<{
    id: string;
    data: string;
    valor: number;
    devolucao: number;
    observacoes: string | null;
  }>>([]);
  const [meta, setMeta] = useState<number | null>(null);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [ferias, setFerias] = useState<Ferias[]>([]);

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

      // Carregar meta do mês (com fallback para meta mais recente)
      const metaData = await fetchMetaWithFallback(vendedorId, mes, ano);
      setMeta(metaData?.valor_meta || null);

      // Carregar feriados do mês
      const { data: feriadosData } = await supabase
        .from("feriados")
        .select("id, data, descricao")
        .gte("data", primeiroDia.toISOString().split('T')[0])
        .lte("data", ultimoDia.toISOString().split('T')[0]);

      setFeriados(feriadosData || []);

      // Carregar férias do vendedor que intersectam com o mês
      const { data: feriasData } = await supabase
        .from("ferias")
        .select("id, vendedor_id, data_inicio, data_fim")
        .eq("vendedor_id", vendedorId)
        .lte("data_inicio", ultimoDia.toISOString().split('T')[0])
        .gte("data_fim", primeiroDia.toISOString().split('T')[0]);

      setFerias(feriasData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const isFeriado = (dataStr: string): Feriado | undefined => {
    return feriados.find(f => f.data === dataStr);
  };

  const isFerias = (dataStr: string): boolean => {
    const data = new Date(dataStr + 'T00:00:00');
    return ferias.some(f => {
      const inicio = new Date(f.data_inicio + 'T00:00:00');
      const fim = new Date(f.data_fim + 'T00:00:00');
      return data >= inicio && data <= fim;
    });
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

  const formatarDataLocal = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const calcularVendaEsperada = (data: Date): number | null => {
    if (!meta) return null;

    const dataStr = formatarDataLocal(data);

    // Não calcular para domingos, feriados ou férias
    if (data.getDay() === 0) return null;
    if (isFeriado(dataStr)) return null;
    if (isFerias(dataStr)) return null;

    // Se já tem venda registrada nesse dia, não mostra esperada
    const vendaExistente = vendas.find(v => v.data === dataStr);
    if (vendaExistente) return null;

    // Calcular total de vendas já registradas no mês
    const vendaRealTotal = vendas.reduce((acc, v) =>
      acc + (v.valor - v.devolucao), 0
    );

    // Calcular dias sem venda registrada (excluindo domingos, feriados e férias)
    const ultimoDiaMes = new Date(ano, mes, 0);
    let diasSemVenda = 0;

    for (let d = new Date(ano, mes - 1, 1); d <= ultimoDiaMes; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue; // Exclui domingos
      const dStr = formatarDataLocal(d);
      if (isFeriado(dStr)) continue; // Exclui feriados
      if (isFerias(dStr)) continue; // Exclui férias
      const temVenda = vendas.find(v => v.data === dStr);
      if (!temVenda) {
        diasSemVenda++;
      }
    }

    if (diasSemVenda === 0) return null;

    const metaRestante = meta - vendaRealTotal;
    return metaRestante / diasSemVenda;
  };

  const formatarMoedaInput = (value: string): string => {
    const numeric = value.replace(/\D/g, "");
    const numberValue = parseInt(numeric || "0", 10) / 100;
    return numberValue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const parseMoeda = (value: string): number => {
    return parseFloat(value.replace(/\R\$\s?|/g, "").replace(/\./g, "").replace(",", ".") || "0");
  };

  const handleDayClick = (data: Date) => {
    const dataStr = formatarDataLocal(data);
    setSelectedDate(dataStr);

    const venda = vendas.find(v => v.data === dataStr);
    if (venda) {
      setValor(
        venda.valor.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
        })
      );
      setDevolucao(
        venda.devolucao.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
          minimumFractionDigits: 2,
        })
      );
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
      const valorNum = parseMoeda(valor);
      const devolucaoNum = parseMoeda(devolucao);
      const vendaExistente = vendas.find(v => v.data === selectedDate);

      if (vendaExistente) {
        const { error } = await supabase
          .from("vendas")
          .update({
            valor: valorNum,
            devolucao: devolucaoNum,
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
            valor: valorNum,
            devolucao: devolucaoNum,
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
          {/* Legenda */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="bg-success/10 border-success">
              Venda registrada
            </Badge>
            <Badge variant="outline" className="bg-amber-500/10 border-amber-500 text-amber-700">
              <CalendarDays className="w-3 h-3 mr-1" />
              Feriado
            </Badge>
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500 text-blue-700">
              <Palmtree className="w-3 h-3 mr-1" />
              Férias
            </Badge>
          </div>

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

              const dataStr = formatarDataLocal(dia);
              const venda = vendas.find(v => v.data === dataStr);
              const isSelected = selectedDate === dataStr;
              const vendaReal = venda ? venda.valor - venda.devolucao : 0;
              const vendaEsperada = calcularVendaEsperada(dia);
              const feriadoDoDia = isFeriado(dataStr);
              const emFerias = isFerias(dataStr);

              return (
                <button
                  key={dataStr}
                  onClick={() => handleDayClick(dia)}
                  disabled={isReadOnly && !venda}
                  className={`
                    p-3 rounded-lg border transition-all min-h-[80px] flex flex-col justify-between relative
                    ${isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : feriadoDoDia
                      ? 'bg-amber-500/10 border-amber-500 hover:bg-amber-500/20'
                      : emFerias
                      ? 'bg-blue-500/10 border-blue-500 hover:bg-blue-500/20'
                      : venda
                      ? 'bg-success/10 border-success hover:bg-success/20'
                      : 'bg-card border-border hover:bg-muted'
                    }
                    ${isReadOnly && !venda ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {dia.getDate()}
                    </span>
                    <div className="flex gap-1">
                      {feriadoDoDia && (
                        <CalendarDays className="w-3 h-3 text-amber-600" />
                      )}
                      {emFerias && (
                        <Palmtree className="w-3 h-3 text-blue-600" />
                      )}
                    </div>
                  </div>
                  
                  {/* Feriado */}
                  {feriadoDoDia && !isSelected && (
                    <div className="text-[10px] text-amber-700 truncate">
                      {feriadoDoDia.descricao}
                    </div>
                  )}
                  
                  {/* Férias */}
                  {emFerias && !feriadoDoDia && !isSelected && (
                    <div className="text-[10px] text-blue-700">
                      Férias
                    </div>
                  )}
                  
                  {/* Venda Real (dias com venda registrada) */}
                  {venda && !feriadoDoDia && !emFerias && (
                    <div className="text-xs mt-1">
                      <div className="font-medium text-success">
                        R$ {vendaReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-muted-foreground">Real</div>
                    </div>
                  )}
                  
                  {/* Venda Esperada (dias sem venda registrada, sem feriado e sem férias) */}
                  {!venda && !feriadoDoDia && !emFerias && vendaEsperada !== null && (
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
                type="text"
                placeholder="R$ 0,00"
                value={valor}
                onChange={(e) => setValor(formatarMoedaInput(e.target.value))}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="devolucao">Devolução do Dia (R$)</Label>
              <Input
                id="devolucao"
                type="text"
                placeholder="R$ 0,00"
                value={devolucao}
                onChange={(e) => setDevolucao(formatarMoedaInput(e.target.value))}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendaReal">Venda Real do Dia (R$)</Label>
              <Input
                id="vendaReal"
                type="text"
                value={`R$ ${(parseMoeda(valor) - parseMoeda(devolucao)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
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
