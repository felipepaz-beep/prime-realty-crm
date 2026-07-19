# CLAUDE.md

Guia para agentes de IA (Claude Code e similares) trabalhando neste repositório.

## O que é este projeto

CRM para **corretor de imóveis autônomo**, **usuário único** (não é multi-tenant nem multi-corretor).
O modelo de dados é **centrado no cliente**: não existe cadastro/CRUD de imóveis — os imóveis
aparecem apenas como referência textual dentro do contexto de um cliente (endereço, código,
descrição livre), nunca como uma entidade própria do sistema. Toda a jornada é organizada em
torno do cliente: pipeline (kanban), agenda, comunicação, documentos, financeiro e timeline.

Projeto sincronizado com o [Lovable](https://lovable.dev) — commits enviados para a branch
conectada aparecem no editor do Lovable. Não reescreva histórico já publicado (sem force-push,
rebase ou amend de commits já enviados).

## Stack

- **Framework**: [TanStack Start](https://tanstack.com/start) (React 19 + SSR/Vite), roteamento
  file-based com [TanStack Router](https://tanstack.com/router) em `src/routes/`.
- **Runtime/gerenciador de pacotes**: [Bun](https://bun.sh) (`bun.lock`, `bunfig.toml`).
- **Linguagem**: TypeScript (`strict: true`), alias `@/*` → `src/*`.
- **Backend/dados**: [Supabase](https://supabase.com) (Postgres + Auth + Storage), cliente em
  `src/integrations/supabase/client.ts` (browser) e `client.server.ts` (server). Tipos gerados
  em `src/integrations/supabase/types.ts`. Migrations em `supabase/migrations/`.
- **UI**: [shadcn/ui](https://ui.shadcn.com), estilo **new-york**, cor base **slate**, ícones
  **lucide-react**. Configuração em `components.json`. Componentes-base ficam em
  `src/components/ui/` (gerados pelo shadcn — evite editar à mão além do necessário).
- **Estilo**: Tailwind CSS v4, tokens de design em `src/styles.css` (cores em `oklch`, tokens
  semânticos — nunca usar cores hardcoded nos componentes).
- **Data fetching/estado assíncrono**: [TanStack Query](https://tanstack.com/query) — toda
  chamada de dados usa `useQuery`/`useSuspenseQuery`/`useMutation`, nunca `useEffect` + fetch manual.
- **Validação**: [Zod](https://zod.dev) — toda entrada de usuário é validada com schemas Zod
  (`schemas.ts` por feature).
- **Formulários**: [React Hook Form](https://react-hook-form.com) + `@hookform/resolvers/zod`.
- **Testes**: Vitest + Testing Library (`vitest.config.ts`), arquivos `*.test.tsx` ao lado do
  código testado.
- **Lint/format**: ESLint (`eslint.config.js`, plugin Prettier integrado) + Prettier
  (`.prettierrc`: sem ponto e vírgula opcional — `semi: true`, aspas duplas, `printWidth: 100`,
  trailing comma `all`).

### Scripts

```
bun run dev        # servidor de desenvolvimento (vite dev)
bun run build       # build de produção
bun run lint         # eslint .
bun run format      # prettier --write .
```

## Estrutura de `src/`

```
src/
├── routes/                # Rotas (TanStack Router, file-based)
│   └── _authenticated/    # Rotas protegidas (beforeLoad valida sessão Supabase)
├── features/               # Módulos de negócio — ver seção abaixo
├── components/
│   ├── ui/                 # Design System (shadcn, new-york/slate)
│   └── layout/             # AppShell, Sidebar, Topbar
├── integrations/supabase/  # Clientes Supabase (browser/server), tipos gerados
├── providers/               # Providers globais (ex.: theme-provider)
├── hooks/                    # Hooks React globais e não específicos de uma feature
├── lib/                       # Utilitários de baixo nível (cn, error capture, etc.)
├── contexts/                  # Contexts de escopo local
├── constants/                 # Constantes globais
├── database/                  # Schemas/queries auxiliares
├── ai/                          # Prompts, agentes e helpers de IA
└── styles.css                   # Tokens de design (Tailwind v4 + oklch)
```

### `src/features/<modulo>/`

Cada módulo de negócio agrupa tudo que precisa em um só lugar:

```
features/<modulo>/
├── components/       # Componentes React da feature
├── hooks/             # use-<algo>.ts — hooks de TanStack Query (useQuery/useMutation)
├── services/           # <algo>.service.ts — funções que falam com o Supabase
├── types.ts             # Tipos e contratos da feature
├── schemas.ts            # Schemas Zod de validação
└── constants.ts            # Constantes/labels da feature
```

Módulos existentes: `agenda`, `auth`, `clientes`, `comunicacao`, `configuracoes`, `dashboard`,
`documentos`, `financeiro`, `ia`, `relatorios`.

Um novo módulo de negócio → criar `src/features/<nome>/` seguindo essa estrutura + rota
correspondente em `src/routes/`. O módulo consome o Design System, expõe hooks e services
próprios, e não vaza detalhes internos (ex.: chamadas diretas ao Supabase) para outros módulos.

## Convenções do projeto

- **Camadas**: `routes/` (composição de página) → `hooks/` (TanStack Query) → `services/`
  (chamadas ao Supabase). Rotas não chamam `services/` diretamente nem duplicam lógica; lógica
  reutilizável mora em `hooks/` ou `services/`.
- **Nomenclatura**: arquivos em `kebab-case` (`cliente-timeline.tsx`, `use-clientes.ts`,
  `clients.service.ts`). Nomes de domínio (variáveis, funções de serviço, labels) em
  **português** (`buscarClientePorId`, `registrarEvento`, `etapaAlterada`); nomes técnicos/tipos
  genéricos em inglês quando fizer sentido (`ClienteInsert`, `TimelineEvent`).
  Textos de UI voltados ao usuário são em pt-BR.
- **Query keys**: cada feature exporta um objeto `<modulo>Keys` (ex.: `clientesKeys`) com
  `all/lists/list(filtros)/details/detail(id)` para invalidação consistente do cache.
- **Validação de dados de usuário**: sempre via Zod (`schemas.ts` da feature) + React Hook Form
  (`zodResolver`).
- **UI**: apenas tokens do Design System (`bg-muted`, `text-primary`, etc.) — nunca cores
  hardcoded. Componentes de `src/components/ui/` não devem conter lógica de negócio.
- **Import paths**: sempre via alias `@/...` (nunca caminhos relativos longos cruzando features).
- **Erros do Supabase**: services lançam (`throw error`) em leitura; em gravações de
  "melhor esforço" (ex.: timeline) o padrão é logar com `console.warn` e não interromper o fluxo
  principal do usuário — siga o padrão já usado em `timeline.service.ts` ao decidir.
- **Autenticação**: usuário único, mas a base de dados mantém `owner_id`/`created_by` (herança
  do template Supabase) — não construa telas de convite, times ou múltiplos usuários.

## Regras obrigatórias

### 1. `TimelineService` é a única porta de escrita em `client_timeline`

Toda gravação de evento na tabela `client_timeline` **deve** passar por
`TimelineService` (`src/features/clientes/services/timeline.service.ts`). Nenhum outro módulo,
service, hook ou rota pode fazer `supabase.from('client_timeline').insert(...)` diretamente.

- Para registrar um novo tipo de evento, adicione um método a `TimelineService`
  (ex.: `TimelineService.clienteCriado(...)`, `TimelineService.documentoAnexado(...)`) — todos
  delegam para a função interna `registrarEvento`, que resolve `owner_id`/`created_by` a partir
  da sessão autenticada e nunca lança erro para o chamador (falha é logada com `console.warn`,
  a ação principal do usuário não é bloqueada).
- **Leitura** de `client_timeline` é permitida em qualquer service (ex.:
  `ai.service.ts` lê o histórico recente do cliente para montar contexto de IA) — a regra é
  apenas sobre **escrita**.
- Ao adicionar uma feature nova que gera um evento de linha do tempo (nova etapa de negócio,
  nova ação do usuário sobre o cliente), chame o método correspondente de `TimelineService` a
  partir do `hook` de mutação (padrão usado em `use-clientes.ts`, `document.service.ts`,
  `communication.service.ts`, `activity.service.ts`) — nunca insira na tabela por conta própria.

### 2. `AIDrawer` é reutilizável via props `clientId` e `clienteNome`

`AIDrawer` (`src/features/ia/components/ai-drawer.tsx`) é o componente único do assistente de
IA em drawer/sheet. Ele é **genérico e reutilizável** em qualquer tela:

```tsx
<AIDrawer clientId={cliente.id} clienteNome={cliente.nome} onSalvar={(texto) => ...}>
  {/* trigger customizado opcional; padrão é um botão "Assistente IA" */}
</AIDrawer>
```

- `clientId` e `clienteNome` são **opcionais** — sem eles o drawer opera em contexto geral do
  CRM (como usado hoje em `src/routes/_authenticated/ia.tsx`); com eles, contextualiza o prompt
  e as ações rápidas para aquele cliente específico.
- Não crie uma variação/cópia do `AIDrawer` para um caso de uso específico (ex.: um "drawer de
  IA da página do cliente"). Se uma tela precisa do assistente de IA, importe e use `AIDrawer`
  passando `clientId`/`clienteNome`, com um `children` (trigger) ou `onSalvar` customizados
  conforme a necessidade.
- Toda a lógica de execução (ações rápidas, prompt customizado, histórico de respostas) já vive
  dentro do componente e do hook `useAIExecute` (`src/features/ia/hooks/use-ai.ts`) — não
  duplique essa lógica fora dele.
