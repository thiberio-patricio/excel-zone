import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { fetchMetaWithFallback } from "@/utils/fetchMetaWithFallback";
import { getMensagemAleatoria, MENSAGENS_INCENTIVO } from "@/data/mensagensIncentivo";

interface Props {
  vendedorId: string;
}

const formatarDataLocal = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export default function MensagemMetaBatida({ vendedorId }: Props) {
  const [open, setOpen] = useState(false);
  const [mensagem, setMensagem] = useState<string>("");

  useEffect(() => {
    verificarMetaDiaria();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendedorId]);

  const verificarMetaDiaria = async () => {
    try {
      const hoje = new Date();
      const hojeStr = formatarDataLocal(hoje);

      // Garante que mostra no máximo uma vez por dia
      const flagKey = `meta-msg-shown-${vendedorId}-${hojeStr}`;
      if (localStorage.getItem(flagKey)) return;

      // Descobrir o último dia útil anterior a hoje (pulando domingos, feriados e férias)
      const mes = hoje.getMonth() + 1;
      const ano = hoje.getFullYear();

      const primeiroDiaMes = new Date(ano, mes - 1, 1);
      const ultimoDiaMes = new Date(ano, mes, 0);

      const [{ data: vendasData }, { data: feriadosData }, { data: feriasData }, metaData] =
        await Promise.all([
          supabase
            .from("vendas")
            .select("data, valor, devolucao")
            .eq("vendedor_id", vendedorId)
            .gte("data", formatarDataLocal(primeiroDiaMes))
            .lte("data", formatarDataLocal(ultimoDiaMes)),
          supabase
            .from("feriados")
            .select("data")
            .gte("data", formatarDataLocal(primeiroDiaMes))
            .lte("data", formatarDataLocal(ultimoDiaMes)),
          supabase
            .from("ferias")
            .select("data_inicio, data_fim")
            .eq("vendedor_id", vendedorId)
            .lte("data_inicio", formatarDataLocal(ultimoDiaMes))
            .gte("data_fim", formatarDataLocal(primeiroDiaMes)),
          fetchMetaWithFallback(vendedorId, mes, ano),
        ]);

      const meta = metaData?.valor_meta;
      if (!meta || meta <= 0) return;

      const feriadosSet = new Set((feriadosData || []).map((f: any) => f.data));
      const ferias = feriasData || [];
      const vendas = vendasData || [];

      const isFerias = (dataStr: string): boolean => {
        const d = new Date(dataStr + "T00:00:00").getTime();
        return ferias.some((f: any) => {
          const ini = new Date(f.data_inicio + "T00:00:00").getTime();
          const fim = new Date(f.data_fim + "T00:00:00").getTime();
          return d >= ini && d <= fim;
        });
      };

      const isDiaUtil = (d: Date): boolean => {
        if (d.getDay() === 0) return false; // domingo
        const s = formatarDataLocal(d);
        if (feriadosSet.has(s)) return false;
        if (isFerias(s)) return false;
        return true;
      };

      // Encontrar último dia útil antes de hoje (dentro do mês atual)
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);

      let diaAlvo: Date | null = null;
      const cursor = new Date(ontem);
      while (cursor >= primeiroDiaMes) {
        if (isDiaUtil(cursor)) {
          diaAlvo = new Date(cursor);
          break;
        }
        cursor.setDate(cursor.getDate() - 1);
      }
      if (!diaAlvo) return;

      const diaAlvoStr = formatarDataLocal(diaAlvo);

      // Vendas reais até o dia ANTES do dia alvo (para calcular a meta esperada daquele dia)
      const vendasAteAnterior = vendas
        .filter((v: any) => v.data < diaAlvoStr)
        .reduce((acc: number, v: any) => acc + (Number(v.valor) - Number(v.devolucao)), 0);

      // Dias úteis sem venda do dia alvo até o fim do mês
      let diasUteisRestantes = 0;
      for (
        let d = new Date(diaAlvo);
        d <= ultimoDiaMes;
        d.setDate(d.getDate() + 1)
      ) {
        if (!isDiaUtil(d)) continue;
        const ds = formatarDataLocal(d);
        if (ds === diaAlvoStr) {
          diasUteisRestantes++;
          continue;
        }
        const temVenda = vendas.find((v: any) => v.data === ds);
        if (!temVenda) diasUteisRestantes++;
      }

      if (diasUteisRestantes <= 0) return;

      const metaDiariaEsperada = (meta - vendasAteAnterior) / diasUteisRestantes;
      if (metaDiariaEsperada <= 0) return;

      const vendaDoDia = vendas.find((v: any) => v.data === diaAlvoStr);
      if (!vendaDoDia) return;

      const vendaRealDia = Number(vendaDoDia.valor) - Number(vendaDoDia.devolucao);
      if (vendaRealDia < metaDiariaEsperada) return;

      // Selecionar mensagem evitando repetição
      const histKey = `meta-msg-history-${vendedorId}`;
      let historico: number[] = [];
      try {
        historico = JSON.parse(localStorage.getItem(histKey) || "[]");
      } catch {
        historico = [];
      }
      const escolhida = getMensagemAleatoria(historico);
      const novoHist = historico.includes(escolhida.id) ? [escolhida.id] : [...historico, escolhida.id];
      const limpo = novoHist.length >= MENSAGENS_INCENTIVO.length ? [escolhida.id] : novoHist;
      localStorage.setItem(histKey, JSON.stringify(limpo));
      localStorage.setItem(flagKey, "1");

      setMensagem(escolhida.texto);
      setOpen(true);
    } catch (err) {
      console.error("Erro ao verificar meta diária:", err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg">
            <Trophy className="h-8 w-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">Meta Diária Batida! 🎉</DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {mensagem}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="w-full">
            Bora pra mais um dia vencedor!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
