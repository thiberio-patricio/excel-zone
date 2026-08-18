// Resolve metas reais por vendedor/mês com fallback para a meta mais recente
// cadastrada (mesma regra do fetchMetaWithFallback usado nos dashboards).
// Sem isso, meses sem metas cadastradas geram atingimentos irreais (ex.: 700%).

export const META_TICKET_DEFAULT = 500;

export interface MetaRowLike {
  vendedor_id: string;
  mes: number;
  ano: number;
  valor_meta: number | string | null;
  meta_ticket?: number | string | null;
}

export interface MetaResolvida {
  valorMeta: number;
  metaTicket: number;
}

const chave = (mes: number, ano: number) => ano * 100 + mes;

export function criarMetaResolver(rows: MetaRowLike[]) {
  const porVendedor = new Map<string, MetaRowLike[]>();
  for (const r of rows) {
    const id = String(r.vendedor_id);
    const lista = porVendedor.get(id) ?? [];
    lista.push(r);
    porVendedor.set(id, lista);
  }
  for (const lista of porVendedor.values()) {
    lista.sort((a, b) => chave(b.mes, b.ano) - chave(a.mes, a.ano));
  }

  const resolver = (vendedorId: string, mes: number, ano: number): MetaResolvida | null => {
    const lista = porVendedor.get(String(vendedorId));
    if (!lista?.length) return null;
    const alvo = chave(mes, ano);
    const exata = lista.find((r) => chave(r.mes, r.ano) === alvo);
    // Fallback: última meta cadastrada até o mês alvo; se não houver, a mais antiga.
    const anterior = lista.find((r) => chave(r.mes, r.ano) <= alvo);
    const escolhida = exata ?? anterior ?? lista[lista.length - 1];
    return {
      valorMeta: Number(escolhida.valor_meta) || 0,
      metaTicket: Number(escolhida.meta_ticket) || META_TICKET_DEFAULT,
    };
  };

  return {
    resolver,
    /** Vendedores que possuem alguma meta cadastrada. */
    temMeta: (vendedorId: string) => porVendedor.has(String(vendedorId)),
    /** Soma das metas (com fallback) para um conjunto de vendedores. */
    somaMetas: (vendedorIds: Iterable<string>, mes: number, ano: number) => {
      let valor = 0;
      let ticketSoma = 0;
      let comMeta = 0;
      for (const id of vendedorIds) {
        const m = resolver(id, mes, ano);
        if (!m) continue;
        valor += m.valorMeta;
        ticketSoma += m.metaTicket;
        comMeta += 1;
      }
      return {
        valorMeta: valor,
        /** Média das metas de ticket dos vendedores com meta (ticket é média, não soma). */
        metaTicketMedia: comMeta > 0 ? ticketSoma / comMeta : META_TICKET_DEFAULT,
        metaTicketSoma: ticketSoma,
        vendedoresComMeta: comMeta,
      };
    },
  };
}

export type MetaResolver = ReturnType<typeof criarMetaResolver>;
