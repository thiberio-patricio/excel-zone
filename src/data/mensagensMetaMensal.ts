// Super mensagens para vendedores que concluíram a META MENSAL.
// Tom épico, celebrativo e cinematográfico — diferente das mensagens diárias.

export interface SuperMensagem {
  id: number;
  titulo: string;
  texto: string;
  assinatura: string;
}

export const SUPER_MENSAGENS: SuperMensagem[] = [
  {
    id: 0,
    titulo: "🏆 LENDA DO MÊS",
    texto:
      "As luzes se acendem, a plateia se levanta: você fechou o mês com a meta CONQUISTADA. Não foi sorte, foi estratégia, suor e persistência. Um mês inteiro de decisões certas transformado em número. Guarde essa sensação — ela é o combustível do próximo recorde.",
    assinatura: "Você não bateu a meta. Você a dominou.",
  },
  {
    id: 1,
    titulo: "🚀 MISSÃO CUMPRIDA",
    texto:
      "Contagem final: meta mensal atingida com sucesso. Enquanto muitos falavam, você executava, dia após dia, venda após venda. Este mês entra na sua história como prova de que o extraordinário é apenas o ordinário feito com excelência todos os dias.",
    assinatura: "Órbita alcançada. Próximo destino: seu próprio recorde.",
  },
  {
    id: 2,
    titulo: "👑 O MÊS FOI SEU",
    texto:
      "Coroa na cabeça, número na mesa. Você fechou o ciclo com a meta batida e mostrou o que significa ter presença de vendedor de elite. Cada 'não' que você ouviu virou degrau, cada 'sim' virou resultado.",
    assinatura: "Reinado confirmado. Que venha a próxima temporada.",
  },
  {
    id: 3,
    titulo: "💎 PERFORMANCE DIAMANTE",
    texto:
      "Pressão constante, tempo e consistência: é assim que se forma um diamante — e é exatamente o que você fez neste mês. Meta mensal concluída com brilho próprio. Poucos chegam aqui; menos ainda voltam. Você vai voltar.",
    assinatura: "Talento é dado. Consistência é conquistada. Parabéns!",
  },
  {
    id: 4,
    titulo: "🔥 MÊS INCENDIADO",
    texto:
      "Você não passou pelo mês — você o incendiou. Meta mensal batida, expectativas superadas e um recado claro para o mercado: aqui tem vendedor de verdade. Respire, celebre, comemore. Amanhã a gente sobe mais um degrau.",
    assinatura: "Meta concluída com sucesso. Orgulho total do time!",
  },
  {
    id: 5,
    titulo: "🌟 HALL DA FAMA",
    texto:
      "Seu nome acaba de entrar no Hall da Fama deste mês. Meta mensal 100% concluída. Isso não é sobre um número atingido — é sobre a pessoa que você se tornou no processo: mais disciplinada, mais preparada, mais imbatível.",
    assinatura: "Aplausos de pé. Você merece cada um deles.",
  },
  {
    id: 6,
    titulo: "⚡ ENERGIA DE CAMPEÃO",
    texto:
      "Trinta dias, uma decisão repetida diariamente: não desistir. Resultado? META MENSAL BATIDA. Você provou que a diferença entre o bom e o excepcional é aquela última ligação, aquela última visita, aquele último esforço.",
    assinatura: "Campeão(ã) não nasce feito — se faz todo dia. Parabéns!",
  },
  {
    id: 7,
    titulo: "🎯 ALVO DESTRUÍDO",
    texto:
      "Você mirou no início do mês e acertou no centro. Meta mensal cumprida com precisão cirúrgica. Agora que você sabe que é capaz, o teto de ontem virou o piso de amanhã.",
    assinatura: "Novo mês, nova mira, mesma pontaria de elite.",
  },
];

export function getSuperMensagem(jaMostradasIds: number[]): SuperMensagem {
  const disponiveis = SUPER_MENSAGENS.filter((m) => !jaMostradasIds.includes(m.id));
  const pool = disponiveis.length > 0 ? disponiveis : SUPER_MENSAGENS;
  return pool[Math.floor(Math.random() * pool.length)];
}
