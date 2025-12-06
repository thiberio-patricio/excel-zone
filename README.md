# Unidos Importados - Sistema de Gestão de Vendas

<p align="center">
  <img src="src/assets/logo-unidos.png" alt="Unidos Importados Logo" width="200"/>
</p>

<p align="center">
  Sistema completo de gestão de vendas com hierarquia de usuários, metas e acompanhamento de performance.
</p>

<p align="center">
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-instalação">Instalação</a> •
  <a href="#-como-rodar">Como Rodar</a> •
  <a href="#-deploy">Deploy</a> •
  <a href="#-estrutura">Estrutura</a> •
  <a href="#-licença">Licença</a>
</p>

---

## 🚀 Tecnologias

Este projeto foi desenvolvido com as seguintes tecnologias:

- **[React](https://reactjs.org/)** - Biblioteca JavaScript para construção de interfaces
- **[TypeScript](https://www.typescriptlang.org/)** - Superset JavaScript com tipagem estática
- **[Vite](https://vitejs.dev/)** - Build tool e dev server ultrarrápido
- **[Tailwind CSS](https://tailwindcss.com/)** - Framework CSS utility-first
- **[shadcn/ui](https://ui.shadcn.com/)** - Componentes UI reutilizáveis
- **[React Router DOM](https://reactrouter.com/)** - Roteamento para React
- **[TanStack Query](https://tanstack.com/query)** - Gerenciamento de estado assíncrono
- **[Recharts](https://recharts.org/)** - Biblioteca de gráficos para React
- **[Supabase](https://supabase.com/)** - Backend as a Service (Auth, Database, Edge Functions)
- **[React Hook Form](https://react-hook-form.com/)** - Gerenciamento de formulários
- **[Zod](https://zod.dev/)** - Validação de schemas TypeScript-first
- **[date-fns](https://date-fns.org/)** - Manipulação de datas
- **[Lucide React](https://lucide.dev/)** - Ícones modernos

## ✨ Funcionalidades

### Hierarquia de Usuários
- **Diretor**: Acesso total ao sistema, gerencia filiais e gerentes
- **Gerente**: Gerencia vendedores da sua filial, define metas e visualiza vendas
- **Vendedor**: Visualiza suas próprias vendas e metas (somente leitura)

### Recursos Principais
- 📊 Dashboard com métricas de vendas
- 📅 Calendário de vendas interativo
- 🎯 Sistema de metas por vendedor
- 📈 Gráficos de performance da equipe
- 🏢 Gestão de filiais
- 👥 Gestão de usuários por hierarquia
- 🔐 Autenticação segura com troca obrigatória de senha
- 📱 Design responsivo (mobile, tablet, desktop)

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou bun

## 🔧 Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/unidos-importados.git

# Entre no diretório
cd unidos-importados

# Instale as dependências
npm install
# ou
bun install
```

## 🏃 Como Rodar

### Desenvolvimento

```bash
# Inicie o servidor de desenvolvimento
npm run dev
# ou
bun run dev
```

O aplicativo estará disponível em `http://localhost:8080`

### Build de Produção

```bash
# Gere o build de produção
npm run build

# Visualize o build localmente
npm run preview
```

## 🚀 Deploy

### Lovable (Recomendado)

1. Acesse [Lovable](https://lovable.dev)
2. Abra o projeto
3. Clique em **Share → Publish**

### Outras Plataformas

O build gera arquivos estáticos na pasta `dist/` que podem ser hospedados em:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- AWS S3 + CloudFront

```bash
# Gere o build
npm run build

# A pasta dist/ contém os arquivos para deploy
```

## 📁 Estrutura

```
unidos-importados/
├── public/                 # Arquivos públicos estáticos
├── src/
│   ├── assets/            # Imagens e recursos
│   ├── components/
│   │   ├── dashboard/     # Componentes do dashboard
│   │   └── ui/            # Componentes UI (shadcn)
│   ├── hooks/             # Custom hooks
│   ├── integrations/      # Integrações (Supabase)
│   ├── lib/               # Utilitários
│   ├── pages/             # Páginas da aplicação
│   ├── utils/             # Funções utilitárias
│   ├── App.tsx            # Componente principal
│   ├── index.css          # Estilos globais
│   └── main.tsx           # Entry point
├── supabase/
│   ├── functions/         # Edge Functions
│   └── config.toml        # Configuração Supabase
├── .env                   # Variáveis de ambiente
├── tailwind.config.ts     # Configuração Tailwind
├── vite.config.ts         # Configuração Vite
└── package.json           # Dependências
```

## 🔑 Variáveis de Ambiente

```env
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
VITE_SUPABASE_PROJECT_ID=seu_project_id
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Veja [CONTRIBUTING.md](CONTRIBUTING.md) para mais detalhes.

## 📜 Código de Conduta

Este projeto adota um Código de Conduta. Veja [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## 📝 Changelog

Veja [CHANGELOG.md](CHANGELOG.md) para histórico de mudanças.

## 📄 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

---

<p align="center">
  Desenvolvido com ❤️ por Unidos Importados
</p>
