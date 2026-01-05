import { supabase } from "@/integrations/supabase/client";

interface Meta {
  id: string;
  vendedor_id: string;
  mes: number;
  ano: number;
  valor_meta: number;
}

/**
 * Busca a meta do vendedor para um mês/ano específico.
 * Se não existir, busca a meta mais recente do vendedor.
 */
export async function fetchMetaWithFallback(
  vendedorId: string,
  mes: number,
  ano: number
): Promise<Meta | null> {
  // Primeiro, tenta buscar a meta exata do mês/ano
  const { data: metaExata, error: errorExata } = await supabase
    .from("metas")
    .select("*")
    .eq("vendedor_id", vendedorId)
    .eq("mes", mes)
    .eq("ano", ano)
    .maybeSingle();

  if (errorExata) {
    console.error("Erro ao buscar meta:", errorExata);
    return null;
  }

  if (metaExata) {
    return metaExata;
  }

  // Se não encontrou, busca a meta mais recente do vendedor
  const { data: metaRecente, error: errorRecente } = await supabase
    .from("metas")
    .select("*")
    .eq("vendedor_id", vendedorId)
    .order("ano", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errorRecente) {
    console.error("Erro ao buscar meta recente:", errorRecente);
    return null;
  }

  return metaRecente;
}
