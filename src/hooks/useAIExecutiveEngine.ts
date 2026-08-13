import { useCallback, useEffect, useState } from "react";
import AIExecutiveEngine, { type AIExecutiveAnalysis, type EngineScope } from "@/services/aiExecutiveEngine";

/** Executa o AIExecutiveEngine para o escopo informado. */
export function useAIExecutiveEngine(scope: EngineScope = {}, enabled = true) {
  const [analise, setAnalise] = useState<AIExecutiveAnalysis | null>(null);
  const [carregando, setCarregando] = useState(enabled);
  const [erro, setErro] = useState<string | null>(null);

  const key = `${scope.filialId ?? ""}|${scope.vendedorId ?? ""}|${scope.nome ?? ""}`;

  const executar = useCallback(async () => {
    if (!enabled) return;
    setCarregando(true);
    setErro(null);
    try {
      const result = await AIExecutiveEngine.analisar(scope);
      setAnalise(result);
    } catch (e: any) {
      setErro(e?.message ?? "Falha ao executar a análise");
    } finally {
      setCarregando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    executar();
  }, [executar]);

  return { analise, carregando, erro, recarregar: executar };
}

export default useAIExecutiveEngine;
