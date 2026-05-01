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

### Publicando no GitHub Pages

O projeto já está configurado com um fluxo de trabalho GitHub Actions (`.github/workflows/deploy.yml`) que:

1. Instala as dependências;
2. Executa `npm run build`;
3. Empacota o diretório `dist` e faz o deploy para a página do repositório.

> ⚠️ **Importante**: apenas o branch `main` é observado. A página é publicada a partir do conteúdo do diretório `dist`.

Para ativar a hospedagem, verifique nas configurações do repositório (`Settings → Pages`) se a fonte está definida para a branch `gh-pages` (ou deixe o workflow criar e configurar automaticamente).

Se você vir uma tela em branco ao abrir `https://nuono-cyber.github.io`, provavelmente algum outro workflow anterior estava sobrescrevendo os arquivos com a raiz do repositório. Este repositório agora só usa o workflow acima — outros arquivos de workflow antigos foram removidos.

## 📈 Gerenciamento de Dados do Instagram

A plataforma suporta upload e análise de dados do Instagram através de arquivos CSV e importação via Google Sheets, com processamento inteligente e sincronização em tempo real com o banco de dados cloud.

### Formatos Suportados

| Formato | Status | Funcionalidade |
|---------|--------|-----------------|
| CSV | ✅ Ativo | Upload incremental com upsert automático |
| Google Sheets | ✅ Ativo | Importação via Supabase Function com Service Account |

Google Sheets (Service Account)
-------------------------------
Para importar automaticamente dados do Google Sheets usando uma Service Account e a função Supabase:

- Adicione a variável de ambiente `GOOGLE_SERVICE_ACCOUNT` no dashboard do Supabase Functions contendo o JSON da service account (stringificada).
- A função `sheets-sync` foi adicionada em `supabase/functions/sheets-sync` — ela expõe um endpoint que lê `spreadsheetId` e `range` no corpo e retorna as linhas como objetos (usando a primeira linha como cabeçalho).
- No frontend, use `supabase.functions.invoke('sheets-sync', { body: { action: 'fetch', spreadsheetId, range } })` para buscar os dados e repassar ao processador CSV.

Observação de segurança: nunca comite o JSON da service account no repositório. Prefira armazená-lo como variável de ambiente no Supabase ou em um segredo do CI/CD.

Agendamento (sync automático)
-----------------------------
Para sincronizar automaticamente (ex.: a cada hora), configure um agendamento que invoque a função `sheets-sync` com `action: 'sync'` e o `spreadsheetId` no corpo. Exemplo usando `curl` e a Service Role Key:

```bash
curl -X POST "https://<your-project>.functions.supabase.co/sheets-sync" \
	-H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
	-H "Content-Type: application/json" \
	-d '{"action":"sync","spreadsheetId":"YOUR_SPREADSHEET_ID","range":"A:Z"}'
```

Você pode criar um agendamento no seu provedor de cron (CRON job), GitHub Actions, ou usar o scheduler do próprio Supabase para chamar essa rota periodicamente.

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

1. Faça login como **Super Admin**
2. Acesse a aba **"Gerenciar Dados"** no dashboard
3. Selecione seu arquivo CSV ou importe uma planilha Google Sheets
4. Clique em **Importar**
5. Os dados serão processados e salvos automaticamente

## 🛠 Stack Tecnológico

| Categoria | Tecnologia |
|-----------|-----------|
| **Frontend** | React + TypeScript |
| **Build** | Vite |
| **UI Components** | shadcn-ui |
| **Styling** | Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **Real-time** | Supabase Realtime |
| **Testing** | Vitest |

## ⚙️ Funcionalidades Principais

- 📊 **Dashboard Interativo** - Visualizações em tempo real
- 🔐 **Autenticação Segura** - Sistema de convites e roles
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
