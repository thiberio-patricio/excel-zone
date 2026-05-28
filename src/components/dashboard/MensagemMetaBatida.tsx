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
            .lte("data", formatarDataLocal(ultimoDiaMes))
            .order("data", { ascending: true }),
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
      const vendas = (vendasData || []).filter((v: any) => v.data <= hojeStr);

      const isFerias = (dataStr: string): boolean => {
        const d = new Date(dataStr + "T00:00:00").getTime();
        return ferias.some((f: any) => {
          const ini = new Date(f.data_inicio + "T00:00:00").getTime();
          const fim = new Date(f.data_fim + "T00:00:00").getTime();
          return d >= ini && d <= fim;
        });
      };

      const isDiaUtil = (d: Date): boolean => {
        if (d.getDay() === 0) return false;
        const s = formatarDataLocal(d);
        if (feriadosSet.has(s)) return false;
        if (isFerias(s)) return false;
        return true;
      };

      // Dias já notificados (persistente)
      const shownKey = `meta-msg-days-shown-${vendedorId}`;
      let diasMostrados: string[] = [];
      try {
        diasMostrados = JSON.parse(localStorage.getItem(shownKey) || "[]");
      } catch {
        diasMostrados = [];
      }
      const mostradosSet = new Set(diasMostrados);

      // Procurar o primeiro dia (em ordem cronológica) onde:
      // - há venda preenchida
      // - é dia útil
      // - venda real >= meta esperada calculada para aquele dia
      // - ainda não foi mostrada mensagem
      let diaBatido: string | null = null;
      for (const venda of vendas) {
        const dataStr = venda.data as string;
        if (mostradosSet.has(dataStr)) continue;

        const dataObj = new Date(dataStr + "T00:00:00");
        if (!isDiaUtil(dataObj)) continue;

        // Vendas reais ANTES deste dia
        const vendasAntes = vendas
          .filter((v: any) => v.data < dataStr)
          .reduce((acc: number, v: any) => acc + (Number(v.valor) - Number(v.devolucao)), 0);

        // Dias úteis sem venda do dia atual até o fim do mês (incluindo o próprio dia)
        let diasUteisRestantes = 0;
        for (
          let d = new Date(dataObj);
          d <= ultimoDiaMes;
          d.setDate(d.getDate() + 1)
        ) {
          if (!isDiaUtil(d)) continue;
          const ds = formatarDataLocal(d);
          if (ds === dataStr) {
            diasUteisRestantes++;
            continue;
          }
          const temVenda = vendas.find((v: any) => v.data === ds);
          if (!temVenda) diasUteisRestantes++;
        }

        if (diasUteisRestantes <= 0) continue;

        const metaDiariaEsperada = (meta - vendasAntes) / diasUteisRestantes;
        if (metaDiariaEsperada <= 0) continue;

        const vendaReal = Number(venda.valor) - Number(venda.devolucao);
        if (vendaReal >= metaDiariaEsperada) {
          diaBatido = dataStr;
          break;
        }
      }

      if (!diaBatido) return;

      // Selecionar mensagem evitando repetição
      const histKey = `meta-msg-history-${vendedorId}`;
      let historico: number[] = [];
      try {
        historico = JSON.parse(localStorage.getItem(histKey) || "[]");
      } catch {
        historico = [];
      }
      const escolhida = getMensagemAleatoria(historico);
      const novoHist = [...historico, escolhida.id];
      const limpo = novoHist.length >= MENSAGENS_INCENTIVO.length ? [escolhida.id] : novoHist;
      localStorage.setItem(histKey, JSON.stringify(limpo));

      // Marca o dia como notificado
      diasMostrados.push(diaBatido);
      localStorage.setItem(shownKey, JSON.stringify(diasMostrados));

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
