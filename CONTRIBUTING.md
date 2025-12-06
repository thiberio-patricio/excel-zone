# Contribuindo para Unidos Importados

Obrigado pelo interesse em contribuir! Este documento fornece diretrizes para contribuições.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)
- [Pull Requests](#pull-requests)
- [Padrões de Código](#padrões-de-código)
- [Commits](#commits)

## 📜 Código de Conduta

Este projeto adota um Código de Conduta. Ao participar, você concorda em seguir suas diretrizes. Veja [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## 🤝 Como Contribuir

### 1. Fork do Repositório

Faça um fork do projeto para sua conta GitHub.

### 2. Clone Local

```bash
git clone https://github.com/seu-usuario/unidos-importados.git
cd unidos-importados
```

### 3. Crie uma Branch

```bash
git checkout -b feature/minha-feature
# ou
git checkout -b fix/meu-bugfix
```

### 4. Faça suas Alterações

Implemente suas mudanças seguindo os padrões do projeto.

### 5. Teste

Certifique-se de que suas alterações funcionam corretamente:

```bash
npm run dev
npm run build
```

### 6. Commit

```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
```

### 7. Push

```bash
git push origin feature/minha-feature
```

### 8. Pull Request

Abra um Pull Request no repositório original.

## 🐛 Reportando Bugs

Ao reportar um bug, inclua:

1. **Título claro** descrevendo o problema
2. **Passos para reproduzir** o bug
3. **Comportamento esperado** vs **comportamento atual**
4. **Screenshots** (se aplicável)
5. **Ambiente**: navegador, sistema operacional, versão do Node.js
6. **Logs de console** (se houver erros)

### Template de Issue para Bug

```markdown
## Descrição do Bug
Uma descrição clara do problema.

## Passos para Reproduzir
1. Vá para '...'
2. Clique em '...'
3. Role até '...'
4. Veja o erro

## Comportamento Esperado
O que deveria acontecer.

## Screenshots
Se aplicável, adicione screenshots.

## Ambiente
- OS: [ex: Windows 11]
- Navegador: [ex: Chrome 120]
- Node.js: [ex: 18.17.0]
```

## 💡 Sugerindo Melhorias

Para sugerir melhorias:

1. Verifique se a sugestão já não existe nas Issues
2. Descreva claramente a melhoria proposta
3. Explique por que seria útil
4. Forneça exemplos de uso, se possível

## 🔀 Pull Requests

### Checklist

- [ ] Código segue os padrões do projeto
- [ ] Testes passam localmente
- [ ] Build funciona sem erros
- [ ] Documentação atualizada (se necessário)
- [ ] Commits seguem o padrão Conventional Commits

### Processo de Review

1. Mantenedores revisarão seu PR
2. Podem solicitar alterações
3. Após aprovação, será feito merge

## 📝 Padrões de Código

### TypeScript

- Use tipagem explícita sempre que possível
- Evite `any` - use tipos específicos
- Prefira interfaces para objetos

```typescript
// ✅ Bom
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ Evite
const user: any = { ... };
```

### React

- Use componentes funcionais
- Prefira hooks ao invés de classes
- Mantenha componentes pequenos e focados

```tsx
// ✅ Bom
const UserCard = ({ user }: { user: User }) => {
  return <div>{user.name}</div>;
};

// ❌ Evite componentes muito grandes
```

### Tailwind CSS

- Use classes semânticas do design system
- Evite estilos inline
- Mantenha consistência com o tema

```tsx
// ✅ Bom - usa tokens do design system
<button className="bg-primary text-primary-foreground">

// ❌ Evite - cores hardcoded
<button className="bg-red-500 text-white">
```

### Estrutura de Arquivos

- Componentes em `src/components/`
- Páginas em `src/pages/`
- Hooks em `src/hooks/`
- Utilitários em `src/utils/`

## 📦 Commits

Siga o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(escopo): descrição

[corpo opcional]

[rodapé opcional]
```

### Tipos

- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não afeta código)
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Manutenção

### Exemplos

```bash
feat(auth): adiciona login com Google
fix(dashboard): corrige cálculo de metas
docs(readme): atualiza instruções de instalação
refactor(api): simplifica chamadas ao Supabase
```

## ❓ Dúvidas?

Abra uma Issue com a tag `question` ou entre em contato com os mantenedores.

---

Obrigado por contribuir! 🎉
