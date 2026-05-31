# Instagram Analytics Creator

Uma plataforma profissional e intuitiva para análise avançada de dados do Instagram com inteligência artificial integrada.

## 📊 Sobre o Projeto

**Instagram Analytics Creator** é uma aplicação web moderna desenvolvida para criar insights profundos sobre o desempenho de contas do Instagram. Com análises em tempo real, visualizações interativas e integração com IA, a plataforma oferece ferramentas completas para estratégia de conteúdo.

## 🚀 Início Rápido

### Pré-requisitos

- Node.js & npm - [Instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Instalação para desenvolvimento

```bash
# Clonar o repositório
git clone <YOUR_GIT_URL>

# Navegar até o diretório
cd insight-creator-ai

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O aplicativo estará disponível em `http://localhost:5173`

### Publicação

O frontend pode continuar hospedado no GitHub Pages, mas a API precisa rodar em um backend Node com acesso ao Supabase. O arquivo [render.yaml](/home/nunerd/Área%20de%20trabalho/INSTAGRAM_SITE/nuono-cyber.github.io/render.yaml:1) já está preparado para publicar essa API no Render.

## 📈 Gerenciamento de Dados do Instagram

A plataforma suporta upload e análise de dados do Instagram com persistência no Supabase, além de sincronização automática via Meta Graph API.

Sincronização com Meta Graph API
--------------------------------
Agora o backend também pode buscar posts e métricas diretamente da Meta, sem depender de upload manual de CSV.

Como configurar:

1. Crie um app em Meta for Developers e habilite a Instagram Graph API.
2. Use uma conta Instagram Business ou Creator vinculada a uma Facebook Page.
3. Gere um access token de longa duração com permissões para leitura de perfil e insights do Instagram.
4. Descubra o `Instagram User ID` da conta conectada.
5. No painel, abra `Importar Dados` e preencha `Instagram User ID`, `Access Token` e o intervalo do sync.
6. Salve a conexão e clique em `Sincronizar agora` para popular a base inicial.

Variáveis de ambiente suportadas:

- `META_GRAPH_API_VERSION`: versão da Graph API usada pelo backend. Ex.: `v23.0`
- `META_SYNC_ENABLED`: ativa o sync automático ao subir o servidor
- `META_SYNC_INTERVAL_MINUTES`: intervalo mínimo entre sincronizações automáticas
- `META_INSTAGRAM_USER_ID`: ID da conta do Instagram
- `META_ACCESS_TOKEN`: token salvo diretamente no backend no boot inicial

Observações:

- O sync automático roda no backend Node. Se a aplicação estiver só no GitHub Pages sem a API publicada, ele não executa.
- O token é armazenado na tabela `meta_sync_config` do Supabase. Em produção, restrinja o acesso ao painel administrativo.
- A Meta entrega métricas diferentes por tipo de mídia; quando uma métrica não existir para aquele post, o sistema grava `0`.

### Estrutura de Dados

Os arquivos devem conter as seguintes colunas:

- **Horário de publicação** - Data e hora do post
- **Descrição** - Conteúdo do post
- **Visualizações** - Total de views
- **Alcance** - Alcance total
- **Curtidas** - Total de likes
- **Comentários** - Total de comments
- **Compartilhamentos** - Total de shares
- **Salvamentos** - Total de saves
- **Seguimentos** - New follows
- **Duração (s)** - Duração em segundos
- **Tipo de post** - Reels, Posts, Stories
- **Link permanente** - URL do post

### Como Usar

1. Publique a migration SQL em `supabase/migrations`
2. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no backend
3. Faça login com um dos super admins
4. No primeiro acesso, use a senha temporária `Senha123##` e redefina a senha
5. Acesse a aba **"Importar Dados"** para subir arquivos ou configurar o sync da Meta

## 🛠 Stack Tecnológico

| Categoria | Tecnologia |
|-----------|-----------|
| **Frontend** | React + TypeScript |
| **Build** | Vite |
| **UI Components** | shadcn-ui |
| **Styling** | Tailwind CSS |
| **Backend** | Node.js + Supabase (PostgreSQL) |
| **Real-time** | Supabase Realtime |
| **Testing** | Vitest |

## ⚙️ Funcionalidades Principais

- 📊 **Dashboard Interativo** - Visualizações em tempo real
- 🔐 **Autenticação Segura** - Super admins com troca obrigatória de senha no primeiro acesso
- 💬 **Chat Interno** - Comunicação entre admins
- 📈 **Análises Avançadas** - 9 abas de análise diferenciadas
- 🎨 **Tema Personalizável** - Dark/Light mode
- ☁️ **Sincronização Cloud** - Dados sempre sincronizados
- 🤖 **Integração IA** - Chat bot com análises inteligentes

## 🏗 Estrutura do Projeto

```
insight-creator-ai/
├── src/
│   ├── components/        # Componentes React reutilizáveis
│   ├── hooks/            # Custom hooks
│   ├── pages/            # Páginas principais
│   ├── contexts/         # Context API
│   ├── integrations/     # Integrações externas (Supabase)
│   └── utils/            # Funções utilitárias
├── supabase/
│   ├── migrations/       # Migrações do banco de dados
│   └── functions/        # Edge functions
└── public/               # Arquivos estáticos
```

## 👨‍💼 Sobre o Desenvolvedor

**Instagram Analytics Creator** foi desenvolvido por:

**Gabriel Nunes Barbosa Nogueira**

📱 Instagram: [@ideia_enegocios](https://instagram.com/ideia_enegocios)

Um profissional apaixonado por análise de dados, desenvolvimento web e estratégia digital.

## 📄 Licença

Este projeto está sob licença privada. Todos os direitos reservados.

---

**Versão**: 1.0.0  
**Última atualização**: Fevereiro de 2026
