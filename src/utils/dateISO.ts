// Converte uma Date em string ISO (YYYY-MM-DD) usando componentes LOCAIS.
// Nunca use `.toISOString().split('T')[0]` para colunas DATE do Postgres:
// em fusos positivos (UTC+X) meia-noite local vira o dia anterior em UTC e
// remove vendas de dias de borda (ex.: dia 1 vira dia 30 do mês anterior, ou
// dia 31 do mês some do range). Sempre use este helper.
export const toLocalISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
