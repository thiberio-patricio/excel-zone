# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- Estrutura completa de documentação para GitHub
- Arquivos LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md
- README.md profissional com instruções completas

## [1.0.0] - 2024-12-06

### Adicionado
- Sistema de autenticação com hierarquia de usuários (Diretor, Gerente, Vendedor)
- Dashboard personalizado por tipo de usuário
- Gestão de filiais (criação, edição, exclusão)
- Gestão de gerentes por filial
- Gestão de vendedores por gerente
- Sistema de metas por vendedor
- Calendário de vendas interativo
- Registro de vendas diárias com valor, devolução e observações
- Cálculo automático de vendas esperadas
- Gráficos de performance da equipe
- Cards de métricas (Vendas do Mês, Meta Geral, Progresso)
- Troca obrigatória de senha no primeiro login
- Design responsivo para mobile, tablet e desktop
- Tema visual com cores da marca (vermelho e preto)
- Integração completa com Supabase (Auth, Database, Edge Functions)
- Políticas RLS para segurança de dados por filial
- Edge Functions para criação de usuários com roles

### Segurança
- Row Level Security (RLS) em todas as tabelas
- Isolamento de dados por filial
- Autenticação segura via Supabase Auth
- Validação de roles via funções SQL

---

## Tipos de Mudanças

- **Adicionado** para novas funcionalidades
- **Alterado** para mudanças em funcionalidades existentes
- **Obsoleto** para funcionalidades que serão removidas em breve
- **Removido** para funcionalidades removidas
- **Corrigido** para correções de bugs
- **Segurança** para correções de vulnerabilidades
