// Banco de mensagens de incentivo para vendedores que bateram a meta diária.
// Mensagens variadas e motivacionais, focadas em continuar batendo a meta todos os dias.

export const MENSAGENS_INCENTIVO: string[] = [
  "Parabéns! Você bateu a meta de ontem. Que essa vitória se repita todos os dias deste mês!",
  "Mandou muito bem ontem! Cada dia batendo a meta te aproxima do mês perfeito. Vamos manter o ritmo!",
  "Meta batida! 🎯 Agora é repetir essa performance hoje e amanhã. Você está no caminho certo!",
  "Excelente! Ontem foi um dia vencedor. Que tal transformar essa conquista em um hábito diário?",
  "Você superou a meta ontem e provou do que é capaz. Hoje é dia de fazer ainda melhor!",
  "Top demais! Vendedor que bate meta um dia, bate todos. Vai com tudo hoje!",
  "Sucesso ontem, sucesso hoje, sucesso o mês inteiro! Continue assim, campeão(ã)!",
  "Meta alcançada! Cada venda sua faz a diferença. Bora repetir essa conquista hoje?",
  "Você está voando! Ontem foi prova disso. Mantenha o foco e o mês será histórico.",
  "Resultado incrível ontem! O segredo do sucesso é a constância. Vamos pra mais um dia vencedor!",
  "Meta batida com estilo! Hoje é uma nova oportunidade de mostrar o seu potencial.",
  "Você venceu o dia de ontem! Agora venha vencer o de hoje. Sua determinação é admirável.",
  "Show de bola! Bater a meta é hábito de campeão(ã). Continue construindo seu mês de ouro!",
  "Sensacional! Você está provando que é uma força de vendas. Mantenha essa energia hoje!",
  "Parabéns pelo desempenho! Quem bate meta diária constrói meta mensal. Bora pra cima!",
  "Ontem foi seu dia! Hoje pode ser ainda melhor. Você tem talento — use-o todos os dias!",
  "Meta superada! Você está escrevendo uma história de sucesso. Não pare agora!",
  "Que orgulho! Cada meta batida é um degrau pra sua melhor versão. Vamos juntos hoje?",
  "Vendedor(a) de elite! Ontem foi mais uma prova. Mantenha o pé no acelerador!",
  "Meta? Batida! Atitude? Vencedora! Continue assim e o mês será inesquecível.",
  "Você está dando um show! Bater meta diária é o caminho mais curto pro topo. Bora!",
  "Mais um dia, mais uma vitória! Sua disciplina inspira. Faça hoje valer ainda mais.",
  "Aplausos pra você! 👏 Ontem foi excelente. Hoje a meta espera ser batida de novo.",
  "Performance de campeão(ã)! Meta diária batida = meta mensal garantida. Foco total!",
  "Você é demais! Ontem provou seu potencial. Não deixe a chama da motivação apagar!",
  "Trabalho impecável ontem! Quem mantém a constância, alcança o extraordinário.",
  "Meta batida e contando! Que tal fazer disso a rotina do seu mês inteiro?",
  "Vencedor(a) de plantão! Você mostrou força ontem. Hoje é dia de mostrar de novo.",
  "Excelência em ação! Sua dedicação ontem fez a diferença. Continue brilhando!",
  "Você não brincou em serviço ontem! Bater meta é sua marca registrada. Vamos hoje!",
  "Sucesso é hábito! E o seu hábito é vencer. Parabéns pela meta de ontem!",
  "Que desempenho! Ontem foi nota 10. Hoje a meta te chama de novo — atenda esse chamado!",
  "Você está no jogo certo! Bater meta um dia anima. Bater todo dia transforma!",
  "Resultado de respeito! Continue com essa pegada e o mês inteiro será comemoração.",
  "Mandou bem demais! Cada dia vencido te aproxima de bater todas as metas do mês.",
  "Meta batida com maestria! Hoje é mais um dia pra escrever sua história de vitórias.",
  "Top do dia! Você tem o que é preciso pra repetir esse feito todos os dias. Acredite!",
  "Que orgulho da sua performance! Vendedor(a) consistente é vendedor(a) imbatível.",
  "Meta de ontem? Conquistada! Meta de hoje? Sua próxima vitória. Vamos!",
  "Você está num momento incrível! Use essa energia pra bater a meta hoje também.",
  "Performance brilhante ontem! Sua dedicação faz toda a diferença. Continue assim!",
  "Parabéns! Você não só bateu a meta, você inspirou. Hoje é dia de repetir a dose!",
  "Vitória merecida! Cada esforço seu vale ouro. Bora colecionar mais uma hoje?",
  "Você arrasou ontem! Meta diária batida é assinatura de quem leva o trabalho a sério.",
  "Sucesso garantido! Manter a meta diária é o segredo dos melhores. E você é um(a) deles!",
  "Que jogada! Ontem foi show. Hoje o palco é seu de novo — domine!",
  "Você está construindo algo grande! Cada meta diária é um tijolo do seu sucesso.",
  "Meta batida! Coração de campeão(ã) bate forte e bate todos os dias. Bora!",
  "Sensacional! Ontem você se superou. Hoje, supere o de ontem. Esse é o caminho!",
  "Você é referência! Bater meta diária é coisa de profissional de verdade. Parabéns!",
  "Que performance! Continue com essa garra e o mês será o seu melhor de todos.",
  "Vitória conquistada com mérito! Hoje a meta te espera de braços abertos. Vai lá!",
  "Você está imparável! Cada dia batendo a meta te transforma num(a) vendedor(a) lendário(a).",
  "Meta superada com louvor! Que essa seja a primeira de muitas neste mês. Vamos!",
  "Brilhou ontem! Hoje, ilumine o dia com mais uma meta batida. Você consegue!",
  "Trabalho de mestre! Continue assim e nenhuma meta vai resistir a você este mês.",
  "Que orgulho ter você no time! Ontem provou seu valor. Hoje, prove de novo!",
  "Meta batida = sorriso garantido! Mantenha esse ritmo e o mês inteiro será de celebração.",
  "Você é fera! Ontem foi mais uma prova. Hoje é o dia de continuar a saga vitoriosa.",
  "Sucesso atrás de sucesso! Você está no caminho dos grandes. Não pare por nada!",
  "Parabéns pelo desempenho ontem! Lembre-se: quem é constante, é invencível. Bora!",
];

export function getMensagemAleatoria(jaMostradasIds: number[]): { id: number; texto: string } {
  const disponiveis = MENSAGENS_INCENTIVO
    .map((texto, id) => ({ id, texto }))
    .filter((m) => !jaMostradasIds.includes(m.id));

  // Se já mostrou todas, recomeça
  const pool = disponiveis.length > 0
    ? disponiveis
    : MENSAGENS_INCENTIVO.map((texto, id) => ({ id, texto }));

  const escolhida = pool[Math.floor(Math.random() * pool.length)];
  return escolhida;
}
